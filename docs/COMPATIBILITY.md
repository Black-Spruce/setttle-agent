# Host compatibility

There is no universal vendor-specific plugin manifest. The current portable contract is the [Agent Plugins](https://agent-plugins.org/) format, with individual workflows using the [Agent Skills](https://agentskills.io/specification) format:

- root `plugin.json` with the Agent Plugins schema
- optional `skills/<name>/SKILL.md` directories using the Agent Skills format
- optional root `mcp.json` for MCP servers
- client-specific behavior under a client-owned extension namespace

This repository is one plugin package, at the repository root. It keeps the user-facing skills and MCP connection shared, then adds thin native adapters. Workflows are skills, not commands, because Codex and ChatGPT only read skills:

| Surface         | Native entry point           | Extra components in this scaffold                                |
| --------------- | ---------------------------- | ---------------------------------------------------------------- |
| Codex / ChatGPT | `plugin.json` | listing `extensions["com.openai"].interface`; `.codex-plugin/plugin.json` supplies a compatibility overlay |
| Claude          | `.claude-plugin/plugin.json` | directory listing fields (`icon`, support/privacy/terms URLs)    |
| Cursor          | `.cursor-plugin/plugin.json` | rules and inline MCP                                             |

Codex discovers this repository through `.agents/plugins/marketplace.json`. Its `setttle-tools` marketplace exposes the plugin at `./`, relative to the repository root, with installation available and authentication requested on install. The Claude and Cursor catalogs remain separate so each host receives its native marketplace format.

The shared MCP server is `https://api.setttle.ca/mcp`. The portable config declares Streamable HTTP; Claude/Codex’s compatibility config declares native HTTP; Cursor receives its native remote-server mapping in `.cursor-plugin/plugin.json`. All three point at the same endpoint and rely on OAuth discovery rather than committed credentials.

The host references are [OpenAI’s plugin packaging guide](https://developers.openai.com/plugins/build/plugins), [Claude Code’s plugin guide](https://code.claude.com/docs/en/plugins), and [Cursor’s plugin reference](https://docs.cursor.com/reference/plugins).

MCP is the cross-client tool boundary. This package connects to Setttle’s existing public server and keeps authorization at the host boundary. Never commit `sett_` tokens or OAuth credentials.

## Validation matrix

```sh
bun scripts/check-agent-plugin.ts
bun scripts/check-mcp-contract.ts
claude plugin validate --strict ./.claude-plugin/plugin.json
claude plugin validate --strict ./.claude-plugin/marketplace.json
```

CI runs all four on every push and pull request. `scripts/check-agent-plugin.ts` checks the Codex marketplace identity, source, install/authentication policies, and category, and enforces the store rules that host validators don't: OpenAI listing limits and required URLs/assets, parity between the root OpenAI extension and the Codex interface, the Claude directory's license/README/icon rules, skill frontmatter, and no hooks, `bin/`, `commands/`, or `.app.json`. The `claude` commands require Claude Code. Cursor validation is performed by loading the package from `~/.cursor/plugins/local` and checking the plugin components after a window reload.

`scripts/check-mcp-contract.ts` checks every host's part of the package against the vendored MCP contract (below):

- **Tool names.** Skills (read by Claude, Codex/ChatGPT, and Cursor) and Cursor rules may only name contract tools, as backticked snake_case. Every string in the host manifests may only name contract tools, as bare snake_case; this covers the OpenAI review cases' `tools_triggered` lists and expected behavior.
- **Read-only skills.** A skill whose frontmatter carries `metadata` with `setttle-access: read-only` may not name a `write` tool; it describes forbidden changes in words instead.
- **OpenAI's MCP review.** Every contract tool carries `readOnlyHint`, `destructiveHint`, and `openWorldHint`; `access` agrees with `readOnlyHint`; no read tool is destructive; and the OpenAI listing's `capabilities` include `Read` and `Write` exactly when the contract has read and write tools.
- **Neutral descriptions.** Tool titles and descriptions and skill descriptions must not rank Setttle over other sources ("authoritative", "source of truth", and similar), which OpenAI's scan flags.

It warns, without failing, about contract tools no skill names.

## MCP contract

The plugin names tools on Setttle's hosted MCP server, which deploys separately from this package. `contract/mcp-contract.json` is a byte-identical copy of Setttle's generated `packages/mcp-tools/contract/mcp-contract.json`: `contractVersion` 1, then every tool sorted by name with its `name`, `title`, `description`, `access` (`read` or `write`), MCP `annotations`, and `inputSchema`. Do not edit it by hand.

`.github/workflows/sync-mcp-contract.yml` keeps the copy current. Setttle sends a `mcp-contract-changed` repository dispatch when its contract changes on main; the workflow also runs daily and on demand. It reads Setttle's file through the GitHub API with the `SETTTLE_CONTRACT_READ_TOKEN` secret, a fine-grained token with contents read access to `Black-Spruce/setttle`, and skips with a notice when the secret is missing. When the file differs, it force-updates branch `sync/mcp-contract` from main and opens or updates one pull request listing the added, removed, and changed tools and the drift check's result. When the file is unchanged it does nothing. Opening the pull request needs "Allow GitHub Actions to create and approve pull requests" enabled in the repository's Actions settings. Pull requests opened with the workflow token do not start other workflows, so close and reopen the sync pull request to run Validate on it.

## Why the package has multiple manifests

The root `plugin.json` is the portability floor. Its `extensions["com.openai"]` object supplies OpenAI settings and replaces the entire `.codex-plugin/plugin.json` overlay; those settings are not merged. Portable skills and MCP servers come from `skills/` and `mcp.json`. Claude Code has a native manifest location, and Cursor has a richer native format for rules, commands, agents, hooks, and variables. Keeping those adapters in the same package gives each host its expected entry point without turning this into a developer workflow plugin or duplicating the user-facing skill.

## Releasing

Every push to main reaches the Claude directory through its webhook, so main must only name tools the deployed server has. OpenAI does not pick up pushes; it needs a new ZIP upload. Release a change that depends on new MCP tools in this order:

1. Deploy the Setttle API with the new tools.
2. Merge the `sync/mcp-contract` pull request. Merging it does not release the plugin.
3. Merge the skill changes that use the new tools. The drift check fails on them until the contract has the tools, which is the release gate.
4. Raise the version with `bun scripts/bump-version.ts <major|minor|patch|x.y.z>`, then upload a new ZIP to the OpenAI submission.

Raise `version` in `plugin.json`, all three native manifests, and the Claude and Cursor marketplace entries together; the check fails if they differ. `bun scripts/bump-version.ts` does this in one step: it takes `major`, `minor`, `patch`, or an exact version, refuses to write anything if the files already disagree, and keeps each file's formatting. The Codex catalog reads the version from the plugin manifest.

Codex users add this Git repository with `codex plugin marketplace add Black-Spruce/setttle-agent` and install with `codex plugin add setttle-agent@setttle-tools`, or use the desktop plugin browser after adding the marketplace. Refresh the catalog with `codex plugin marketplace upgrade setttle-tools` when new changes are published.

Repository marketplace distribution is separate from OpenAI's reviewed public directory. OpenAI plugin and MCP approval are still pending. Changes to listing metadata or skills require a new ZIP upload to the existing OpenAI submission; pushing this repository does not update that submission. Keep plugin releases in step with the MCP server's tools and behavior, which deploy separately.

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

The shared MCP server is `https://api.setttle.ca/mcp`. The portable config declares Streamable HTTP; Claude/Codex’s compatibility config declares native HTTP; Cursor receives its native remote-server mapping in `.cursor-plugin/plugin.json`. All three point at the same endpoint and rely on OAuth discovery rather than committed credentials.

The host references are [OpenAI’s plugin packaging guide](https://developers.openai.com/plugins/build/plugins), [Claude Code’s plugin guide](https://code.claude.com/docs/en/plugins), and [Cursor’s plugin reference](https://docs.cursor.com/reference/plugins).

MCP is the cross-client tool boundary. This package connects to Setttle’s existing public server and keeps authorization at the host boundary. Never commit `sett_` tokens or OAuth credentials.

## Validation matrix

```sh
bun scripts/check-agent-plugin.ts
claude plugin validate --strict ./.claude-plugin/plugin.json
claude plugin validate --strict ./.claude-plugin/marketplace.json
```

CI runs all three on every push and pull request. `scripts/check-agent-plugin.ts` enforces the store rules that host validators don't: OpenAI listing limits and required URLs/assets, parity between the root OpenAI extension and the Codex interface, the Claude directory's license/README/icon rules, skill frontmatter, and no hooks, `bin/`, `commands/`, or `.app.json`. The `claude` commands require Claude Code. Cursor validation is performed by loading the package from `~/.cursor/plugins/local` and checking the plugin components after a window reload.

## Why the package has multiple manifests

The root `plugin.json` is the portability floor. Its `extensions["com.openai"]` object supplies OpenAI settings and replaces the entire `.codex-plugin/plugin.json` overlay; those settings are not merged. Portable skills and MCP servers come from `skills/` and `mcp.json`. Claude Code has a native manifest location, and Cursor has a richer native format for rules, commands, agents, hooks, and variables. Keeping those adapters in the same package gives each host its expected entry point without turning this into a developer workflow plugin or duplicating the user-facing skill.

## Releasing

Raise `version` in `plugin.json`, all three native manifests, and both marketplace entries together; the check fails if they differ. The Claude directory and OpenAI pick up a new version from this repository independently of Setttle API deploys, so keep the skills in step with the MCP server's tools and behavior.

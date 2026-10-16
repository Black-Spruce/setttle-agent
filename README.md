# Setttle Agent

Setttle Agent connects your AI assistant to your Setttle books. It helps you review company books, reconcile bank activity, prepare financial reports, and record bookkeeping changes after you confirm them. It works with ChatGPT and Codex, Claude, and Cursor.

## What it includes

- **Skills**: `setttle-bookkeeping` sets how the assistant handles your books. `review-books`, `reconcile-bank`, `record-transaction`, and `prepare-report` cover the common workflows.
- **MCP server**: one remote server at `https://api.setttle.ca/mcp` over Streamable HTTP.
- **Cursor rule**: `rules/setttle-bookkeeping.mdc` carries the same guidance for Cursor.

## What it connects to and sends

The plugin runs no local code. It connects only to `https://api.setttle.ca/mcp`. You sign in through your assistant's OAuth flow, where you choose read-only access or permission to make changes. The plugin stores no credentials. Advanced users can use a `sett_` API token instead.

The assistant sends Setttle the tool requests needed to answer you, such as listing journal entries or posting a confirmed entry. Recording a payment writes a ledger entry only; Setttle never moves money. See the [privacy policy](https://setttle.ca/legal/privacy) and [terms](https://setttle.ca/legal/terms).

## Install

Claude Code:

```sh
claude plugin marketplace add Black-Spruce/setttle-agent
claude plugin install setttle-agent@setttle-tools
```

Then invoke `/setttle-agent:review-books`, `/setttle-agent:reconcile-bank`, `/setttle-agent:record-transaction`, or `/setttle-agent:prepare-report`, and sign in to Setttle when your assistant asks.

Cursor loads a local plugin from `~/.cursor/plugins/local/setttle-agent`. Copy this repository there, reload the window, and confirm the skills, rule, and MCP server appear.

## Package layout

- Portable Agent Plugins: `plugin.json` (with OpenAI listing metadata under `extensions["com.openai"].interface`), `skills/`, `mcp.json`
- Codex / ChatGPT: `.codex-plugin/plugin.json`, `.mcp.json`
- Claude: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.mcp.json`
- Cursor: `.cursor-plugin/plugin.json`, `.cursor-plugin/marketplace.json`, `rules/`

`scripts/` and `.github/` hold the repository's own checks. The plugin never runs them. See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for how each host reads the package.

## Development

Try local changes in Claude Code with `claude --plugin-dir .`. Before pushing, run:

```sh
bun scripts/check-agent-plugin.ts
claude plugin validate --strict ./.claude-plugin/plugin.json
```

## Support

Get help at [setttle.ca/contact](https://setttle.ca/contact). Setup details for every assistant are at [setttle.ca/agents](https://setttle.ca/agents).

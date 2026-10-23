/**
 * MCP contract drift check.
 *
 * The plugin's skills, rules, manifests, and OpenAI test cases name tools on
 * Setttle's hosted MCP server, which deploys separately from this package.
 * This check compares them with the vendored contract in
 * `contract/mcp-contract.json`, which `.github/workflows/sync-mcp-contract.yml`
 * keeps in step with Setttle. Every host reads a different part of the
 * package, so each is checked:
 *
 * - Claude, Codex/ChatGPT, and Cursor skills (`skills/`) and Cursor rules
 *   (`rules/`) may only name contract tools, as backticked snake_case.
 * - Every string in the host manifests, including the OpenAI review cases'
 *   `tools_triggered` lists, may only name contract tools, as bare snake_case.
 * - A skill marked read-only may not name a `write` tool. A skill is
 *   read-only when its frontmatter has `metadata` with
 *   `setttle-access: read-only`; it describes forbidden changes in words.
 * - OpenAI's MCP review: every tool carries the read-only, destructive, and
 *   open-world hints, no `write` tool is marked read-only, no read-only tool
 *   is destructive, and the listing's `capabilities` match the contract.
 * - Tool and skill descriptions must not rank Setttle over other sources.
 *
 * Contract tools that no skill names are a warning, not a failure.
 *
 * Usage:
 *   bun scripts/check-mcp-contract.ts
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CONTRACT = "contract/mcp-contract.json";
const MANIFESTS = [
  "plugin.json",
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".agents/plugins/marketplace.json",
  ".claude-plugin/marketplace.json",
  ".cursor-plugin/marketplace.json",
];
/** snake_case with at least one underscore, e.g. get_trial_balance. */
const TOOL = String.raw`[a-z][a-z0-9]*(?:_[a-z0-9]+)+`;
const BACKTICKED_TOOL = new RegExp("`(" + TOOL + ")`", "gu");
const BARE_TOOL = new RegExp(String.raw`\b(` + TOOL + String.raw`)\b`, "gu");
const READ_ONLY_SKILL = /^metadata:\s*\n(?:[ \t]+.*\n)*?[ \t]+setttle-access:\s*["']?read-only["']?\s*$/mu;
/** Claims OpenAI's scan treats as ranking Setttle over other sources. */
const RANKING =
  /\b(?:authoritative|source of truth|definitive|superior|most (?:accurate|reliable)|(?:more accurate|better) than|the best|only (?:reliable|trusted|accurate) source)\b|#1/iu;
const HINTS = ["readOnlyHint", "destructiveHint", "openWorldHint"] as const;

type Access = "read" | "write";
interface ContractTool {
  name: string;
  title?: string;
  description: string;
  access: Access;
  annotations?: Partial<Record<(typeof HINTS)[number], boolean>>;
}

const errors: string[] = [];
const warnings: string[] = [];
const readJson = (path: string) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

const contract = readJson(CONTRACT) as { contractVersion: number; tools: ContractTool[] };
if (contract.contractVersion !== 1) {
  errors.push(`${CONTRACT}: unsupported contractVersion ${contract.contractVersion}`);
}
const access = new Map(contract.tools.map((tool) => [tool.name, tool.access]));

/** Every tool name the package mentions, with where it was found. */
const mentions: { name: string; where: string }[] = [];
const skillMentions = new Set<string>();
const matches = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((m) => m[1]);

// Skills, shared by every host.
for (const dir of readdirSync(join(ROOT, "skills"))) {
  const file = `skills/${dir}/SKILL.md`;
  if (!existsSync(join(ROOT, file))) continue;
  const text = readFileSync(join(ROOT, file), "utf8");
  const frontmatter = text.match(/^---\n([\s\S]*?\n)---/u)?.[1] ?? "";
  const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1] ?? "";
  if (RANKING.test(description)) errors.push(`${file}: description ranks Setttle over other sources`);
  const readOnly = READ_ONLY_SKILL.test(frontmatter);
  for (const name of matches(text, BACKTICKED_TOOL)) {
    mentions.push({ name, where: file });
    skillMentions.add(name);
    if (readOnly && access.get(name) === "write") {
      errors.push(`${file}: read-only skill names write tool ${name}`);
    }
  }
}

// Cursor rules.
for (const entry of readdirSync(join(ROOT, "rules"))) {
  const file = `rules/${entry}`;
  for (const name of matches(readFileSync(join(ROOT, file), "utf8"), BACKTICKED_TOOL)) {
    mentions.push({ name, where: file });
  }
}

// Manifest strings: listings, release notes, and the OpenAI review cases,
// whose `tools_triggered` items each start with a tool name
// ("post_journal_entry only after separate explicit confirmation").
const strings = (value: unknown, path: string): [string, string][] => {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => strings(item, path ? `${path}.${key}` : key));
  }
  return [];
};
for (const file of MANIFESTS) {
  for (const [path, text] of strings(readJson(file), "")) {
    for (const name of matches(text, BARE_TOOL)) mentions.push({ name, where: `${file} ${path}` });
  }
}

// Names the contract lacks, grouped so each is reported once.
const missing = new Map<string, Set<string>>();
for (const { name, where } of mentions) {
  if (access.has(name)) continue;
  if (!missing.has(name)) missing.set(name, new Set());
  missing.get(name)!.add(where);
}
for (const [name, places] of [...missing].sort(([a], [b]) => a.localeCompare(b))) {
  errors.push(`${name} is not in ${CONTRACT} (named in ${[...places].join(", ")})`);
}

// OpenAI's MCP review reads each tool's hints and description.
for (const tool of contract.tools) {
  const hints = tool.annotations ?? {};
  const absent = HINTS.filter((hint) => typeof hints[hint] !== "boolean");
  if (absent.length > 0) errors.push(`${CONTRACT}: ${tool.name} lacks ${absent.join(", ")}`);
  // `access` is the consent tier, so a read tool may still change state
  // (use_entity switches company); a write tool is never read-only.
  if (tool.access === "write" && hints.readOnlyHint === true) {
    errors.push(`${CONTRACT}: write tool ${tool.name} is marked read-only`);
  }
  if (hints.readOnlyHint === true && hints.destructiveHint === true) {
    errors.push(`${CONTRACT}: read-only tool ${tool.name} is marked destructive`);
  }
  if (RANKING.test(`${tool.title ?? ""} ${tool.description}`)) {
    errors.push(`${CONTRACT}: ${tool.name} ranks Setttle over other sources`);
  }
}

// The OpenAI listing declares Read and Write capabilities; they must match
// what the server offers. The Codex interface must equal it (check-agent-plugin).
const capabilities: unknown = readJson("plugin.json").extensions?.["com.openai"]?.interface?.capabilities;
const declared = new Set(Array.isArray(capabilities) ? capabilities : []);
for (const [capability, kind] of [["Read", "read"], ["Write", "write"]] as const) {
  const offered = contract.tools.some((tool) => tool.access === kind);
  if (offered !== declared.has(capability)) {
    errors.push(
      offered
        ? `OpenAI capabilities must include ${capability}: the contract has ${kind} tools`
        : `OpenAI capabilities list ${capability}, but the contract has no ${kind} tools`,
    );
  }
}

const unmentioned = [...access.keys()].filter((name) => !skillMentions.has(name)).sort();
if (unmentioned.length > 0) {
  warnings.push(`${unmentioned.length} contract tools are not named by any skill: ${unmentioned.join(", ")}`);
}

for (const warning of warnings) console.warn(`! ${warning}`);
if (errors.length > 0) {
  console.error(errors.map((error) => `✗ ${error}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${mentions.length} tool mentions match ${access.size} contract tools`);

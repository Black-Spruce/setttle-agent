/**
 * MCP contract drift check.
 *
 * The plugin's skills, rules, and OpenAI test cases name tools on Setttle's
 * hosted MCP server, which deploys separately from this package. This check
 * compares every tool name they use with the vendored contract in
 * `contract/mcp-contract.json`, which `.github/workflows/sync-mcp-contract.yml`
 * keeps in step with Setttle.
 *
 * - Fails when a skill, rule, or test case names a tool the contract lacks.
 * - Fails when a skill marked read-only names a `write` tool.
 * - Warns, without failing, for contract tools that no skill names.
 *
 * Tool names are backticked snake_case in Markdown, or the comma-separated
 * `tools_triggered` lists in the OpenAI review cases. A skill is read-only
 * when its frontmatter has `metadata` with `setttle-access: read-only`; such a
 * skill describes forbidden changes in words rather than naming write tools.
 *
 * Usage:
 *   bun scripts/check-mcp-contract.ts
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const CONTRACT = "contract/mcp-contract.json";
/** Backticked snake_case with at least one underscore, e.g. `get_trial_balance`. */
const BACKTICKED_TOOL = /`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/gu;
const READ_ONLY_SKILL = /^metadata:\s*\n(?:[ \t]+.*\n)*?[ \t]+setttle-access:\s*["']?read-only["']?\s*$/mu;

type Access = "read" | "write";
interface ContractTool {
  name: string;
  access: Access;
}

const errors: string[] = [];
const warnings: string[] = [];

const contract = JSON.parse(readFileSync(join(ROOT, CONTRACT), "utf8")) as {
  contractVersion: number;
  tools: ContractTool[];
};
if (contract.contractVersion !== 1) {
  errors.push(`${CONTRACT}: unsupported contractVersion ${contract.contractVersion}`);
}
const access = new Map(contract.tools.map((tool) => [tool.name, tool.access]));

/** Every tool name a file or case mentions, with where it was found. */
const mentions: { name: string; where: string }[] = [];
const skillMentions = new Set<string>();

const backticked = (text: string) => [...text.matchAll(BACKTICKED_TOOL)].map((m) => m[1]);

// Skills.
for (const dir of readdirSync(join(ROOT, "skills"))) {
  const file = `skills/${dir}/SKILL.md`;
  if (!existsSync(join(ROOT, file))) continue;
  const text = readFileSync(join(ROOT, file), "utf8");
  const frontmatter = text.match(/^---\n([\s\S]*?\n)---/u)?.[1] ?? "";
  const readOnly = READ_ONLY_SKILL.test(frontmatter);
  for (const name of backticked(text)) {
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
  for (const name of backticked(readFileSync(join(ROOT, file), "utf8"))) {
    mentions.push({ name, where: file });
  }
}

// OpenAI review cases, in both manifests that carry them.
for (const file of ["plugin.json", ".codex-plugin/plugin.json"]) {
  const manifest = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
  const cases = manifest.extensions?.["com.openai"]?.review?.test_cases ?? {};
  for (const [kind, entries] of Object.entries(cases)) {
    for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
      const where = `${file} ${kind} case ${index + 1}`;
      // Each item starts with a tool name; trailing words qualify it
      // ("post_journal_entry only after separate explicit confirmation").
      for (const item of String(entry.tools_triggered ?? "").split(",")) {
        const name = item.trim().match(/^[a-z][a-z0-9_]*/u)?.[0];
        if (name) mentions.push({ name, where });
      }
      for (const field of ["prompt", "description", "expected_behavior"]) {
        for (const name of backticked(String(entry[field] ?? ""))) mentions.push({ name, where });
      }
    }
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

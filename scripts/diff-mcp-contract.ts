/**
 * Summarize the difference between two MCP contract snapshots as Markdown,
 * for the body of the sync pull request.
 *
 * Usage:
 *   bun scripts/diff-mcp-contract.ts <old contract> <new contract>
 */

import { readFileSync } from "node:fs";

type Tool = Record<string, unknown> & { name: string };
const FIELDS = ["title", "description", "access", "annotations", "inputSchema"] as const;

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error("usage: bun scripts/diff-mcp-contract.ts <old> <new>");
  process.exit(2);
}

const load = (path: string) => {
  const contract = JSON.parse(readFileSync(path, "utf8"));
  if (contract.contractVersion !== 1 || !Array.isArray(contract.tools)) {
    throw new Error(`${path} is not a version 1 MCP contract`);
  }
  return new Map((contract.tools as Tool[]).map((tool) => [tool.name, tool]));
};

const before = load(oldPath);
const after = load(newPath);

const added = [...after.keys()].filter((name) => !before.has(name)).sort();
const removed = [...before.keys()].filter((name) => !after.has(name)).sort();
const changed = [...after.keys()]
  .filter((name) => before.has(name))
  .sort()
  .flatMap((name) => {
    const fields = FIELDS.filter(
      (field) =>
        JSON.stringify(before.get(name)![field]) !== JSON.stringify(after.get(name)![field]),
    );
    return fields.length > 0 ? [`\`${name}\` (${fields.join(", ")})`] : [];
  });

const access = (name: string) => String(after.get(name)?.access ?? before.get(name)?.access);
const list = (label: string, items: string[]) =>
  items.length === 0 ? `**${label}:** none` : `**${label}:**\n${items.map((item) => `- ${item}`).join("\n")}`;

console.log(
  [
    list("Added", added.map((name) => `\`${name}\` (${access(name)})`)),
    list("Removed", removed.map((name) => `\`${name}\` (${access(name)})`)),
    list("Changed", changed),
  ].join("\n\n"),
);

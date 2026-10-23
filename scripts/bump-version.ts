/**
 * Raise the plugin version in every manifest and marketplace entry at once.
 *
 * `check-agent-plugin.ts` fails when these differ, so a release edits all of
 * them together. The Codex marketplace has no version; Codex reads it from
 * the plugin manifest. Each file's one `"version"` value is replaced in place,
 * keeping its formatting. Releasing is still deliberate: see
 * docs/COMPATIBILITY.md "Releasing" for the order, and upload a new ZIP to
 * OpenAI afterwards.
 *
 * Usage:
 *   bun scripts/bump-version.ts <major|minor|patch|x.y.z>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const FILES = [
  "plugin.json",
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".cursor-plugin/marketplace.json",
];
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/u;
const VERSION = /("version"\s*:\s*)"([^"]*)"/gu;

const fail = (message: string): never => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const target = process.argv[2];
if (!target) fail("usage: bun scripts/bump-version.ts <major|minor|patch|x.y.z>");

const current: string = JSON.parse(readFileSync(join(ROOT, "plugin.json"), "utf8")).version;
const [, major, minor, patch] = (current.match(SEMVER) ?? fail(`plugin.json version ${current} is not semver`)).map(
  Number,
);
const next =
  target === "major" ? `${major + 1}.0.0`
  : target === "minor" ? `${major}.${minor + 1}.0`
  : target === "patch" ? `${major}.${minor}.${patch + 1}`
  : target;
if (!SEMVER.test(next)) fail(`${next} is not a semver version`);
if (next === current) fail(`version is already ${current}`);

// Read and check every file before writing any, so a mismatch changes nothing.
const updates = FILES.map((file) => {
  const text = readFileSync(join(ROOT, file), "utf8");
  const found = [...text.matchAll(VERSION)];
  if (found.length !== 1) fail(`${file}: expected one "version", found ${found.length}`);
  if (found[0][2] !== current) fail(`${file}: version ${found[0][2]} differs from plugin.json ${current}`);
  return { file, text: text.replace(VERSION, `$1"${next}"`) };
});
for (const { file, text } of updates) writeFileSync(join(ROOT, file), text);

console.log(`✓ ${current} → ${next} in ${FILES.join(", ")}`);
console.log("Run bun scripts/check-agent-plugin.ts, then follow docs/COMPATIBILITY.md \"Releasing\".");

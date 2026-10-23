/**
 * Build the ZIP uploaded to the OpenAI plugin submission.
 *
 * OpenAI does not read this repository; each release is a new upload that
 * goes through review. The ZIP holds only what the OpenAI package reads, from
 * the committed HEAD, so uncommitted edits never reach a submission.
 *
 * Usage:
 *   bun scripts/build-openai-zip.ts
 */

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PATHS = ["plugin.json", ".codex-plugin", "mcp.json", ".mcp.json", "skills", "assets", "README.md", "LICENSE"];

const run = (args: string[]) => {
  const result = Bun.spawnSync(args, { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    console.error(`✗ ${args.join(" ")}\n${result.stderr.toString()}`);
    process.exit(1);
  }
  return result.stdout.toString();
};

const dirty = run(["git", "status", "--porcelain", "--", ...PATHS]).trim();
if (dirty) {
  console.error(`✗ commit these first; the ZIP is built from HEAD:\n${dirty}`);
  process.exit(1);
}

const check = Bun.spawnSync(["bun", "scripts/check-agent-plugin.ts"], { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
if (check.exitCode !== 0) process.exit(1);

const version: string = JSON.parse(readFileSync(join(ROOT, "plugin.json"), "utf8")).version;
const out = join("dist", `setttle-agent-${version}-openai.zip`);
mkdirSync(join(ROOT, "dist"), { recursive: true });
run(["git", "archive", "--format=zip", "-o", out, "HEAD", "--", ...PATHS]);

const commit = run(["git", "rev-parse", "--short", "HEAD"]).trim();
console.log(`✓ ${out} (version ${version}, commit ${commit})`);

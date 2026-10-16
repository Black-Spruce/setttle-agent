/**
 * Agent plugin guard.
 *
 * Checks this plugin against the rules each host enforces at
 * submission time, so a listing problem fails here instead of in a store
 * portal: the Agent Plugins 1.0.0 portable manifest, OpenAI's listing limits
 * (developers.openai.com/plugins/deploy/submission), and the Claude
 * directory's pre-submission checklist (claude.com/docs/plugins/
 * pre-submission-checklist). `claude plugin validate --strict` remains the
 * authoritative Claude Code schema check.
 *
 * The plugin lives at the repository root, so everything committed here ships
 * to the people who install it.
 *
 * Usage:
 *   bun scripts/check-agent-plugin.ts
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const PLUGIN = ROOT;
const NAME = "setttle-agent";
const MCP_URL = "https://api.setttle.ca/mcp";
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const IMAGE = /\.(?:png|jpe?g|gif|webp|svg)$/iu;

const errors: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok) errors.push(message);
};

type Json = Record<string, any>;
const readJson = (path: string): Json => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

const portable = readJson("plugin.json");
const portableMcp = readJson("mcp.json");
const nativeMcp = readJson(".mcp.json");
const codex = readJson(".codex-plugin/plugin.json");
const claude = readJson(".claude-plugin/plugin.json");
const cursor = readJson(".cursor-plugin/plugin.json");
const claudeMarket = readJson(".claude-plugin/marketplace.json");
const cursorMarket = readJson(".cursor-plugin/marketplace.json");

/** Whether a plugin-relative `./` path exists inside the plugin. */
const pluginPathExists = (path: unknown) =>
  typeof path === "string" && path.startsWith("./") && existsSync(join(PLUGIN, path));

/** Width and height of a PNG from its IHDR chunk, or null for other files. */
function pngSize(path: string): { width: number; height: number } | null {
  const bytes = readFileSync(join(PLUGIN, path));
  if (bytes.toString("latin1", 1, 4) !== "PNG") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const isHttpsUrl = (value: unknown) =>
  typeof value === "string" && value.length <= 1024 && /^https:\/\/\S+$/u.test(value);

// Portable Agent Plugins 1.0.0 manifest and MCP config.
const PORTABLE_FIELDS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
for (const field of Object.keys(portable)) {
  check(PORTABLE_FIELDS.has(field), `plugin.json: unknown Agent Plugins field "${field}"`);
}
check(
  portable.$schema === "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "plugin.json must target Agent Plugins 1.0.0",
);
check(
  portableMcp.$schema === "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcp.json must target Agent Plugins 1.0.0",
);
check(
  portableMcp.mcpServers?.setttle?.type === "streamable-http" &&
    portableMcp.mcpServers.setttle.url === MCP_URL,
  "mcp.json must declare the Setttle Streamable HTTP server",
);
check(
  nativeMcp.mcpServers?.setttle?.type === "http" && nativeMcp.mcpServers.setttle.url === MCP_URL,
  ".mcp.json must declare the Setttle HTTP server",
);
for (const [file, config] of [
  ["mcp.json", portableMcp],
  [".mcp.json", nativeMcp],
] as const) {
  // OpenAI connects one MCP server per plugin.
  check(Object.keys(config.mcpServers ?? {}).length === 1, `${file}: declare exactly one server`);
}

// Identity is the same everywhere a host reads it.
const manifests = { portable, codex, claude, cursor };
for (const [surface, manifest] of Object.entries(manifests)) {
  check(manifest.name === NAME, `${surface} manifest has the wrong name`);
  check(manifest.version === portable.version, `${surface} manifest version differs`);
}
check(SEMVER.test(portable.version ?? ""), "version must be semver");
for (const [market, entry] of [
  ["claude marketplace", claudeMarket.plugins?.find((p: Json) => p.name === NAME)],
  ["cursor marketplace", cursorMarket.plugins?.find((p: Json) => p.name === NAME)],
] as const) {
  check(entry?.version === portable.version, `${market} entry version differs`);
  check(entry?.source === "./", `${market} entry must use the repository root as its source`);
}

// OpenAI listing: the root extension and the Codex interface must agree,
// because the root extension can replace the Codex manifest.
const openai = portable.extensions?.["com.openai"];
check(
  JSON.stringify(openai) === JSON.stringify(codex.interface),
  'plugin.json extensions["com.openai"] must equal .codex-plugin interface',
);
for (const [field, max] of [
  ["displayName", 30],
  ["shortDescription", 30],
  ["longDescription", 4000],
  ["developerName", 80],
] as const) {
  const value = codex.interface?.[field];
  check(
    typeof value === "string" && value.length > 0 && value.length <= max,
    `OpenAI ${field} must be 1–${max} characters`,
  );
}
check(typeof codex.interface?.category === "string", "OpenAI category is required");
check((codex.author?.name ?? "").length <= 120, "OpenAI author.name must be ≤ 120 characters");
for (const field of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
  check(isHttpsUrl(codex.interface?.[field]), `OpenAI ${field} must be an https URL`);
}
const prompts = codex.interface?.defaultPrompt;
check(
  Array.isArray(prompts) &&
    prompts.length <= 3 &&
    prompts.every((p: unknown) => typeof p === "string" && p.length <= 128),
  "OpenAI defaultPrompt must be an array of ≤ 3 prompts of ≤ 128 characters",
);
for (const field of ["logo", "composerIcon"]) {
  const path = codex.interface?.[field];
  check(pluginPathExists(path), `OpenAI ${field} must point at a file in the plugin`);
  if (pluginPathExists(path)) {
    const size = pngSize(path);
    check(
      size && size.width === size.height && size.width >= 48,
      `OpenAI ${field} must be a square PNG of at least 48×48`,
    );
  }
}
check(pluginPathExists(codex.skills), ".codex-plugin skills path must exist");
check(codex.mcpServers === "./.mcp.json", ".codex-plugin must use .mcp.json");

// Claude directory listing.
check(pluginPathExists(claude.icon), "Claude icon must point at a file in the plugin");
for (const field of ["documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"]) {
  check(isHttpsUrl(claude[field]), `Claude ${field} must be an https URL`);
}
check(
  claude.license || existsSync(join(PLUGIN, "LICENSE")),
  "Claude requires a LICENSE file or license field",
);
const readme = readFileSync(join(PLUGIN, "README.md"), "utf8").replace(/```[\s\S]*?```/gu, "");
check(readme.split(/\s+/u).filter(Boolean).length >= 40, "README must have at least 40 words");

// Cursor.
check(
  cursor.skills === "./skills" && cursor.rules === "./rules",
  "Cursor manifest paths must point at the package component directories",
);
check(cursor.mcpServers?.setttle?.url === MCP_URL, "Cursor manifest must expose the MCP endpoint");
check(pluginPathExists(cursor.logo), "Cursor logo must point at a file in the plugin");

// Components no store accepts in a public listing, plus file limits.
for (const banned of ["hooks", "bin", ".app.json", "commands"]) {
  check(!existsSync(join(PLUGIN, banned)), `remove ${banned} from the plugin`);
}
const files: string[] = [];
const walk = (dir: string) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path.slice(PLUGIN.length + 1));
  }
};
walk(PLUGIN);
check(files.length <= 512, "plugin must have 512 files or fewer");
for (const file of files) {
  check(
    !/(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|__MACOSX)$/u.test(file),
    `remove system file ${file}`,
  );
  check(
    IMAGE.test(file) || statSync(join(PLUGIN, file)).size < 256 * 1024,
    `${file} must be under 256 KiB`,
  );
}

// Agent Skills: name matches its folder, description is present and bounded.
for (const dir of readdirSync(join(PLUGIN, "skills"))) {
  const path = join(PLUGIN, "skills", dir, "SKILL.md");
  if (!existsSync(path)) {
    errors.push(`skills/${dir} is missing SKILL.md`);
    continue;
  }
  const frontmatter = readFileSync(path, "utf8").match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
  const name = frontmatter.match(/^name:\s*(.+)$/mu)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1]?.trim() ?? "";
  check(
    name === dir && SKILL_NAME.test(dir) && dir.length <= 64,
    `skills/${dir}: name must match its folder`,
  );
  check(
    description.length > 0 && description.length <= 1024,
    `skills/${dir}: description must be 1–1024 characters`,
  );
}

if (errors.length > 0) {
  console.error(errors.map((error) => `✗ ${error}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${NAME} manifests and components are valid`);

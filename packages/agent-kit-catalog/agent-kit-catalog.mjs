#!/usr/bin/env node
// @falkenslab/agent-kit-catalog: a Claude Code marketplace's extensions as one file, catalog.json — each
// one's name, version, description, topics, category, author, links, install commands, capabilities, requirements and images
// (as raw.githubusercontent.com URLs) — from .claude-plugin/marketplace.json and each extension's
// plugin.json. A page or a client shows the marketplace from it without cloning the repository.
// No dependencies: it runs with npx in any CI.
//
//   npx @falkenslab/agent-kit-catalog [folder]           writes <folder>/catalog.json (folder: the current one)
//   npx @falkenslab/agent-kit-catalog [folder] --check   fails when catalog.json isn't what it would write
//   --repo owner/name   the GitHub repository its links point to; else GITHUB_REPOSITORY (GitHub Actions),
//                       else the origin remote, else the `repository` every plugin.json names
//   --branch name       the branch its links point to; main by default (never the one checked out, so the
//                       file reads the same on every branch and --check passes on pull requests)
//
// The format is agent-kit's contract (schemas/marketplace-catalog.schema.json and agent-kit-metadata.schema.json in
// @falkenslab/agent-kit): what it writes fits the first, and an extension's metadata["agent-kit"] must
// fit the second, or it stops saying what doesn't.
import { execFileSync } from "node:child_process";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE = /\.(svg|png|jpe?g|webp)$/i;
const GITHUB = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/;
const LANGUAGES = new Set(["en", "es", "fr", "de"]);
const KIT_RANGE = /^\s*(?:(?:>=|<=|>|<|=)?\s*v?\d+(?:\.\d+){0,2})(?:\s+(?:>=|<=|>|<|=)?\s*v?\d+(?:\.\d+){0,2})*\s*$/;

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const isStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);

/** What's wrong with an extension's metadata["agent-kit"], as agent-kit-metadata.schema.json says. */
export function metadataProblems(kit) {
  if (kit === undefined) return [];
  if (!kit || typeof kit !== "object" || Array.isArray(kit)) return ['metadata["agent-kit"] isn\'t an object'];
  const problems = [];
  const known = new Set(["kit", "provides", "requires", "capabilities", "requirements", "readOnlyTools", "labels", "help", "catalog"]);
  for (const key of Object.keys(kit)) if (!known.has(key)) problems.push(`metadata["agent-kit"] has an unknown field, ${key}`);
  if (kit.kit !== undefined && (typeof kit.kit !== "string" || !KIT_RANGE.test(kit.kit))) problems.push(`its kit range isn't comparators like ">=0.22.0": ${JSON.stringify(kit.kit)}`);
  for (const key of ["provides", "requires", "readOnlyTools"]) if (kit[key] !== undefined && !isStrings(kit[key])) problems.push(`its ${key} isn't a list of names`);
  if (kit.requirements !== undefined) {
    if (!Array.isArray(kit.requirements)) problems.push("its requirements aren't a list");
    else
      for (const requirement of kit.requirements) {
        const program = requirement?.program;
        if (typeof program !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._+-]*$/.test(program)) {
          problems.push(`a requirement's program isn't a bare name found on the PATH: ${JSON.stringify(program)}`);
          continue;
        }
        if (Object.keys(requirement).some((key) => !["name", "program", "version", "install", "for"].includes(key))) problems.push(`its requirement ${program} has an unknown field`);
        if (typeof requirement.name !== "string" || !requirement.name) problems.push(`its requirement ${program} has no name`);
        const version = requirement.version;
        if (version !== undefined) {
          if (!version || typeof version !== "object" || Object.keys(version).some((key) => key !== "args" && key !== "min")) problems.push(`its requirement ${program}'s version isn't { args, min }`);
          else {
            if (!Array.isArray(version.args) || !version.args.every((arg) => typeof arg === "string" && /^(--?[A-Za-z][A-Za-z0-9-]*|version)$/.test(arg))) problems.push(`its requirement ${program} checks its version with something other than options (--version, -v) or version`);
            if (typeof version.min !== "string" || !/^\d+(\.\d+){0,2}$/.test(version.min)) problems.push(`its requirement ${program}'s min isn't a version like 24.0.0`);
          }
        }
        const install = requirement.install;
        if (!install || typeof install !== "object" || Array.isArray(install) || !Object.keys(install).length) problems.push(`its requirement ${program} doesn't say how to install it`);
        else
          for (const [key, value] of Object.entries(install)) {
            if (!["windows", "macos", "linux", "url"].includes(key)) problems.push(`its requirement ${program}'s install has an unknown system, ${key}`);
            else if (typeof value !== "string" || !value || (key === "url" && !/^https?:\/\//.test(value))) problems.push(`its requirement ${program}'s ${key} install isn't ${key === "url" ? "a link" : "a command"}`);
          }
        if (requirement.for !== undefined && !isStrings(requirement.for)) problems.push(`its requirement ${program}'s for isn't a list of capabilities`);
        else
          for (const id of requirement.for ?? [])
            if (![...(isStrings(kit.provides) ? kit.provides : []), ...(Array.isArray(kit.capabilities) ? kit.capabilities.map((capability) => capability?.id) : [])].includes(id)) problems.push(`its requirement ${program} is for ${id}, a capability it doesn't provide`);
      }
  }
  if (kit.help !== undefined && typeof kit.help !== "string") problems.push("its help isn't text");
  if (kit.capabilities !== undefined) {
    if (!Array.isArray(kit.capabilities)) problems.push("its capabilities aren't a list");
    else {
      const ids = new Set();
      for (const capability of kit.capabilities) {
        const id = capability?.id;
        if (typeof id !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
          problems.push(`a capability's id isn't kebab-case: ${JSON.stringify(id)}`);
          continue;
        }
        if (ids.has(id)) problems.push(`its capability ${id} is declared twice`);
        ids.add(id);
        if (Object.keys(capability).some((key) => !["id", "skills", "tools", "texts"].includes(key))) problems.push(`its capability ${id} has an unknown field`);
        for (const key of ["skills", "tools"]) if (capability[key] !== undefined && !isStrings(capability[key])) problems.push(`its capability ${id}'s ${key} isn't a list of names`);
        const texts = capability.texts;
        if (!texts || typeof texts !== "object" || Array.isArray(texts) || !Object.keys(texts).length) problems.push(`its capability ${id} has no texts`);
        else
          for (const [language, text] of Object.entries(texts)) {
            if (!LANGUAGES.has(language)) problems.push(`its capability ${id} has a language agent-kit doesn't speak, ${language}`);
            if (!text || typeof text.label !== "string" || !text.label) problems.push(`its capability ${id} has no ${language} label`);
            if (text && Object.keys(text).some((key) => key !== "label" && key !== "description")) problems.push(`its capability ${id}'s ${language} text has an unknown field`);
            if (text?.description !== undefined && typeof text.description !== "string") problems.push(`its capability ${id}'s ${language} description isn't text`);
          }
      }
    }
  }
  if (kit.labels !== undefined) {
    if (!kit.labels || typeof kit.labels !== "object" || Array.isArray(kit.labels)) problems.push("its labels aren't an object");
    else
      for (const [tool, byLanguage] of Object.entries(kit.labels)) {
        if (!byLanguage || typeof byLanguage !== "object") {
          problems.push(`its labels for ${tool} aren't an object`);
          continue;
        }
        for (const [language, label] of Object.entries(byLanguage)) {
          if (!LANGUAGES.has(language)) problems.push(`its labels for ${tool} have a language agent-kit doesn't speak, ${language}`);
          if (!label || typeof label.label !== "string" || !label.label) problems.push(`its ${language} label for ${tool} has no label`);
          if (label && Object.keys(label).some((key) => key !== "label" && key !== "phrase")) problems.push(`its ${language} label for ${tool} has an unknown field`);
          if (label?.phrase !== undefined && !(Array.isArray(label.phrase) && label.phrase.length === 2 && label.phrase.every((part) => typeof part === "string"))) problems.push(`its ${language} phrase for ${tool} isn't two texts (once, {n} times)`);
        }
      }
  }
  if (kit.catalog !== undefined) {
    if (!kit.catalog || typeof kit.catalog !== "object" || Array.isArray(kit.catalog)) problems.push("its catalog isn't an object");
    else
      for (const [key, value] of Object.entries(kit.catalog)) {
        if (key !== "logo" && key !== "banner") problems.push(`its catalog has an unknown field, ${key}`);
        else if (typeof value !== "string" || !IMAGE.test(value) || path.isAbsolute(value) || /^[A-Za-z]:/.test(value) || value.split(/[\\/]/).includes("..")) problems.push(`its ${key} isn't an SVG, PNG, JPEG or WebP inside its folder: ${JSON.stringify(value)}`);
      }
  }
  return problems;
}

/** owner/name of the repository the catalog's links point to. */
async function repositoryOf(root, marketplace, given) {
  if (given) return given;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const repo = url.match(GITHUB)?.[1];
    if (repo) return repo;
  } catch {
    // No git, or no origin: the manifests say.
  }
  const repos = new Set();
  for (const entry of marketplace.plugins ?? []) {
    if (typeof entry.source !== "string") continue;
    const manifest = await readJson(path.join(root, entry.source, ".claude-plugin", "plugin.json")).catch(() => ({}));
    const url = typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url;
    const repo = url?.match(GITHUB)?.[1];
    if (repo) repos.add(repo);
  }
  return repos.size === 1 ? [...repos][0] : undefined;
}

/**
 * The catalog of the marketplace in `root`, as catalog.json holds it. Throws saying everything that
 * keeps it from being written (a version that doesn't match, an image missing, metadata that doesn't
 * fit agent-kit's schema).
 */
export async function buildCatalog(root, options = {}) {
  const marketplace = await readJson(path.join(root, ".claude-plugin", "marketplace.json"));
  const repo = await repositoryOf(root, marketplace, options.repo);
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("Which GitHub repository is this? Pass --repo owner/name (no GITHUB_REPOSITORY, no GitHub origin remote, no single repository in the plugin.json files).");
  const branch = options.branch || "main";
  const raw = `https://raw.githubusercontent.com/${repo}/${branch}`;
  const problems = [];
  const extensions = [];
  for (const entry of marketplace.plugins ?? []) {
    if (typeof entry.source !== "string") {
      problems.push(`${entry.name}: only extensions kept in this repository are cataloged`);
      continue;
    }
    const folder = entry.source.replace(/^\.\//, "").replace(/\/$/, "");
    const manifest = await readJson(path.join(root, folder, ".claude-plugin", "plugin.json")).catch(() => undefined);
    if (!manifest) {
      problems.push(`${entry.name}: no readable ${folder}/.claude-plugin/plugin.json`);
      continue;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(entry.name ?? "")) problems.push(`${entry.name}: a name must be kebab-case`);
    if (manifest.name !== entry.name) problems.push(`${entry.name}: its plugin.json is named ${manifest.name}`);
    if (manifest.version !== entry.version) problems.push(`${entry.name}: plugin.json says ${manifest.version}, marketplace.json ${entry.version}`);
    const kit = manifest.metadata?.["agent-kit"];
    for (const problem of metadataProblems(kit)) problems.push(`${entry.name}: ${problem}`);
    // The skills its capabilities name are files: they must be there. Its tools only a running server lists.
    for (const capability of Array.isArray(kit?.capabilities) ? kit.capabilities : [])
      for (const skill of isStrings(capability?.skills) ? capability.skills : [])
        if (!(await stat(path.join(root, folder, "skills", skill, "SKILL.md")).catch(() => null))?.isFile()) problems.push(`${entry.name}: its capability ${capability.id} names the skill ${skill}, and it has no skills/${skill}/SKILL.md`);
    const image = async (relative) => {
      if (typeof relative !== "string" || !IMAGE.test(relative)) return undefined;
      const file = path.resolve(root, folder, relative);
      if (path.relative(path.resolve(root, folder), file).startsWith("..")) return undefined;
      if (!(await stat(file).catch(() => null))?.isFile()) {
        problems.push(`${entry.name}: its ${relative} doesn't exist`);
        return undefined;
      }
      return `${raw}/${path.relative(root, file).split(path.sep).join("/")}`;
    };
    const look = kit?.catalog ?? {};
    const [logo, banner] = [await image(look.logo), await image(look.banner)];
    const topics = [...new Set([...(manifest.keywords ?? []), ...(entry.tags ?? []), ...(entry.keywords ?? []), ...(entry.category ? [entry.category] : [])].filter((topic) => typeof topic === "string").map((topic) => topic.toLowerCase()))];
    extensions.push({
      name: entry.name,
      version: manifest.version,
      description: entry.description ?? manifest.description ?? "",
      category: entry.category ?? null,
      topics,
      author: manifest.author?.name ?? marketplace.owner?.name ?? null,
      license: manifest.license ?? null,
      homepage: typeof manifest.homepage === "string" && manifest.homepage.startsWith("https://") ? manifest.homepage : `https://github.com/${repo}/tree/${branch}/${folder}`,
      readme: `https://github.com/${repo}/blob/${branch}/${folder}/README.md`,
      install: { claudeCode: `claude plugin install ${entry.name}@${marketplace.name}`, agentKit: `extension add ${entry.name}@${marketplace.name}` },
      ...(Array.isArray(kit?.capabilities) && kit.capabilities.length ? { capabilities: kit.capabilities } : {}),
      ...(Array.isArray(kit?.requirements) && kit.requirements.length ? { requirements: kit.requirements } : {}),
      ...(logo ? { logo } : {}),
      ...(banner ? { banner } : {}),
    });
  }
  if (problems.length) throw new Error(`The catalog can't be written:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
  return {
    marketplace: marketplace.name,
    description: marketplace.metadata?.description ?? marketplace.description ?? "",
    repository: `https://github.com/${repo}`,
    add: { claudeCode: `claude plugin marketplace add ${repo}`, agentKit: `extension marketplace add ${repo}` },
    extensions: extensions.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** catalog.json's text: two-space JSON and a final newline, with LF line endings. */
export const catalogText = (catalog) => `${JSON.stringify(catalog, null, 2)}\n`;

async function main(argv) {
  const option = (name) => {
    const at = argv.findIndex((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
    if (at < 0) return undefined;
    return argv[at].includes("=") ? argv[at].slice(argv[at].indexOf("=") + 1) : argv[at + 1];
  };
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: agent-kit-catalog [folder] [--check] [--repo owner/name] [--branch name]");
    return 0;
  }
  const positional = argv.filter((arg, index) => !arg.startsWith("--") && !["--repo", "--branch"].includes(argv[index - 1]));
  const root = path.resolve(positional[0] ?? ".");
  const target = path.join(root, "catalog.json");
  try {
    const text = catalogText(await buildCatalog(root, { repo: option("repo"), branch: option("branch") }));
    const count = JSON.parse(text).extensions.length;
    if (argv.includes("--check")) {
      const current = await readFile(target, "utf8").catch(() => "");
      if (current.replace(/\r\n/g, "\n") !== text) {
        console.error("catalog.json is out of date: run npx @falkenslab/agent-kit-catalog and commit it.");
        return 1;
      }
      console.log(`catalog.json is up to date (${count} extension${count === 1 ? "" : "s"}).`);
      return 0;
    }
    await writeFile(target, text, "utf8");
    console.log(`catalog.json: ${count} extension${count === 1 ? "" : "s"}.`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// Run as a program (npx, node agent-kit-catalog.mjs), not when imported.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));

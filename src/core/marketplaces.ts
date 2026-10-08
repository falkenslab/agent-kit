import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { addExtension, isGitSource } from "./externalExtensions.js";
import { fetchArchivePlugin, fetchNpmPlugin } from "./pluginDownloads.js";

/**
 * Marketplaces (ADR-025, #29): a repository of extensions is a Claude Code marketplace as it is,
 * a folder or git repository with `.claude-plugin/marketplace.json` listing plugins and where
 * each comes from. An agent knows the marketplaces added to it, kept in its extensions folder
 * (`marketplaces.json`, and a copy of each in `.marketplaces/<name>/`), and installs from them
 * by `<plugin>@<marketplace>` into either scope, through `addExtension()`: the same copy, hash and
 * lock as any extension. Its official marketplace is known without asking; any other is added
 * only by hand, after a warning (the command asks to type its name).
 */

const exec = promisify(execFile);

/** Where a marketplace's plugin comes from, as `marketplace.json` says (Claude Code's forms). */
export type PluginSource =
  | string
  | { source: "github"; repo: string; ref?: string; sha?: string }
  | { source: "url"; url: string; ref?: string; sha?: string }
  | { source: "git-subdir"; url: string; path: string; ref?: string; sha?: string }
  | { source: string; [field: string]: unknown };

/** A plugin a marketplace offers. */
export interface MarketplacePlugin {
  name: string;
  source: PluginSource;
  description?: string;
  version?: string;
  category?: string;
  tags?: string[];
  keywords?: string[];
}

/** A marketplace's `marketplace.json`, as the kit reads it. */
export interface MarketplaceManifest {
  name: string;
  owner: { name: string; email?: string; url?: string };
  description?: string;
  /** Where bare plugin sources resolve, relative to the marketplace's root. */
  pluginRoot?: string;
  plugins: MarketplacePlugin[];
}

/** A marketplace an agent knows. */
export interface KnownMarketplace {
  name: string;
  /** Where it came from: a folder, a git URL (`#ref`), or `owner/repo`. */
  source: string;
  /** The commit its copy was taken at, for a git one. */
  commit?: string;
  /** The agent's own: known without asking, and its plugins installed without a confirmation. */
  official: boolean;
  /** When its copy was taken, ISO 8601 in UTC. */
  updated: string;
  /** Its copy, inside the agent's extensions folder. */
  dir: string;
  manifest?: MarketplaceManifest;
}

const REGISTRY = "marketplaces.json";
const COPIES = ".marketplaces";
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Reads and checks a marketplace's `.claude-plugin/marketplace.json`. */
export async function readMarketplaceManifest(root: string): Promise<MarketplaceManifest> {
  const file = path.join(root, ".claude-plugin", "marketplace.json");
  const raw = JSON.parse(await readFile(file, "utf8").catch(() => {
    throw new Error(`${root} isn't a marketplace: it has no .claude-plugin/marketplace.json.`);
  })) as Record<string, unknown>;
  const name = raw.name;
  if (typeof name !== "string" || !NAME.test(name) || name.includes("..")) throw new Error(`${file}: "name" must be letters, digits, ".", "_" or "-".`);
  const owner = raw.owner as MarketplaceManifest["owner"] | undefined;
  if (!owner || typeof owner.name !== "string") throw new Error(`${file}: "owner" needs a "name".`);
  if (!Array.isArray(raw.plugins)) throw new Error(`${file}: "plugins" must be a list.`);
  const metadata = (raw.metadata ?? {}) as { description?: string; pluginRoot?: string };
  const plugins = (raw.plugins as MarketplacePlugin[]).map((plugin, index) => {
    if (typeof plugin?.name !== "string" || !NAME.test(plugin.name)) throw new Error(`${file}: plugin ${index + 1} has no valid "name".`);
    if (plugin.source === undefined) throw new Error(`${file}: ${plugin.name} has no "source".`);
    return plugin;
  });
  const description = (raw.description as string | undefined) ?? metadata.description;
  return { name, owner, ...(description ? { description } : {}), ...(metadata.pluginRoot ? { pluginRoot: metadata.pluginRoot } : {}), plugins };
}

type Registry = Record<string, Omit<KnownMarketplace, "name" | "dir" | "manifest">>;

async function readRegistry(dir: string): Promise<Registry> {
  try {
    return JSON.parse(await readFile(path.join(dir, REGISTRY), "utf8")) as Registry;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeRegistry(dir: string, registry: Registry): Promise<void> {
  await mkdir(dir, { recursive: true });
  const sorted = Object.fromEntries(Object.keys(registry).sort().map((name) => [name, registry[name]]));
  await writeFile(path.join(dir, REGISTRY), `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

/** A git URL for a marketplace or plugin source: `owner/repo` is GitHub's. */
function gitUrl(source: string): string {
  return /^[\w.-]+\/[\w.-]+$/.test(source) ? `https://github.com/${source}.git` : source.replace(/^github:/, "https://github.com/");
}

/** Whether a marketplace source is a git repository rather than a folder (`owner/repo` included, unless such a folder exists). */
async function isGitMarketplace(source: string): Promise<boolean> {
  const [location] = source.split("#") as [string];
  if (isGitSource(location)) return true;
  if (!/^[\w.-]+\/[\w.-]+$/.test(location)) return false;
  return !(await stat(path.resolve(location)).then((found) => found.isDirectory(), () => false));
}

/** Takes a copy of a marketplace (a folder, or a git clone at its ref) into a temporary folder. */
async function fetchMarketplace(source: string): Promise<{ copy: string; commit?: string }> {
  const copy = await mkdtemp(path.join(os.tmpdir(), "agent-kit-marketplace-"));
  try {
    if (await isGitMarketplace(source)) {
      const [location, ref] = source.split("#") as [string, string | undefined];
      await exec("git", ["clone", "--depth", "1", ...(ref ? ["--branch", ref] : []), gitUrl(location), copy]);
      const commit = (await exec("git", ["-C", copy, "rev-parse", "HEAD"])).stdout.trim();
      await rm(path.join(copy, ".git"), { recursive: true, force: true });
      return { copy, commit };
    }
    await cp(path.resolve(source), copy, { recursive: true, filter: (file) => path.basename(file) !== ".git" });
    return { copy };
  } catch (error) {
    await rm(copy, { recursive: true, force: true });
    throw error;
  }
}

/** Reads a marketplace from a folder, a git URL (`#ref`) or `owner/repo` without adding it: what to show before asking. */
export async function inspectMarketplace(source: string): Promise<MarketplaceManifest> {
  const { copy } = await fetchMarketplace((await isGitMarketplace(source)) ? source : path.resolve(source));
  try {
    return await readMarketplaceManifest(copy);
  } finally {
    await rm(copy, { recursive: true, force: true });
  }
}

/**
 * Adds a marketplace to the agent (its extensions folder, `dir`) from a folder, a git URL
 * (`#ref`) or `owner/repo`, taking a copy; one with the same name is replaced. Asking the person
 * first is the caller's: the kit's command asks them to type its name, unless it's `official`.
 */
export async function addMarketplace(source: string, dir: string, options: { official?: boolean } = {}): Promise<{ name: string; replaced: boolean; manifest: MarketplaceManifest; commit?: string }> {
  const location = (await isGitMarketplace(source)) ? source : path.resolve(source);
  const { copy, commit } = await fetchMarketplace(location);
  try {
    const manifest = await readMarketplaceManifest(copy);
    const registry = await readRegistry(dir);
    const replaced = Boolean(registry[manifest.name]);
    const target = path.join(dir, COPIES, manifest.name);
    await rm(target, { recursive: true, force: true });
    await mkdir(path.dirname(target), { recursive: true });
    await cp(copy, target, { recursive: true });
    registry[manifest.name] = { source: location, ...(commit ? { commit } : {}), official: Boolean(options.official || registry[manifest.name]?.official), updated: new Date().toISOString() };
    await writeRegistry(dir, registry);
    return { name: manifest.name, replaced, manifest, ...(commit ? { commit } : {}) };
  } finally {
    await rm(copy, { recursive: true, force: true });
  }
}

/** The marketplaces the agent knows, with their manifests when they can be read. */
export async function listMarketplaces(dir: string): Promise<KnownMarketplace[]> {
  const registry = await readRegistry(dir);
  return Promise.all(
    Object.entries(registry).map(async ([name, entry]) => {
      const copy = path.join(dir, COPIES, name);
      const manifest = await readMarketplaceManifest(copy).catch(() => undefined);
      return { name, ...entry, dir: copy, ...(manifest ? { manifest } : {}) };
    }),
  );
}

/** Takes a fresh copy of a known marketplace from where it came from. */
export async function updateMarketplace(dir: string, name: string): Promise<{ commit?: string }> {
  const known = (await readRegistry(dir))[name];
  if (!known) throw new Error(`No marketplace ${name}.`);
  const result = await addMarketplace(known.source, dir, { official: known.official });
  if (result.name !== name) throw new Error(`${known.source} is now the marketplace ${result.name}, not ${name}.`);
  return result.commit ? { commit: result.commit } : {};
}

/** Forgets a marketplace (its copy and its entry); the extensions installed from it stay. False when it wasn't known. */
export async function removeMarketplace(dir: string, name: string): Promise<boolean> {
  const registry = await readRegistry(dir);
  if (!registry[name]) return false;
  delete registry[name];
  await rm(path.join(dir, COPIES, name), { recursive: true, force: true });
  await writeRegistry(dir, registry);
  return true;
}

/** A plugin found in the known marketplaces: `<name>@<marketplace>`, or a name only one of them offers. */
export async function findPlugin(dir: string, spec: string): Promise<{ marketplace: KnownMarketplace; plugin: MarketplacePlugin }> {
  const [name, wanted] = spec.split("@") as [string, string | undefined];
  const marketplaces = (await listMarketplaces(dir)).filter((marketplace) => !wanted || marketplace.name === wanted);
  if (wanted && !marketplaces.length) throw new Error(`No marketplace ${wanted}.`);
  const found = marketplaces.flatMap((marketplace) => (marketplace.manifest?.plugins ?? []).filter((plugin) => plugin.name === name).map((plugin) => ({ marketplace, plugin })));
  if (!found.length) throw new Error(`No marketplace offers ${name}${wanted ? ` (${wanted} doesn't)` : ""}.`);
  if (found.length > 1) throw new Error(`${name} is in several marketplaces (${found.map(({ marketplace }) => marketplace.name).join(", ")}): say which, ${name}@<marketplace>.`);
  return found[0]!;
}

/** Where a plugin comes from: a folder or git repository for `addExtension()`, or a download (npm, archive). */
export type ResolvedSource =
  | { source: string; subdir?: string; sha?: string }
  | { npm: { name: string; version?: string; registry?: string } }
  | { archive: { url: string; sha256?: string } };

/** Where a plugin's source points: a folder of the marketplace's copy, a git repository, an npm package or a zip. */
export function resolvePluginSource(marketplace: KnownMarketplace, plugin: MarketplacePlugin): ResolvedSource {
  const { source } = plugin;
  if (typeof source === "string") {
    // From the marketplace's root: `./plugins/x`, or a bare name under `pluginRoot`; never "..", as Claude Code.
    if (source.split(/[\\/]/).includes("..")) throw new Error(`${plugin.name}'s source leaves its marketplace: ${source}.`);
    const relative = source.startsWith("./") || source === "." ? source : path.join(marketplace.manifest?.pluginRoot ?? ".", source);
    const root = path.resolve(marketplace.dir);
    const folder = path.resolve(root, relative);
    if (folder !== root && !folder.startsWith(`${root}${path.sep}`)) throw new Error(`${plugin.name}'s source leaves its marketplace: ${source}.`);
    return { source: folder };
  }
  // Its fields, as written: the union above only names the forms the kit knows.
  const entry = source as Record<string, unknown>;
  const ref = typeof entry.ref === "string" ? `#${entry.ref}` : "";
  const sha = typeof entry.sha === "string" ? { sha: entry.sha } : {};
  switch (source.source) {
    case "github":
      return { source: `https://github.com/${String(entry.repo)}.git${ref}`, ...sha };
    case "url":
      return { source: `${String(entry.url)}${ref}`, ...sha };
    case "git-subdir":
      return { source: `${gitUrl(String(entry.url))}${ref}`, subdir: String(entry.path), ...sha };
    case "npm": {
      // "package" may carry its version ("@scope/name@^2.0.0"); "version" wins.
      const spec = String(entry.package);
      const at = spec.lastIndexOf("@");
      const [name, inline] = at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, undefined];
      const version = typeof entry.version === "string" ? entry.version : inline;
      return { npm: { name, ...(version ? { version } : {}), ...(typeof entry.registry === "string" ? { registry: entry.registry } : {}) } };
    }
    case "archive":
      return { archive: { url: String(entry.url), ...(typeof entry.sha256 === "string" ? { sha256: entry.sha256 } : {}) } };
    default:
      // command runs a program of the marketplace's on this machine: never.
      throw new Error(`${plugin.name} comes from a "${source.source}" source, which agent-kit doesn't install: only folders of the marketplace, github, url, git-subdir, npm and archive.`);
  }
}

/**
 * Installs `<plugin>@<marketplace>` (or a plugin only one known marketplace offers) into a scope,
 * locked with where it came from. Its name in the agent is its `plugin.json`'s, as for any extension.
 */
export async function installFromMarketplace(
  dir: string,
  spec: string,
  scopeDir: string,
): Promise<{ name: string; replaced: boolean; commit?: string; marketplace: string }> {
  const { marketplace, plugin } = await findPlugin(dir, spec);
  const resolved = resolvePluginSource(marketplace, plugin);
  const from = `${plugin.name}@${marketplace.name}`;
  if ("npm" in resolved) {
    const { name, version, registry } = resolved.npm;
    const fetched = await fetchNpmPlugin(name, version, registry);
    try {
      return { ...(await addExtension(fetched.dir, scopeDir, { marketplace: from, origin: `npm:${name}@${fetched.version}` })), marketplace: marketplace.name };
    } finally {
      await rm(fetched.dir, { recursive: true, force: true });
    }
  }
  if ("archive" in resolved) {
    const fetched = await fetchArchivePlugin(resolved.archive.url, resolved.archive.sha256);
    try {
      return { ...(await addExtension(fetched.root, scopeDir, { marketplace: from, origin: resolved.archive.url })), marketplace: marketplace.name };
    } finally {
      await rm(fetched.dir, { recursive: true, force: true });
    }
  }
  const result = await addExtension(resolved.source, scopeDir, {
    ...(resolved.subdir ? { subdir: resolved.subdir } : {}),
    ...(resolved.sha ? { sha: resolved.sha } : {}),
    marketplace: from,
  });
  return { ...result, marketplace: marketplace.name };
}

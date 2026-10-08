import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, stat, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import type { Extension } from "./extensions.js";
import type { Language } from "./language.js";
import { getLanguage, type ToolPhrase } from "./messages/index.js";
import { truncate, type ToolLabels } from "./toolLabels.js";
import { agentKitVersion } from "./version.js";
import { outsideArchive } from "./packaged.js";

/**
 * External extensions (ADR-025, #37): installed into an agent, for all its projects (the
 * agent's scope) or for one (the project's, which wins), from a folder or a git repository.
 * Each scope is a folder of extensions, one per subfolder, with a lock (`extensions.lock.json`)
 * that records where each came from, a SHA-256 over its files and whether it's enabled. An
 * extension is a Claude Code plugin as it is (#38): its MCP servers come from its `.mcp.json`,
 * and the kit starts each with Node through a launcher that leaves it only the system's
 * variables and its own `env`. The `"agent-kit"` key of its `plugin.json` is optional: it adds
 * what the kit's gates and chat can use (capabilities, read-only tools, labels, help).
 */

/** The two folders an agent installs extensions into; either may be left out. */
export interface ExtensionDirs {
  /** The agent's, for all its projects, e.g. `~/.miyagi/extensions`. */
  agent?: string;
  /** The project's, for this one only, e.g. `<projectDir>/extensions`: it wins over the agent's. */
  project?: string;
}

/** One of the two scopes an extension can be installed in: the agent's or the project's. */
export type ExtensionScope = keyof ExtensionDirs;

/** One of a plugin's MCP servers, as its `.mcp.json` (or `plugin.json`'s `mcpServers`) declares it. */
export interface PluginServer {
  command: string;
  args?: string[];
  /** Its variables: a value may take the agent's with `${VAR}`. */
  env?: Record<string, string>;
}

/** How the chat shows one of its tools in one language: `{field}` takes the call's input. */
export interface ExternalToolLabel {
  label: string;
  phrase?: ToolPhrase;
}

/** Who made an extension, as Claude Code's `plugin.json` has it. */
export interface ExtensionAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * An external extension's manifest: its `plugin.json`, the plugin's own metadata (Claude Code's
 * fields, which its validator checks) and the kit's key (`"agent-kit"`, which it ignores).
 */
export interface ExternalManifest {
  name: string;
  description: string;
  version?: string;
  author?: ExtensionAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  provides: string[];
  requires: string[];
  /** The agent-kit versions it works with, e.g. `">=0.19.0 <0.21.0"`. */
  kit?: string;
  /** Programs it needs on this computer, found on the `PATH` (`"docker"`, `"python3"`): without one it's off, saying which. */
  needs: string[];
  /** Its MCP servers, by name (`mcp__<name>__<tool>`), from the plugin's `.mcp.json` or `plugin.json`. */
  servers: Record<string, PluginServer>;
  /** Its tools that only read (short names, of any of its servers): plan mode lets them through. */
  readOnlyTools: string[];
  /** Its tools' chat labels, by short name (of any of its servers) and language (English when the kit's isn't there). */
  labels: Record<string, Partial<Record<Language, ExternalToolLabel>>>;
  /** What it says about itself in a session, for the agent to tell the person (`SessionFacts`). */
  help?: string;
}

/** One extension in a scope's lock. */
export interface LockEntry {
  /** Where it came from: a folder, or a git URL (with `#ref` when given). */
  source: string;
  /** The commit it was cloned at, for a git source. */
  commit?: string;
  /** The marketplace it was installed from (`<name>@<marketplace>`), if any. */
  marketplace?: string;
  /** SHA-256 over its files, checked when it loads. */
  sha256: string;
  enabled: boolean;
  /** When it was installed, ISO 8601 in UTC. */
  installed: string;
}

export const LOCK_FILE = "extensions.lock.json";

/** A scope's lock: its extensions by name. */
export async function readLock(scopeDir: string): Promise<Record<string, LockEntry>> {
  try {
    return JSON.parse(await readFile(path.join(scopeDir, LOCK_FILE), "utf8")) as Record<string, LockEntry>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function writeLock(scopeDir: string, lock: Record<string, LockEntry>): Promise<void> {
  await mkdir(scopeDir, { recursive: true });
  const sorted = Object.fromEntries(Object.keys(lock).sort().map((name) => [name, lock[name]]));
  await writeFile(path.join(scopeDir, LOCK_FILE), `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

/** Reads an extension's manifest, checking what the kit needs from it. */
export async function readExternalManifest(dir: string): Promise<ExternalManifest> {
  const file = path.join(dir, ".claude-plugin", "plugin.json");
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  } catch {
    throw new Error(`${dir} isn't an extension: it has no readable .claude-plugin/plugin.json.`);
  }
  const name = raw.name;
  if (typeof name !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) throw new Error(`${file}: "name" must be kebab-case.`);
  const kit = (raw["agent-kit"] ?? {}) as Partial<ExternalManifest>;
  const text = (key: string): Record<string, string> => (typeof raw[key] === "string" ? { [key]: raw[key] as string } : {});
  const author = raw.author as Partial<ExtensionAuthor> | undefined;
  // `repository` may be a URL or `{ url }`, as in package.json.
  const repository = typeof raw.repository === "string" ? raw.repository : (raw.repository as { url?: unknown } | undefined)?.url;
  return {
    name,
    description: typeof raw.description === "string" ? raw.description : "",
    ...text("version"),
    ...(author && typeof author === "object" && typeof author.name === "string"
      ? { author: { name: author.name, ...(author.email ? { email: author.email } : {}), ...(author.url ? { url: author.url } : {}) } }
      : {}),
    ...text("homepage"),
    ...(typeof repository === "string" ? { repository } : {}),
    ...text("license"),
    ...(Array.isArray(raw.keywords) ? { keywords: raw.keywords.filter((keyword): keyword is string => typeof keyword === "string") } : {}),
    provides: kit.provides ?? [],
    requires: kit.requires ?? [],
    ...(kit.kit ? { kit: kit.kit } : {}),
    needs: Array.isArray(kit.needs) ? kit.needs.filter((program): program is string => typeof program === "string") : [],
    servers: await pluginServers(dir, raw),
    readOnlyTools: kit.readOnlyTools ?? [],
    labels: kit.labels ?? {},
    ...(kit.help ? { help: kit.help } : {}),
  };
}

/**
 * A plugin's MCP servers, where Claude Code looks for them: `mcpServers` in `plugin.json` (inline,
 * or a path to a JSON file), else `.mcp.json` at its root, with or without the `mcpServers` key.
 */
async function pluginServers(dir: string, raw: Record<string, unknown>): Promise<Record<string, PluginServer>> {
  const read = async (file: string): Promise<unknown> => {
    try {
      return JSON.parse(await readFile(path.join(dir, file), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new Error(`${file} can't be read as JSON.`, { cause: error });
    }
  };
  let declared: unknown = raw.mcpServers;
  if (typeof declared === "string") declared = await read(declared);
  if (declared === undefined) declared = await read(".mcp.json");
  if (declared && typeof declared === "object" && "mcpServers" in declared) declared = (declared as { mcpServers: unknown }).mcpServers;
  if (declared === undefined || declared === null) return {};
  if (typeof declared !== "object") throw new Error("its MCP servers aren't a JSON object.");
  const servers: Record<string, PluginServer> = {};
  for (const [name, server] of Object.entries(declared as Record<string, Partial<PluginServer>>)) {
    if (!server || typeof server.command !== "string") throw new Error(`its MCP server "${name}" has no command.`);
    servers[name] = { command: server.command, ...(Array.isArray(server.args) ? { args: server.args.map(String) } : {}), ...(server.env ? { env: server.env } : {}) };
  }
  return servers;
}

/** `${CLAUDE_PLUGIN_ROOT}` (the extension's folder) and `${VAR}` (the agent's variable) in a server's values. */
function expand(value: string, root: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name: string) => (name === "CLAUDE_PLUGIN_ROOT" ? root : (process.env[name] ?? "")));
}

/**
 * Why one of an extension's servers can't run through the launcher (only Node, its script
 * first, inside the extension), or how the kit starts it.
 */
function serverLaunch(name: string, server: PluginServer, root: string): string | { entry: string; args: string[]; env: Record<string, string> } {
  if (!/^node(\.exe)?$/i.test(path.basename(server.command))) return `runs its server "${name}" with "${server.command}": only Node servers can be installed`;
  const [script, ...args] = (server.args ?? []).map((arg) => expand(arg, root));
  if (!script) return `gives its server "${name}" no script to run`;
  const entry = path.resolve(root, script);
  if (path.relative(root, entry).startsWith("..")) return `runs its server "${name}" from outside its folder (${script})`;
  return { entry, args, env: Object.fromEntries(Object.entries(server.env ?? {}).map(([key, value]) => [key, expand(String(value), root)])) };
}

/** Why an extension's servers can't run, or nothing: each must be Node, with its script there. */
async function serversProblem(manifest: ExternalManifest, root: string): Promise<string | undefined> {
  for (const [name, server] of Object.entries(manifest.servers)) {
    const launch = serverLaunch(name, server, root);
    if (typeof launch === "string") return launch;
    if (!(await stat(launch.entry).catch(() => null))?.isFile()) return `has no script at ${path.relative(root, launch.entry)} for its server "${name}"`;
  }
  return undefined;
}

/** SHA-256 over an extension's files (their paths and contents, in order), `.git` aside. */
export async function hashExtension(dir: string): Promise<string> {
  const hash = createHash("sha256");
  async function walk(relative: string): Promise<void> {
    const entries = (await readdir(path.join(dir, relative), { withFileTypes: true })).filter((entry) => entry.name !== ".git");
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) hash.update(`${child}\0`).update(await readFile(path.join(dir, child))).update("\0");
    }
  }
  await walk("");
  return hash.digest("hex");
}

/**
 * Whether `version` (x.y.z) is in `range`: comparators separated by spaces, all of which must
 * hold (`>=0.19.0 <0.21.0`, `=0.19.2`, `0.19.2`).
 */
export function inKitRange(version: string, range: string): boolean {
  const parse = (text: string): number[] => text.split("-")[0]!.split(".").map((part) => Number(part) || 0);
  const compare = (a: number[], b: number[]): number => {
    for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
    return 0;
  };
  const current = parse(version);
  return range
    .trim()
    .split(/\s+/)
    .every((comparator) => {
      const match = /^(>=|<=|>|<|=)?\s*v?(\d+(?:\.\d+){0,2})$/.exec(comparator);
      if (!match) return false;
      const order = compare(current, parse(match[2]!));
      switch (match[1]) {
        case ">=":
          return order >= 0;
        case "<=":
          return order <= 0;
        case ">":
          return order > 0;
        case "<":
          return order < 0;
        default:
          return order === 0;
      }
    });
}

/** One installed extension, as the scopes and their locks list it. */
export interface InstalledExtension {
  name: string;
  scope: ExtensionScope;
  dir: string;
  lock: LockEntry;
  /** Also installed in the project's scope, which wins: this one isn't used. */
  shadowed: boolean;
  /** Its manifest, when it can be read. */
  manifest?: ExternalManifest;
}

/** Every extension installed in the scopes, the project's first. */
export async function listInstalled(dirs: ExtensionDirs): Promise<InstalledExtension[]> {
  const installed: InstalledExtension[] = [];
  for (const scope of ["project", "agent"] as const) {
    const scopeDir = dirs[scope];
    if (!scopeDir) continue;
    for (const [name, lock] of Object.entries(await readLock(scopeDir))) {
      const dir = path.join(scopeDir, name);
      const manifest = await readExternalManifest(dir).catch(() => undefined);
      installed.push({ name, scope, dir, lock, shadowed: installed.some((other) => other.name === name), ...(manifest ? { manifest } : {}) });
    }
  }
  return installed;
}

/** The launcher that starts an external extension's server with a clean environment. */
export function extensionLauncherPath(): string {
  // Node runs it as another process: outside the archive when packaged (#42).
  return outsideArchive(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "extension-launcher.mjs"));
}

/** Its tools' chat labels in the kit's language, from its manifest: `{field}` takes the input; for each of its servers. */
function manifestToolLabels(manifest: ExternalManifest): ToolLabels {
  const language = getLanguage();
  const fill = (template: string, input: Record<string, unknown>): string =>
    template.replace(/\{(\w+)\}/g, (_, field: string) => (input[field] === undefined ? "" : truncate(String(input[field]), 60)));
  return Object.fromEntries(
    Object.entries(manifest.labels).flatMap(([tool, byLanguage]) => {
      const texts = byLanguage[language] ?? byLanguage.en;
      if (!texts) return [];
      const label = { label: (input: Record<string, unknown>) => fill(texts.label, input), ...(texts.phrase ? { phrase: texts.phrase } : {}) };
      return Object.keys(manifest.servers).map((server) => [`mcp__${server}__${tool}`, label]);
    }),
  );
}

/** The extension an installed one makes: its servers started through the launcher, its rules from its manifest. */
function externalExtension(installed: InstalledExtension, manifest: ExternalManifest): Extension {
  return {
    name: manifest.name,
    plugin: installed.dir,
    external: true,
    async contribute() {
      const servers: Record<string, McpServerConfig> = {};
      for (const [name, server] of Object.entries(manifest.servers)) {
        const launch = serverLaunch(name, server, installed.dir);
        if (typeof launch === "string") continue; // checked when it loaded
        // Its `env` reaches it (the SDK merges it with the agent's); the launcher removes the rest.
        // Inside Electron, process.execPath is the app itself: ELECTRON_RUN_AS_NODE makes it run
        // the launcher as Node (the launcher removes it, with the rest, once it runs).
        const env = process.versions.electron ? { ...launch.env, ELECTRON_RUN_AS_NODE: "1" } : launch.env;
        servers[name] = { type: "stdio", command: process.execPath, args: [extensionLauncherPath(), launch.entry, JSON.stringify(Object.keys(launch.env)), ...launch.args], env };
      }
      return {
        mcpServers: servers,
        readOnlyTools: Object.keys(manifest.servers).flatMap((server) => manifest.readOnlyTools.map((tool) => `mcp__${server}__${tool}`)),
        toolLabels: manifestToolLabels(manifest),
        ...(manifest.help ? { helpLines: [manifest.help] } : {}),
      };
    },
  };
}

/** The installed extensions a session runs with, and those it can't (with why). Disabled ones are neither. */
export async function loadExternalExtensions(dirs: ExtensionDirs): Promise<{ extensions: Extension[]; off: { name: string; reason: string }[] }> {
  const extensions: Extension[] = [];
  const off: { name: string; reason: string }[] = [];
  for (const installed of await listInstalled(dirs)) {
    if (installed.shadowed || !installed.lock.enabled) continue;
    const reason = await problem(installed);
    if (typeof reason === "string") off.push({ name: installed.name, reason });
    else extensions.push(externalExtension(installed, reason));
  }
  return { extensions, off };
}

/** Why an installed extension can't load, or its manifest when it can. */
/** Whether a program is on the `PATH`, as a shell would find it (with `PATHEXT`'s extensions on Windows). */
export async function onPath(program: string, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? ["", ...(env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").map((extension) => extension.toLowerCase())] : [""];
  for (const dir of dirs) {
    for (const extension of extensions) {
      const found = await stat(path.join(dir, `${program}${extension}`)).then((entry) => entry.isFile(), () => false);
      if (found) return true;
    }
  }
  return false;
}

async function problem(installed: InstalledExtension): Promise<string | ExternalManifest> {
  let manifest: ExternalManifest;
  try {
    if ((await hashExtension(installed.dir)) !== installed.lock.sha256) return "has files that changed since it was installed: install it again to trust them";
    manifest = await readExternalManifest(installed.dir);
  } catch (error) {
    return `can't be read (${error instanceof Error ? error.message : String(error)})`;
  }
  if (manifest.name !== installed.name) return `is installed as "${installed.name}" but its manifest says "${manifest.name}"`;
  if (manifest.kit && !inKitRange(agentKitVersion(), manifest.kit)) return `works with agent-kit ${manifest.kit}, and this agent runs ${agentKitVersion()}`;
  const missing = [];
  for (const program of manifest.needs) if (!(await onPath(program))) missing.push(program);
  if (missing.length) return `needs ${missing.join(", ")}, which ${missing.length === 1 ? "isn't" : "aren't"} on this computer (on the PATH)`;
  return (await serversProblem(manifest, installed.dir)) ?? manifest;
}

const exec = promisify(execFile);

/** Whether `source` names a git repository rather than a folder. */
export function isGitSource(source: string): boolean {
  return /^(https?:\/\/|git@|ssh:\/\/|git:\/\/|file:\/\/|github:)/.test(source) || /\.git(#.*)?$/.test(source);
}

/**
 * Installs an extension into a scope from a folder or a git repository (`url#ref`, `sha` to pin
 * a commit, and `subdir` for one inside it): copies its files (never runs a script), checks its
 * manifest, and locks it, enabled, with the marketplace it came from when it did. An extension
 * with the same name in that scope is replaced.
 */
export async function addExtension(
  source: string,
  scopeDir: string,
  options: { subdir?: string; sha?: string; marketplace?: string } = {},
): Promise<{ name: string; replaced: boolean; commit?: string }> {
  let from = path.resolve(source);
  let commit: string | undefined;
  let clone: string | undefined;
  if (isGitSource(source)) {
    const [url, ref] = source.replace(/^github:/, "https://github.com/").split("#") as [string, string | undefined];
    clone = await mkdtemp(path.join(os.tmpdir(), "agent-kit-extension-"));
    // A pinned commit needs the history to check it out; otherwise the tip is enough.
    await exec("git", ["clone", ...(options.sha ? [] : ["--depth", "1"]), ...(ref ? ["--branch", ref] : []), url, clone]);
    if (options.sha) await exec("git", ["-C", clone, "checkout", "--quiet", options.sha]);
    commit = (await exec("git", ["-C", clone, "rev-parse", "HEAD"])).stdout.trim();
    if (options.sha && commit !== options.sha.toLowerCase()) throw new Error(`${url} has no commit ${options.sha}.`);
    from = clone;
  }
  try {
    if (options.subdir) from = path.join(from, options.subdir);
    const manifest = await readExternalManifest(from);
    const servers = await serversProblem(manifest, from);
    if (servers) throw new Error(`${manifest.name} can't be installed: it ${servers}.`);
    const target = path.join(scopeDir, manifest.name);
    const lock = await readLock(scopeDir);
    const replaced = Boolean(lock[manifest.name]);
    await rm(target, { recursive: true, force: true });
    await mkdir(scopeDir, { recursive: true });
    await cp(from, target, { recursive: true, filter: (file) => path.basename(file) !== ".git" });
    lock[manifest.name] = {
      source: isGitSource(source) ? `${source}${options.subdir ? ` (${options.subdir})` : ""}` : from,
      ...(commit ? { commit } : {}),
      ...(options.marketplace ? { marketplace: options.marketplace } : {}),
      sha256: await hashExtension(target),
      enabled: true,
      installed: new Date().toISOString(),
    };
    await writeLock(scopeDir, lock);
    return { name: manifest.name, replaced, ...(commit ? { commit } : {}) };
  } finally {
    if (clone) await rm(clone, { recursive: true, force: true });
  }
}

/** Removes an extension from a scope (its files and its lock entry); false when it wasn't there. */
export async function removeExtension(scopeDir: string, name: string): Promise<boolean> {
  const lock = await readLock(scopeDir);
  if (!lock[name]) return false;
  delete lock[name];
  await rm(path.join(scopeDir, name), { recursive: true, force: true });
  await writeLock(scopeDir, lock);
  return true;
}

/** Enables or disables an installed extension in a scope; false when it isn't there. */
export async function setExtensionEnabled(scopeDir: string, name: string, enabled: boolean): Promise<boolean> {
  const lock = await readLock(scopeDir);
  if (!lock[name]) return false;
  lock[name] = { ...lock[name], enabled };
  await writeLock(scopeDir, lock);
  return true;
}

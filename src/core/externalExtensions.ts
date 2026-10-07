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

/**
 * External extensions (ADR-025, #37): installed into an agent, for all its projects (the
 * agent's scope) or for one (the project's, which wins), from a folder or a git repository.
 * Each scope is a folder of extensions, one per subfolder, with a lock (`extensions.lock.json`)
 * that records where each came from, a SHA-256 over its files and whether it's enabled. Their
 * tools are their own MCP server, which the kit starts with Node through a launcher that leaves
 * it only the environment it declares; what code says for an internal extension, their
 * manifest says (`plugin.json`'s `"agent-kit"` key).
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

/** How the chat shows one of its tools in one language: `{field}` takes the call's input. */
export interface ExternalToolLabel {
  label: string;
  phrase?: ToolPhrase;
}

/** An external extension's manifest: the kit's key of its `plugin.json`. */
export interface ExternalManifest {
  name: string;
  description: string;
  version?: string;
  provides: string[];
  requires: string[];
  /** The agent-kit versions it works with, e.g. `">=0.19.0 <0.21.0"`. */
  kit?: string;
  /** Its MCP server: the entry Node runs, relative to the extension, and the variables it may see. */
  server?: { entry: string; env?: string[] };
  /** Its tools that only read (short names): plan mode lets them through. */
  readOnlyTools: string[];
  /** Its tools' chat labels, by short name and language (English when the kit's isn't there). */
  labels: Record<string, Partial<Record<Language, ExternalToolLabel>>>;
  /** What `agent-help` says about it. */
  help?: string;
}

/** One extension in a scope's lock. */
export interface LockEntry {
  /** Where it came from: a folder, or a git URL (with `#ref` when given). */
  source: string;
  /** The commit it was cloned at, for a git source. */
  commit?: string;
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
  return {
    name,
    description: typeof raw.description === "string" ? raw.description : "",
    ...(typeof raw.version === "string" ? { version: raw.version } : {}),
    provides: kit.provides ?? [],
    requires: kit.requires ?? [],
    ...(kit.kit ? { kit: kit.kit } : {}),
    ...(kit.server ? { server: kit.server } : {}),
    readOnlyTools: kit.readOnlyTools ?? [],
    labels: kit.labels ?? {},
    ...(kit.help ? { help: kit.help } : {}),
  };
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
}

/** Every extension installed in the scopes, the project's first. */
export async function listInstalled(dirs: ExtensionDirs): Promise<InstalledExtension[]> {
  const installed: InstalledExtension[] = [];
  for (const scope of ["project", "agent"] as const) {
    const scopeDir = dirs[scope];
    if (!scopeDir) continue;
    for (const [name, lock] of Object.entries(await readLock(scopeDir))) {
      installed.push({ name, scope, dir: path.join(scopeDir, name), lock, shadowed: installed.some((other) => other.name === name) });
    }
  }
  return installed;
}

/** The launcher that starts an external extension's server with a clean environment. */
export function extensionLauncherPath(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "extension-launcher.mjs");
}

/** Its tools' chat labels in the kit's language, from its manifest: `{field}` takes the input. */
function manifestToolLabels(manifest: ExternalManifest): ToolLabels {
  const language = getLanguage();
  const fill = (template: string, input: Record<string, unknown>): string =>
    template.replace(/\{(\w+)\}/g, (_, field: string) => (input[field] === undefined ? "" : truncate(String(input[field]), 60)));
  return Object.fromEntries(
    Object.entries(manifest.labels).flatMap(([tool, byLanguage]) => {
      const texts = byLanguage[language] ?? byLanguage.en;
      if (!texts) return [];
      return [[`mcp__${manifest.name}__${tool}`, { label: (input: Record<string, unknown>) => fill(texts.label, input), ...(texts.phrase ? { phrase: texts.phrase } : {}) }]];
    }),
  );
}

/** The extension an installed one makes: its server started through the launcher, its rules from its manifest. */
function externalExtension(installed: InstalledExtension, manifest: ExternalManifest): Extension {
  return {
    name: manifest.name,
    plugin: installed.dir,
    external: true,
    async contribute() {
      const servers: Record<string, McpServerConfig> = manifest.server
        ? {
            [manifest.name]: {
              type: "stdio",
              command: process.execPath,
              args: [extensionLauncherPath(), path.join(installed.dir, manifest.server.entry), JSON.stringify(manifest.server.env ?? [])],
            },
          }
        : {};
      return {
        mcpServers: servers,
        readOnlyTools: manifest.readOnlyTools.map((tool) => `mcp__${manifest.name}__${tool}`),
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
  if (manifest.server) {
    const entry = path.join(installed.dir, manifest.server.entry);
    if (!(await stat(entry).catch(() => null))?.isFile()) return `has no server at ${manifest.server.entry}`;
  }
  return manifest;
}

const exec = promisify(execFile);

/** Whether `source` names a git repository rather than a folder. */
export function isGitSource(source: string): boolean {
  return /^(https?:\/\/|git@|ssh:\/\/|git:\/\/|file:\/\/|github:)/.test(source) || /\.git(#.*)?$/.test(source);
}

/**
 * Installs an extension into a scope from a folder or a git repository (`url#ref`, and `subdir`
 * for one inside it): copies its files (never runs a script), checks its manifest, and locks it,
 * enabled. An extension with the same name in that scope is replaced.
 */
export async function addExtension(source: string, scopeDir: string, options: { subdir?: string } = {}): Promise<{ name: string; replaced: boolean; commit?: string }> {
  let from = path.resolve(source);
  let commit: string | undefined;
  let clone: string | undefined;
  if (isGitSource(source)) {
    const [url, ref] = source.replace(/^github:/, "https://github.com/").split("#") as [string, string | undefined];
    clone = await mkdtemp(path.join(os.tmpdir(), "agent-kit-extension-"));
    await exec("git", ["clone", "--depth", "1", ...(ref ? ["--branch", ref] : []), url, clone]);
    commit = (await exec("git", ["-C", clone, "rev-parse", "HEAD"])).stdout.trim();
    from = clone;
  }
  try {
    if (options.subdir) from = path.join(from, options.subdir);
    const manifest = await readExternalManifest(from);
    if (manifest.server && !(await stat(path.join(from, manifest.server.entry)).catch(() => null))?.isFile()) {
      throw new Error(`${manifest.name}'s manifest names a server at ${manifest.server.entry}, which isn't there.`);
    }
    const target = path.join(scopeDir, manifest.name);
    const lock = await readLock(scopeDir);
    const replaced = Boolean(lock[manifest.name]);
    await rm(target, { recursive: true, force: true });
    await mkdir(scopeDir, { recursive: true });
    await cp(from, target, { recursive: true, filter: (file) => path.basename(file) !== ".git" });
    lock[manifest.name] = {
      source: isGitSource(source) ? `${source}${options.subdir ? ` (${options.subdir})` : ""}` : from,
      ...(commit ? { commit } : {}),
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

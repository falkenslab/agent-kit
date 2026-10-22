import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, stat, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { capabilitiesProblem, parseCapabilities, parseDescriptions, providedBy, type Extension, type ExtensionCapability } from "./extensions.js";
import type { Language } from "./language.js";
import { getLanguage, type ToolPhrase } from "./messages/index.js";
import { truncate, type ToolLabels } from "./toolLabels.js";
import { agentKitVersion } from "./version.js";
import { outsideArchive } from "./packaged.js";
import { extensionSecretsPath, fillOptions, missingOptions, optionsNamed, parseOptionValue, parseUserConfig, readOptionValues, removeSecrets, storeOptionValues, type ExtensionOption, type OptionValue } from "./extensionOptions.js";
import { isTrusted } from "./workspaceTrust.js";
import { checkRequirements, describeMissing, findOnPath, parseRequirements, requirementsProblem, type ExtensionRequirement } from "./extensionRequirements.js";
import { cachedPackageDir, cachedPackageProblem, cachePackage, npxServer, packageCacheDir, packageSpec, type CachedPackage } from "./npxPackages.js";

/**
 * External extensions (ADR-025, #37): installed into an agent, for all its projects (the
 * agent's scope) or for one (the project's, which wins), from a folder or a git repository.
 * Each scope is a folder of extensions, one per subfolder, with a lock (`extensions.lock.json`)
 * that records where each came from, a SHA-256 over its files and whether it's enabled. An
 * extension is a Claude Code plugin as it is (#38): its MCP servers come from its `.mcp.json`,
 * and the kit starts each with Node (an `npx` one from its package cache, #54) through a launcher that leaves it only the system's
 * variables and its own `env`. The `metadata["agent-kit"]` of its `plugin.json` is optional: it adds
 * what the kit's gates and chat can use (capabilities, read-only tools, labels, help). Each has a
 * data folder of its own (`${CLAUDE_PLUGIN_DATA}`, as Claude Code gives a plugin), kept across
 * sessions and updates; one being developed is linked rather than copied (#52).
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
/** A server the kit starts on this computer, through its launcher. */
export interface LocalServer {
  command: string;
  args?: string[];
  /** Its variables: a value may take the agent's with `${VAR}`, and its folders with `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`. */
  env?: Record<string, string>;
}

/**
 * A remote server (#61), over HTTP or SSE: nothing runs here. `${user_config.KEY}` and `${VAR}` in
 * its URL and headers take their values when the session opens.
 */
export interface RemoteServer {
  type: "http" | "sse";
  url: string;
  headers?: Record<string, string>;
}

/** One of an extension's MCP servers, as its `.mcp.json` declares it. */
export type PluginServer = LocalServer | RemoteServer;

/** Whether a server is remote (#61). */
export function isRemoteServer(server: PluginServer): server is RemoteServer {
  return "url" in server;
}

/**
 * The name a session gives an extension's remote server: its own, prefixed with the extension's.
 * The SDK's CLI keeps OAuth tokens by server name (confirmed empirically, CLI 2.1.300): a server
 * named like one in the runner's own Claude Code would sign in with the runner's token.
 */
export function remoteServerName(extension: string, server: string): string {
  return `${extension}-${server}`;
}

/** The hosts an extension's remote servers talk to, for the person to read before installing it. */
export function remoteHosts(manifest: Pick<ExternalManifest, "servers">): string[] {
  return [
    ...new Set(
      Object.values(manifest.servers).flatMap((server) => {
        if (!isRemoteServer(server)) return [];
        try {
          return [new URL(server.url.replace(/\$\{[^}]*\}/g, "x")).host];
        } catch {
          return [server.url];
        }
      }),
    ),
  ];
}

/** How the chat shows one of its tools in one language: `{field}` takes the call's input. */
export interface ExternalToolLabel {
  label: string;
  phrase?: ToolPhrase;
  /** The line under the call when it succeeded, instead of its result's first line, written for the model (#79). */
  result?: string;
}

/** Who made an extension, as Claude Code's `plugin.json` has it. */
export interface ExtensionAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * An external extension's manifest: its `plugin.json`, the plugin's own metadata (Claude Code's
 * fields, which its validator checks) and the kit's data (`metadata["agent-kit"]`, which it doesn't read).
 */
export interface ExternalManifest {
  name: string;
  /** Its description in English: `plugin.json`'s, which Claude Code reads. */
  description: string;
  /** Its description in other languages (#67), from `metadata["agent-kit"].description`. */
  descriptions: Partial<Record<Language, string>>;
  version?: string;
  author?: ExtensionAuthor;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  /** What it lets the agent use: its `provides` and its capabilities' ids. */
  provides: string[];
  requires: string[];
  /** What it lets the agent do, described for the person (#62): skills and tools together. */
  capabilities: ExtensionCapability[];
  /** The agent-kit versions it works with, e.g. `">=0.19.0 <0.21.0"`. */
  kit?: string;
  /**
   * Programs it needs on this computer (#63): checked when it loads, never installed. Without one
   * the whole extension needs, it's off; without one only some capabilities need, those are.
   */
  requirements: ExtensionRequirement[];
  /** Its MCP servers, by name (`mcp__<name>__<tool>`), from the plugin's `.mcp.json` or `plugin.json`. */
  servers: Record<string, PluginServer>;
  /**
   * Its tools that only read (short names, of any of its servers): plan mode lets them through.
   * Without the key, plan mode asks its servers which (their tools' `readOnlyHint`); with it, the
   * list is the whole answer, even empty.
   */
  readOnlyTools?: string[];
  /**
   * Its tools that always ask the person in guided mode (short names), on every call and even
   * inside a batch they approved, never offering "this session" or "always" (#76, #78): what
   * creates, edits or publishes in their account. Without the key, its servers' `destructiveHint` says which.
   */
  confirmTools?: string[];
  /**
   * Its tools whose server asks the person itself before acting, through MCP elicitation (short
   * names, #77): guided mode doesn't ask too while the person can be asked, so it's one question.
   */
  serverConfirmTools?: string[];
  /** Its tools' chat labels, by short name (of any of its servers) and language (English when the kit's isn't there). */
  labels: Record<string, Partial<Record<Language, ExternalToolLabel>>>;
  /** What it says about itself in a session, for the agent to tell the person (`SessionFacts`). */
  help?: string;
  /** Its options (`userConfig`, as Claude Code declares them, #55): its servers take them as `${user_config.KEY}`. */
  userConfig: Record<string, ExtensionOption>;
  /** How a catalog shows it (#59): its `logo` (square) and `banner` (wide), paths inside its folder, as its manifest gives them. */
  catalog?: { logo?: string; banner?: string };
}

/** One extension in a scope's lock. */
export interface LockEntry {
  /** Where it came from: a folder, or a git URL (with `#ref` when given). A linked one runs from there. */
  source: string;
  /**
   * Linked rather than copied (`extension add --link`), to develop it: it runs from its folder,
   * whose files aren't checked, so a rebuild takes effect when its server starts again.
   */
  linked?: boolean;
  /** The commit it was cloned at, for a git source. */
  commit?: string;
  /** The folder inside its source it was installed from (a git repository's subfolder). */
  subdir?: string;
  /**
   * Its code is in the agent's store (`<agent scope>/.store/<name>/<hash>/`), not in its scope's
   * folder (#57): a project's scope keeps only its lock, so a workspace shared with others carries
   * what it uses and at which version, never the code itself (`restoreExtensions()` gets it).
   */
  stored?: boolean;
  /** The marketplace it was installed from (`<name>@<marketplace>`), if any. */
  marketplace?: string;
  /** SHA-256 over its files, checked when it loads; empty for a linked one. */
  sha256: string;
  /** Its options' non-sensitive values (#55); the sensitive ones are in the scope's `.secrets/`. */
  options?: Record<string, OptionValue>;
  /** The npm packages its servers run with npx (#54), by `<package>@<version>`: in the agent's package cache, checked when it loads. */
  packages?: Record<string, CachedPackage>;
  /** What the person said about its tools in guided mode (#74, #76): kept answers, or the gate off for it. */
  confirm?: ExtensionConfirm;
  enabled: boolean;
  /** When it was installed, ISO 8601 in UTC. */
  installed: string;
}

export const LOCK_FILE = "extensions.lock.json";

/**
 * An installed extension's data folder: `${CLAUDE_PLUGIN_DATA}` in its servers' arguments and
 * variables (a browser profile, a cache), in its scope, outside its plugin and its hash, so it's
 * kept across sessions and updates. Created when a session starts it; removing the extension
 * asks before deleting it.
 */
export function extensionDataDir(scopeDir: string, name: string): string {
  return path.join(scopeDir, ".data", name);
}

/**
 * Where a scope keeps what's the person's, not the workspace's: its extensions' data and secrets
 * (#57). The agent's scope, its own folder; a project's, a folder of its own in the agent's
 * (`<agent scope>/.projects/<project>-<hash>/`), so nothing private travels with a project. An
 * agent without a scope of its own keeps it in the project's.
 */
export function scopePrivateDir(dirs: ExtensionDirs, scope: ExtensionScope): string | undefined {
  const scopeDir = dirs[scope];
  if (!scopeDir) return undefined;
  if (scope === "agent" || !dirs.agent) return scopeDir;
  const resolved = path.resolve(scopeDir);
  const key = createHash("sha256").update(resolved.toLowerCase()).digest("hex").slice(0, 12);
  return path.join(dirs.agent, ".projects", `${path.basename(path.dirname(resolved)) || "project"}-${key}`);
}

/** The agent's store of extensions' code, by content (#57): where a project's scope keeps its extensions' code. */
export function codeStoreDir(dirs: ExtensionDirs): string | undefined {
  return dirs.agent ? path.join(dirs.agent, ".store") : undefined;
}

/** Where a stored extension's code is: by its name and its files' hash. */
export function storedCodeDir(store: string, name: string, sha256: string): string {
  return path.join(store, name, sha256.slice(0, 16));
}

/**
 * How an install into `scope` is done: its npx packages into the agent's cache, and a project's
 * code into the agent's store when the agent has a scope of its own.
 */
export function installTarget(dirs: ExtensionDirs, scope: ExtensionScope): { packages?: string; store?: string } {
  const packages = packageCacheDir(dirs);
  const store = scope === "project" ? codeStoreDir(dirs) : undefined;
  return { ...(packages ? { packages } : {}), ...(store ? { store } : {}) };
}

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
  // The kit's data, where Claude Code keeps a plugin's own (`metadata`, which it doesn't read): a
  // top-level key would fail `claude plugin validate --strict` (#55).
  const kit = ((raw.metadata as Record<string, unknown> | undefined)?.["agent-kit"] ?? {}) as Partial<ExternalManifest>;
  const text = (key: string): Record<string, string> => (typeof raw[key] === "string" ? { [key]: raw[key] as string } : {});
  const author = raw.author as Partial<ExtensionAuthor> | undefined;
  // `repository` may be a URL or `{ url }`, as in package.json.
  const repository = typeof raw.repository === "string" ? raw.repository : (raw.repository as { url?: unknown } | undefined)?.url;
  const capabilities = parseCapabilities((kit as { capabilities?: unknown }).capabilities);
  return {
    name,
    description: typeof raw.description === "string" ? raw.description : "",
    descriptions: parseDescriptions((kit as { description?: unknown }).description),
    ...text("version"),
    ...(author && typeof author === "object" && typeof author.name === "string"
      ? { author: { name: author.name, ...(author.email ? { email: author.email } : {}), ...(author.url ? { url: author.url } : {}) } }
      : {}),
    ...text("homepage"),
    ...(typeof repository === "string" ? { repository } : {}),
    ...text("license"),
    ...(Array.isArray(raw.keywords) ? { keywords: raw.keywords.filter((keyword): keyword is string => typeof keyword === "string") } : {}),
    provides: providedBy(kit.provides, capabilities),
    requires: kit.requires ?? [],
    capabilities,
    ...(kit.kit ? { kit: kit.kit } : {}),
    requirements: parseRequirements((kit as { requirements?: unknown }).requirements),
    servers: await pluginServers(dir, raw),
    ...(Array.isArray(kit.readOnlyTools) ? { readOnlyTools: kit.readOnlyTools.filter((tool): tool is string => typeof tool === "string") } : {}),
    ...(Array.isArray(kit.confirmTools) ? { confirmTools: kit.confirmTools.filter((tool): tool is string => typeof tool === "string") } : {}),
    ...(Array.isArray(kit.serverConfirmTools) ? { serverConfirmTools: kit.serverConfirmTools.filter((tool): tool is string => typeof tool === "string") } : {}),
    labels: kit.labels ?? {},
    ...(kit.help ? { help: kit.help } : {}),
    userConfig: parseUserConfig(raw.userConfig),
    ...catalogLook((kit as { catalog?: unknown }).catalog),
  };
}

/** A manifest's `catalog` (#59): only its `logo` and `banner`, when they're paths. */
function catalogLook(raw: unknown): { catalog?: { logo?: string; banner?: string } } {
  if (!raw || typeof raw !== "object") return {};
  const { logo, banner } = raw as { logo?: unknown; banner?: unknown };
  const look = { ...(typeof logo === "string" ? { logo } : {}), ...(typeof banner === "string" ? { banner } : {}) };
  return Object.keys(look).length ? { catalog: look } : {};
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
  for (const [name, server] of Object.entries(declared as Record<string, Record<string, unknown>>)) {
    if (server && (server.type === "http" || server.type === "sse")) {
      if (typeof server.url !== "string") throw new Error(`its MCP server "${name}" has no url.`);
      const headers = server.headers && typeof server.headers === "object" ? Object.fromEntries(Object.entries(server.headers as Record<string, unknown>).map(([key, value]) => [key, String(value)])) : undefined;
      servers[name] = { type: server.type, url: server.url, ...(headers ? { headers } : {}) };
      continue;
    }
    if (!server || typeof server.command !== "string") throw new Error(`its MCP server "${name}" has no command.`);
    servers[name] = {
      command: server.command,
      ...(Array.isArray(server.args) ? { args: server.args.map(String) } : {}),
      ...(server.env ? { env: server.env as Record<string, string> } : {}),
    };
  }
  return servers;
}

/** An extension's own folders, as its servers' values name them. */
interface PluginFolders {
  /** `${CLAUDE_PLUGIN_ROOT}`: its plugin. */
  root: string;
  /** `${CLAUDE_PLUGIN_DATA}`: its data folder. */
  data: string;
}

/** `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` and `${VAR}` (the agent's variable) in a server's values. */
function expand(value: string, folders: PluginFolders): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name: string) =>
    name === "CLAUDE_PLUGIN_ROOT" ? folders.root : name === "CLAUDE_PLUGIN_DATA" ? folders.data : (process.env[name] ?? ""),
  );
}

/** The packages an extension's npx servers run, as its lock has them, and the cache they're in (#54). */
interface ServerPackages {
  cache?: string;
  locked?: Record<string, CachedPackage>;
}

/**
 * Why one of an extension's servers can't run through the launcher (Node, its script first,
 * inside the extension; or npx with a package at an exact version, from the cache), or how the
 * kit starts it.
 */
function serverLaunch(name: string, server: LocalServer, folders: PluginFolders, packages: ServerPackages = {}): string | { entry: string; args: string[]; env: Record<string, string> } {
  const { root } = folders;
  // Its folders as variables too, as Claude Code gives them to a plugin's servers.
  const declared = Object.fromEntries(Object.entries(server.env ?? {}).map(([key, value]) => [key, expand(String(value), folders)]));
  const env = { CLAUDE_PLUGIN_ROOT: root, CLAUDE_PLUGIN_DATA: folders.data, ...declared };
  const npx = npxServer(server);
  if (typeof npx === "string") return `${npx} (its server "${name}")`;
  if (npx) {
    const locked = packages.locked?.[packageSpec(npx)];
    if (!packages.cache || !locked) return `runs ${packageSpec(npx)}, which wasn't fetched when it was installed: install it again`;
    const entry = path.join(cachedPackageDir(packages.cache, npx.name, npx.version), locked.bin);
    return { entry, args: npx.args.map((arg) => expand(arg, folders)), env };
  }
  if (!/^node(\.exe)?$/i.test(path.basename(server.command))) return `runs its server "${name}" with "${server.command}": only Node servers, or npx with a package's exact version, can be installed`;
  const [script, ...args] = (server.args ?? []).map((arg) => expand(arg, folders));
  if (!script) return `gives its server "${name}" no script to run`;
  const entry = path.resolve(root, script);
  if (path.relative(root, entry).startsWith("..")) return `runs its server "${name}" from outside its folder (${script})`;
  return { entry, args, env };
}

/**
 * Why an extension's servers can't run, or nothing: each Node with its script there, or npx with
 * a package at an exact version (in the cache, once `packages` is given: when it loads).
 */
async function serversProblem(manifest: ExternalManifest, root: string, packages?: ServerPackages): Promise<string | undefined> {
  for (const [name, server] of Object.entries(manifest.servers)) {
    if (isRemoteServer(server)) {
      // Never in clear over the network: plain HTTP only to this computer (a server under development).
      if (!/^https:\/\//i.test(server.url) && !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(server.url)) return `talks to its server "${name}" at ${server.url}: a remote server must be https (http only on localhost)`;
      continue;
    }
    const npx = npxServer(server);
    if (typeof npx === "string") return `${npx} (its server "${name}")`;
    if (npx) {
      const problem = packages && (await cachedPackageProblem(packages.cache, npx, packages.locked?.[packageSpec(npx)]));
      if (problem) return problem;
      continue;
    }
    const launch = serverLaunch(name, server, { root, data: "" });
    if (typeof launch === "string") return launch;
    if (!(await stat(launch.entry).catch(() => null))?.isFile()) return `has no script at ${path.relative(root, launch.entry)} for its server "${name}"`;
  }
  return undefined;
}

/** Fetches the packages an extension's npx servers run into the cache (#54), as its lock records them. */
async function fetchServerPackages(manifest: ExternalManifest, cache: string): Promise<Record<string, CachedPackage>> {
  const packages: Record<string, CachedPackage> = {};
  for (const server of Object.values(manifest.servers)) {
    if (isRemoteServer(server)) continue;
    const npx = npxServer(server);
    if (!npx || typeof npx === "string") continue;
    packages[packageSpec(npx)] = await cachePackage(cache, npx.name, npx.version);
  }
  return packages;
}

/** A text file's bytes with CRLF as LF (latin1 maps each byte to itself); a binary one's (a NUL byte in it) as they are. */
function withoutCarriageReturns(bytes: Buffer): Buffer {
  if (bytes.includes(0) || !bytes.includes(13)) return bytes;
  return Buffer.from(bytes.toString("latin1").replace(/\r\n/g, "\n"), "latin1");
}

/**
 * SHA-256 over an extension's files (their paths and contents, in order), `.git` aside. A text
 * file's line endings don't count (CRLF is taken as LF): git checks the same commit out with CRLF
 * on one computer and LF on another, and a workspace's lock must match on both (#57).
 */
export async function hashExtension(dir: string): Promise<string> {
  const hash = createHash("sha256");
  async function walk(relative: string): Promise<void> {
    const entries = (await readdir(path.join(dir, relative), { withFileTypes: true })).filter((entry) => entry.name !== ".git");
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile()) hash.update(`${child}\0`).update(withoutCarriageReturns(await readFile(path.join(dir, child)))).update("\0");
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
  /** Its scope's folder, where its lock is. */
  scopeDir: string;
  /** Its plugin: in its scope's folder, or where it is when it's linked. */
  dir: string;
  /** Its data folder (`${CLAUDE_PLUGIN_DATA}`), which may not exist yet: in its scope's private folder. */
  dataDir: string;
  /** Its scope's private folder (`scopePrivateDir()`): its data and secrets. */
  privateDir: string;
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
    const privateDir = scopePrivateDir(dirs, scope)!;
    const store = codeStoreDir(dirs);
    for (const [name, lock] of Object.entries(await readLock(scopeDir))) {
      const dir = lock.linked ? lock.source : lock.stored && store ? storedCodeDir(store, name, lock.sha256) : path.join(scopeDir, name);
      const manifest = await readExternalManifest(dir).catch(() => undefined);
      installed.push({ name, scope, scopeDir, dir, dataDir: extensionDataDir(privateDir, name), privateDir, lock, shadowed: installed.some((other) => other.name === name), ...(manifest ? { manifest } : {}) });
    }
  }
  return installed;
}

/** The launcher that starts an external extension's server with a clean environment. */
export function extensionLauncherPath(): string {
  // Node runs it as another process: outside the archive when packaged (#42).
  return outsideArchive(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "assets", "extension-launcher.mjs"));
}

/** Its tools' chat labels in the kit's language, from its manifest: `{field}` takes the input; for each of its servers, by their session names. */
function manifestToolLabels(manifest: ExternalManifest, sessionServers: readonly string[]): ToolLabels {
  const language = getLanguage();
  const fill = (template: string, input: Record<string, unknown>): string =>
    template.replace(/\{(\w+)\}/g, (_, field: string) => (input[field] === undefined ? "" : truncate(String(input[field]), 60)));
  return Object.fromEntries(
    Object.entries(manifest.labels).flatMap(([tool, byLanguage]) => {
      const texts = byLanguage[language] ?? byLanguage.en;
      if (!texts) return [];
      const label = {
        label: (input: Record<string, unknown>) => fill(texts.label, input),
        ...(texts.phrase ? { phrase: texts.phrase } : {}),
        // In the person's language when it succeeded; a failure keeps its own line (#79).
        ...(texts.result ? { result: (result: { isError: boolean }) => (result.isError ? undefined : texts.result) } : {}),
      };
      return sessionServers.map((server) => [`mcp__${server}__${tool}`, label]);
    }),
  );
}

/** The extension an installed one makes: its servers started through the launcher, its rules from its manifest. */
function externalExtension(installed: InstalledExtension, manifest: ExternalManifest, cache: string | undefined, unavailable: UnavailableCapabilities[] = []): Extension {
  return {
    name: manifest.name,
    plugin: installed.dir,
    external: true,
    installedIn: installed.scopeDir,
    ...(unavailable.length ? { unavailable } : {}),
    async contribute() {
      const servers: Record<string, McpServerConfig> = {};
      const remote: string[] = [];
      if (Object.keys(manifest.servers).length) await mkdir(installed.dataDir, { recursive: true });
      const folders = { root: installed.dir, data: installed.dataDir };
      // A remote server's options go into its URL and headers here, when the session opens: the
      // SDK fixes them then, so a changed value takes opening the session again (#61).
      const values = Object.values(manifest.servers).some(isRemoteServer) ? await readOptionValues(installed.privateDir, installed.name, manifest.userConfig, installed.lock.options) : {};
      for (const [name, server] of Object.entries(manifest.servers)) {
        if (isRemoteServer(server)) {
          const fill = (text: string) => fillOptions(expand(text, folders), values);
          // A header naming an option without a value isn't sent: `Authorization: Bearer ` would
          // turn the server's OAuth off ("OAuth fallback is disabled when headers.Authorization is
          // set", confirmed empirically, CLI 2.1.300), so a token stays optional beside signing in.
          const unset = (text: string) => optionsNamed([text]).some((key) => values[key] === undefined || values[key] === "");
          const headers = Object.entries(server.headers ?? {}).filter(([, value]) => !unset(value));
          const sessionName = remoteServerName(manifest.name, name);
          servers[sessionName] = { type: server.type, url: fill(server.url), ...(headers.length ? { headers: Object.fromEntries(headers.map(([key, value]) => [key, fill(value)])) } : {}) };
          remote.push(sessionName);
          continue;
        }
        const launch = serverLaunch(name, server, folders, { cache, locked: installed.lock.packages });
        if (typeof launch === "string") continue; // checked when it loaded
        // Its `env` reaches it (the SDK merges it with the agent's); the launcher removes the rest.
        // Inside Electron, process.execPath is the app itself: ELECTRON_RUN_AS_NODE makes it run
        // the launcher as Node (the launcher removes it, with the rest, once it runs).
        const env = process.versions.electron ? { ...launch.env, ELECTRON_RUN_AS_NODE: "1" } : launch.env;
        // The launcher's own spec: the variables it keeps, and where its options' values are, read
        // when it starts the server, so a changed value reaches a server started again (#55).
        const spec = {
          keep: Object.keys(launch.env),
          ...(Object.keys(manifest.userConfig).length
            ? { options: { lock: path.join(installed.scopeDir, LOCK_FILE), secrets: extensionSecretsPath(installed.privateDir, installed.name), name: installed.name, defaults: optionDefaults(manifest.userConfig) } }
            : {}),
        };
        servers[name] = { type: "stdio", command: process.execPath, args: [extensionLauncherPath(), launch.entry, JSON.stringify(spec), ...launch.args], env };
      }
      return {
        mcpServers: servers,
        // Its manifest's list, or its servers' own word: the server is the code the kit trusts
        // least, so its hints only fill the list's absence (ADR-025).
        ...(manifest.readOnlyTools
          ? { readOnlyTools: Object.keys(servers).flatMap((server) => manifest.readOnlyTools!.map((tool) => `mcp__${server}__${tool}`)) }
          : { readOnlyTools: [], readOnlyHintServers: Object.keys(servers) }),
        // The same for what always asks in guided mode (#76): the list, or the servers' destructiveHint.
        ...(manifest.confirmTools
          ? { confirmTools: Object.keys(servers).flatMap((server) => manifest.confirmTools!.map((tool) => `mcp__${server}__${tool}`)) }
          : { confirmHintServers: Object.keys(servers) }),
        // And those whose server asks the person itself (#77).
        ...(manifest.serverConfirmTools ? { serverConfirmTools: Object.keys(servers).flatMap((server) => manifest.serverConfirmTools!.map((tool) => `mcp__${server}__${tool}`)) } : {}),
        toolLabels: manifestToolLabels(manifest, Object.keys(servers)),
        ...(remote.length ? { remoteServers: remote } : {}),
        ...(manifest.help ? { helpLines: [manifest.help] } : {}),
      };
    },
  };
}

/** Its options' defaults, for the launcher. */
function optionDefaults(declared: Record<string, ExtensionOption>): Record<string, OptionValue> {
  return Object.fromEntries(Object.entries(declared).flatMap(([key, option]) => (option.default === undefined ? [] : [[key, option.default]])));
}

/** Why its options keep it from running (a server naming one it doesn't declare, a required one without a value), or nothing. */
function optionsProblem(manifest: ExternalManifest, values: Record<string, OptionValue>): string | undefined {
  const named = optionsNamed(
    Object.values(manifest.servers).flatMap((server) =>
      isRemoteServer(server) ? [server.url, ...Object.values(server.headers ?? {})] : [server.command, ...(server.args ?? []), ...Object.values(server.env ?? {}).map(String)],
    ),
  );
  const undeclared = named.filter((key) => !manifest.userConfig[key]);
  if (undeclared.length) return `names ${undeclared.map((key) => "${user_config." + key + "}").join(", ")}, which its userConfig doesn't declare`;
  const missing = missingOptions(manifest.userConfig, values);
  if (missing.length) return `needs ${missing.map((key) => `${key} (${manifest.userConfig[key]!.title})`).join(", ")} set: \`extension config ${manifest.name} ${missing[0]}=<value>\``;
  return undefined;
}

/** The installed extensions a session runs with, and those it can't (with why). Disabled ones are neither. */
export async function loadExternalExtensions(dirs: ExtensionDirs): Promise<{ extensions: Extension[]; off: { name: string; reason: string }[]; untrusted: InstalledExtension[] }> {
  const extensions: Extension[] = [];
  const off: { name: string; reason: string }[] = [];
  const untrusted: InstalledExtension[] = [];
  const cache = packageCacheDir(dirs);
  for (const installed of await listInstalled(dirs)) {
    if (installed.shadowed || !installed.lock.enabled) continue;
    // A workspace's own: only once the person trusts it there (#57); the agent's never asks.
    if (installed.scope === "project" && dirs.agent && !(await isTrusted(dirs.agent, installed.scopeDir, installed.name, installed.lock))) {
      untrusted.push(installed);
      off.push({ name: installed.name, reason: "comes with this workspace and isn't trusted here yet: `extension trust`, or the chat asks" });
      continue;
    }
    const reason = await problem(installed, cache);
    if (typeof reason === "string") off.push({ name: installed.name, reason });
    else extensions.push(externalExtension(installed, reason.manifest, cache, reason.unavailable));
  }
  return { extensions, off, untrusted };
}

/** Why an installed extension can't load, or its manifest when it can. */
/** Whether a program is on the `PATH`, as a shell would find it (with `PATHEXT`'s extensions on Windows). */
export async function onPath(program: string, env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  return (await findOnPath(program, env)) !== undefined;
}

/** A requirement this computer lacks, as the person reads it: what it is, what for, and how to install it. */
export function missingRequirement(check: Awaited<ReturnType<typeof checkRequirements>>[number]): string {
  const needed = check.requirement.for.length ? ` for ${check.requirement.for.join(", ")}` : "";
  return `needs ${describeMissing(check)}${needed}`;
}

/** What an installed extension can't do on this computer, and why: its capabilities whose requirements are missing (#63). */
export interface UnavailableCapabilities {
  capabilities: string[];
  reason: string;
}

async function problem(installed: InstalledExtension, cache: string | undefined): Promise<string | { manifest: ExternalManifest; unavailable: UnavailableCapabilities[] }> {
  let manifest: ExternalManifest;
  try {
    if (installed.lock.stored && !(await stat(installed.dir).catch(() => null))?.isDirectory()) return "isn't on this computer yet (its workspace says which version it uses): `extension restore` gets it";
    if (!installed.lock.linked && (await hashExtension(installed.dir)) !== installed.lock.sha256) return "has files that changed since it was installed: install it again to trust them";
    manifest = await readExternalManifest(installed.dir);
  } catch (error) {
    return `can't be read (${error instanceof Error ? error.message : String(error)})`;
  }
  if (manifest.name !== installed.name) return `is installed as "${installed.name}" but its manifest says "${manifest.name}"`;
  if (manifest.kit && !inKitRange(agentKitVersion(), manifest.kit)) return `works with agent-kit ${manifest.kit}, and this agent runs ${agentKitVersion()}`;
  const requirements = requirementsProblem(manifest.requirements, manifest.provides);
  if (requirements) return requirements;
  // A program the whole extension needs keeps it off; one only some capabilities need, those (#63).
  const checks = (await checkRequirements(manifest.requirements)).filter((check) => !check.ok);
  const whole = checks.filter((check) => !check.requirement.for.length);
  if (whole.length) return whole.map((check) => missingRequirement(check)).join("; ");
  const unavailable = checks.map((check) => ({ capabilities: check.requirement.for, reason: `needs ${describeMissing(check)}` }));
  const capabilities = await capabilitiesProblem(installed.dir, manifest.capabilities);
  if (capabilities) return capabilities;
  const options = optionsProblem(manifest, await readOptionValues(installed.privateDir, installed.name, manifest.userConfig, installed.lock.options));
  if (options) return options;
  return (await serversProblem(manifest, installed.dir, { cache, locked: installed.lock.packages })) ?? { manifest, unavailable };
}

const exec = promisify(execFile);

/** Whether `source` names a git repository rather than a folder. */
export function isGitSource(source: string): boolean {
  return /^(https?:\/\/|git@|ssh:\/\/|git:\/\/|file:\/\/|github:)/.test(source) || /\.git(#.*)?$/.test(source);
}

/**
 * Installs an extension into a scope from a folder or a git repository (`url#ref`, `sha` to pin
 * a commit, and `subdir` for one inside it): copies its files (never runs a script), checks its
 * manifest, and locks it, enabled, with the marketplace it came from when it did (`origin`, for a
 * temporary folder, is what the lock says it came from). An extension with the same name in that
 * scope is replaced; its data folder stays. With `link`, a folder is registered where it is
 * instead, to develop it: not copied, and its files not checked. The packages its npx servers
 * run are fetched into `packages` (#54), the agent's package cache (`packageCacheDir()`; by
 * default the scope's).
 */
export async function addExtension(
  source: string,
  scopeDir: string,
  options: { subdir?: string; sha?: string; marketplace?: string; origin?: string; link?: boolean; packages?: string; store?: string } = {},
): Promise<{ name: string; replaced: boolean; commit?: string; missing: string[]; remote: string[] }> {
  if (options.link && isGitSource(source)) throw new Error("Only a folder can be linked: a git repository is installed as a copy.");
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
    const servers = (await serversProblem(manifest, from)) ?? (await capabilitiesProblem(from, manifest.capabilities)) ?? requirementsProblem(manifest.requirements, manifest.provides);
    if (servers) throw new Error(`${manifest.name} can't be installed: it ${servers}.`);
    // What it needs and this computer lacks: said, never installed, and it installs anyway (#63).
    const missing = (await checkRequirements(manifest.requirements)).filter((check) => !check.ok).map((check) => missingRequirement(check));
    // Where what the agent sends goes, for the person to know (#61).
    const remote = remoteHosts(manifest);
    const target = path.join(scopeDir, manifest.name);
    // Replacing what's installed there would delete the source itself.
    if (path.resolve(from) === path.resolve(target)) throw new Error(`${from} is where ${manifest.name} is installed: install it from another folder.`);
    const packages = await fetchServerPackages(manifest, options.packages ?? path.join(scopeDir, ".npm"));
    const locked: Partial<LockEntry> = Object.keys(packages).length ? { packages } : {};
    const lock = await readLock(scopeDir);
    const replaced = Boolean(lock[manifest.name]);
    // Reinstalled, it keeps the values it had for the options it still declares, as it keeps its data.
    const kept = Object.fromEntries(Object.entries(lock[manifest.name]?.options ?? {}).filter(([key]) => manifest.userConfig[key] && !manifest.userConfig[key]!.sensitive));
    if (Object.keys(kept).length) locked.options = kept;
    // And what the person said about its tools in guided mode (#76): theirs, not the version's.
    if (lock[manifest.name]?.confirm) locked.confirm = lock[manifest.name]!.confirm;
    await rm(target, { recursive: true, force: true });
    await mkdir(scopeDir, { recursive: true });
    const origin = options.origin ?? (isGitSource(source) ? source : from);
    const provenance = { ...(commit ? { commit } : {}), ...(options.subdir ? { subdir: options.subdir } : {}), ...(options.marketplace ? { marketplace: options.marketplace } : {}) };
    if (options.store && !options.link) {
      // By content, in the agent's store: two workspaces with the same version share one copy.
      const sha256 = await hashExtension(from);
      const stored = storedCodeDir(options.store, manifest.name, sha256);
      if (!(await stat(stored).catch(() => null))?.isDirectory() || (await hashExtension(stored)) !== sha256) {
        await rm(stored, { recursive: true, force: true });
        await cp(from, stored, { recursive: true, filter: (file) => path.basename(file) !== ".git" });
      }
      lock[manifest.name] = { source: origin, ...provenance, sha256, stored: true, ...locked, enabled: true, installed: new Date().toISOString() };
      await writeLock(scopeDir, lock);
      return { name: manifest.name, replaced, missing, remote, ...(commit ? { commit } : {}) };
    }
    if (options.link) {
      lock[manifest.name] = { source: from, linked: true, sha256: "", ...locked, enabled: true, installed: new Date().toISOString() };
      await writeLock(scopeDir, lock);
      return { name: manifest.name, replaced, missing, remote };
    }
    await cp(from, target, { recursive: true, filter: (file) => path.basename(file) !== ".git" });
    lock[manifest.name] = {
      source: origin,
      ...provenance,
      sha256: await hashExtension(target),
      ...locked,
      enabled: true,
      installed: new Date().toISOString(),
    };
    await writeLock(scopeDir, lock);
    return { name: manifest.name, replaced, missing, remote, ...(commit ? { commit } : {}) };
  } finally {
    if (clone) await rm(clone, { recursive: true, force: true });
  }
}

/**
 * Removes an extension from a scope (its files and its lock entry; a linked one's folder is left
 * where it is), and its data folder with `deleteData`; false when it wasn't there.
 */
export async function removeExtension(scopeDir: string, name: string, options: { deleteData?: boolean; privateDir?: string } = {}): Promise<boolean> {
  const privateDir = options.privateDir ?? scopeDir;
  const lock = await readLock(scopeDir);
  if (!lock[name]) return false;
  delete lock[name];
  await rm(path.join(scopeDir, name), { recursive: true, force: true });
  // A stored one's code stays in the store: another workspace may use the same version.
  if (options.deleteData) await rm(extensionDataDir(privateDir, name), { recursive: true, force: true });
  await removeSecrets(privateDir, name);
  await writeLock(scopeDir, lock);
  return true;
}

/** The size in bytes of the files under `dir` (0 when it doesn't exist). */
export async function folderSize(dir: string): Promise<number> {
  let size = 0;
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) size += await folderSize(full);
    else if (entry.isFile()) size += (await stat(full)).size;
  }
  return size;
}

/** A kept answer to guided mode's question about one of an extension's tools (#76). */
export type ToolConfirmation = "always" | "never";

/** What the person said about an extension's tools in guided mode (#74, #76), in its lock. */
export interface ExtensionConfirm {
  /** Its tools run without asking: the person trusts it. */
  off?: boolean;
  /** Their kept answers, by the tool's short name. */
  tools?: Record<string, ToolConfirmation>;
}

/**
 * Changes what's kept about an installed extension's tools in guided mode: `off` turns the gate
 * off (or back on) for it; `tool` keeps an answer for one tool (`undefined` asks again);
 * `reset` forgets every kept answer. False when it isn't installed there.
 */
export async function setExtensionConfirm(
  scopeDir: string,
  name: string,
  change: { off?: boolean; tool?: { name: string; answer: ToolConfirmation | undefined }; reset?: boolean },
): Promise<boolean> {
  const lock = await readLock(scopeDir);
  const entry = lock[name];
  if (!entry) return false;
  const confirm: ExtensionConfirm = { ...entry.confirm, tools: change.reset ? {} : { ...entry.confirm?.tools } };
  if (change.off !== undefined) confirm.off = change.off;
  if (change.tool) {
    if (change.tool.answer) confirm.tools![change.tool.name] = change.tool.answer;
    else delete confirm.tools![change.tool.name];
  }
  if (!confirm.off) delete confirm.off;
  if (!Object.keys(confirm.tools!).length) delete confirm.tools;
  lock[name] = { ...entry, ...(Object.keys(confirm).length ? { confirm } : {}) };
  if (!Object.keys(confirm).length) delete lock[name]!.confirm;
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

/**
 * Sets an installed extension's options (#55), each from what the person typed (`undefined`
 * clears it), checked against its `userConfig`: sensitive ones into the scope's secrets, the rest
 * into its lock. A running session's servers take them when they start again.
 */
export async function setExtensionOptions(where: string | InstalledExtension, name: string, typed: Record<string, string | undefined>): Promise<void> {
  // A scope's folder (the agent's, whose code and secrets are in it), or an installed one, which knows where they are.
  const scopeDir = typeof where === "string" ? where : where.scopeDir;
  const privateDir = typeof where === "string" ? where : where.privateDir;
  const lock = await readLock(scopeDir);
  const entry = lock[name];
  if (!entry) throw new Error(`${name} isn't installed in ${scopeDir}.`);
  const manifest = (typeof where === "string" ? undefined : where.manifest) ?? (await readExternalManifest(entry.linked ? entry.source : path.join(scopeDir, name)));
  const changes: Record<string, OptionValue | undefined> = {};
  for (const [key, text] of Object.entries(typed)) {
    const option = manifest.userConfig[key];
    if (!option) throw new Error(`${name} has no option "${key}"${Object.keys(manifest.userConfig).length ? `: it has ${Object.keys(manifest.userConfig).join(", ")}` : ""}.`);
    try {
      changes[key] = text === undefined ? undefined : parseOptionValue(option, text);
    } catch (error) {
      throw new Error(`${key}: ${error instanceof Error ? error.message : String(error)}.`, { cause: error });
    }
  }
  const options = await storeOptionValues(privateDir, name, manifest.userConfig, entry.options ?? {}, changes);
  lock[name] = { ...entry, options };
  if (!Object.keys(options).length) delete lock[name]!.options;
  await writeLock(scopeDir, lock);
}

/** One of an installed extension's options and its value now (a sensitive one's value is never given: only whether it's set). */
export interface ExtensionOptionState {
  key: string;
  option: ExtensionOption;
  /** Its value, when it has one and isn't sensitive. */
  value?: OptionValue;
  /** Whether it has a value (its own or its default). */
  set: boolean;
  /** Its value is its default, not one the person gave. */
  isDefault: boolean;
}

/** An installed extension's options, as they are now. */
export async function extensionOptionStates(installed: InstalledExtension): Promise<ExtensionOptionState[]> {
  const declared = installed.manifest?.userConfig ?? {};
  const values = await readOptionValues(installed.privateDir, installed.name, declared, installed.lock.options);
  const secrets = await readOptionValues(installed.privateDir, installed.name, Object.fromEntries(Object.entries(declared).map(([key, option]) => [key, { ...option, default: undefined }])), installed.lock.options);
  return Object.entries(declared).map(([key, option]) => {
    const value = values[key];
    const own = secrets[key];
    return { key, option, ...(value !== undefined && !option.sensitive ? { value } : {}), set: value !== undefined && value !== "", isDefault: value !== undefined && own === undefined };
  });
}

import { cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionDirs, PluginServer } from "./externalExtensions.js";
import { hashExtension } from "./externalExtensions.js";
import { fetchNpmPlugin } from "./pluginDownloads.js";

/**
 * Installed extensions' servers run with `npx` (#54): a `.mcp.json` that says
 * `npx -y <package>@<x.y.z>` runs as it is in Claude Code, and in the kit too, which doesn't run
 * npx (it needs npm, a `node` on the `PATH` for its shims, and the network while the server
 * connects). The kit fetches the package when the extension is installed, its `sha512` integrity
 * checked against the registry, into a cache by version shared by the agent's scopes; a session
 * runs its `bin` with the kit's own Node (Electron's in the desktop app) through the launcher,
 * as any installed server. Only an exact version: a published one never changes, so it's as
 * fixed as the lock's hash. The kit installs no dependencies and runs no script: the package
 * must bring what it needs (bundled, or `bundleDependencies`).
 */

/** A server run with npx: its package, the exact version, and the arguments after it (its own). */
export interface NpxServer {
  name: string;
  version: string;
  args: string[];
}

/** A cached package, as an extension's lock records it. */
export interface CachedPackage {
  /** The registry's `sha512-…`, checked when it was fetched. */
  integrity: string;
  /** SHA-256 over its files in the cache, checked when a session loads it. */
  sha256: string;
  /** Its server's script, relative to the package (its `package.json`'s `bin`). */
  bin: string;
}

/** `<package>@<version>`, as a lock names a package. */
export const packageSpec = (server: NpxServer): string => `${server.name}@${server.version}`;

/**
 * Whether a server runs with npx: `undefined` when it doesn't, why the kit can't run it when it
 * does but not as the kit can, or its package. Its command is `npx` (`npx.cmd`), its options
 * only `-y`/`--yes`, then `<package>@<x.y.z>` and the server's own arguments.
 */
export function npxServer(server: PluginServer): NpxServer | string | undefined {
  if (!/^npx(\.cmd|\.exe)?$/i.test(path.basename(server.command))) return undefined;
  const args = server.args ?? [];
  let index = 0;
  for (; index < args.length && args[index]!.startsWith("-"); index++) {
    if (args[index] !== "-y" && args[index] !== "--yes") return `uses the npx option "${args[index]}", and the kit runs only "npx -y <package>@<version>"`;
  }
  const spec = args[index];
  if (!spec) return "names no package for npx";
  const match = /^((?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*)@(\d+\.\d+\.\d+(?:-[\w.]+)?)$/i.exec(spec);
  if (!match) return `runs "${spec}" with npx without an exact version (<package>@x.y.z), which the kit needs to run the same code every time`;
  return { name: match[1]!, version: match[2]!, args: args.slice(index + 1) };
}

/** Where an agent keeps the packages its extensions' npx servers run: in its scope (the project's when it has none), shared by both. */
export function packageCacheDir(dirs: ExtensionDirs): string | undefined {
  const scope = dirs.agent ?? dirs.project;
  return scope ? path.join(scope, ".npm") : undefined;
}

/** A package's folder in the cache. */
export function cachedPackageDir(cache: string, name: string, version: string): string {
  return path.join(cache, ...name.split("/"), version);
}

interface PackageJson {
  bin?: string | Record<string, string>;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  bundleDependencies?: string[] | boolean;
  bundledDependencies?: string[] | boolean;
  scripts?: Record<string, string>;
}

/** Why a package can't run as the kit installs it (its dependencies, its scripts, its bin), or its server's script. */
async function packageBin(dir: string, name: string): Promise<{ bin: string } | { problem: string }> {
  let json: PackageJson;
  try {
    json = JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as PackageJson;
  } catch {
    return { problem: "has no readable package.json" };
  }
  const bundled = json.bundleDependencies ?? json.bundledDependencies;
  const declared = Object.keys({ ...json.dependencies, ...json.optionalDependencies });
  const missing = bundled === true ? [] : declared.filter((dependency) => !(Array.isArray(bundled) && bundled.includes(dependency)));
  if (missing.length) return { problem: `has dependencies it doesn't bring (${missing.join(", ")}): the kit installs none, so a package must bundle them, or list them in bundleDependencies` };
  const scripts = ["preinstall", "install", "postinstall"].filter((script) => json.scripts?.[script]);
  if (scripts.length) return { problem: `has install scripts (${scripts.join(", ")}), which the kit never runs` };
  if ((await stat(path.join(dir, "binding.gyp")).catch(() => null))?.isFile()) return { problem: "builds native code when installed (binding.gyp), which the kit never does" };
  const bins = typeof json.bin === "string" ? { [name.split("/").pop()!]: json.bin } : (json.bin ?? {});
  const entries = Object.values(bins);
  const bin = entries.length === 1 ? entries[0] : bins[name.split("/").pop()!];
  if (!bin) return { problem: entries.length ? `has several programs (bin), none named ${name.split("/").pop()}` : "has no program to run (bin in its package.json)" };
  const script = path.resolve(dir, bin);
  if (path.relative(dir, script).startsWith("..")) return { problem: `runs a program outside itself (${bin})` };
  if (!(await stat(script).catch(() => null))?.isFile()) return { problem: `has no file at ${bin}, its program` };
  return { bin: path.relative(dir, script).split(path.sep).join("/") };
}

/** What the cache keeps beside each package: what was checked when it was fetched. */
const recordOf = (dir: string): string => `${dir}.json`;

/**
 * A package in the cache, fetched when it isn't there (or its files changed since): its
 * integrity checked, refused when it can't run as the kit installs it. Never runs anything.
 */
export async function cachePackage(cache: string, name: string, version: string): Promise<CachedPackage> {
  const dir = cachedPackageDir(cache, name, version);
  const record = await readFile(recordOf(dir), "utf8").then((text) => JSON.parse(text) as CachedPackage, () => undefined);
  if (record && (await stat(dir).catch(() => null))?.isDirectory() && (await hashExtension(dir)) === record.sha256) return record;
  const fetched = await fetchNpmPlugin(name, version);
  try {
    const bin = await packageBin(fetched.dir, name);
    if ("problem" in bin) throw new Error(`${name}@${version} can't run in the kit: it ${bin.problem}.`);
    // Into its place whole: a session never sees half a package.
    await rm(dir, { recursive: true, force: true });
    await mkdir(path.dirname(dir), { recursive: true });
    // Another disk than the temporary folder's: copied instead.
    await rename(fetched.dir, dir).catch(() => cp(fetched.dir, dir, { recursive: true }));
    const cached: CachedPackage = { integrity: fetched.integrity, sha256: await hashExtension(dir), bin: bin.bin };
    await writeFile(recordOf(dir), `${JSON.stringify(cached, null, 2)}\n`, "utf8");
    return cached;
  } finally {
    await rm(fetched.dir, { recursive: true, force: true });
  }
}

/** Why a package an extension's lock names can't run from the cache now (missing, or changed), or nothing. */
export async function cachedPackageProblem(cache: string | undefined, server: NpxServer, locked: CachedPackage | undefined): Promise<string | undefined> {
  const spec = packageSpec(server);
  if (!cache || !locked) return `runs ${spec}, which wasn't fetched when it was installed: install it again`;
  const dir = cachedPackageDir(cache, server.name, server.version);
  if (!(await stat(dir).catch(() => null))?.isDirectory()) return `runs ${spec}, which isn't in the agent's package cache any more: install it again`;
  if ((await hashExtension(dir)) !== locked.sha256) return `runs ${spec}, whose files in the cache changed since it was installed: install it again to trust them`;
  return undefined;
}

/** Whether every package a lock names is in the cache as it was fetched (`<package>@<version>` keys). */
export async function cachedPackagesIntact(cache: string | undefined, locked: Record<string, CachedPackage> | undefined): Promise<boolean> {
  for (const [spec, cached] of Object.entries(locked ?? {})) {
    const at = spec.lastIndexOf("@");
    if (!cache || at <= 0) return false;
    const dir = cachedPackageDir(cache, spec.slice(0, at), spec.slice(at + 1));
    if (!(await stat(dir).catch(() => null))?.isDirectory() || (await hashExtension(dir)) !== cached.sha256) return false;
  }
  return true;
}

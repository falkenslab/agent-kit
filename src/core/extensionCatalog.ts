import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addExtension, remoteHosts, codeStoreDir, hashExtension, inKitRange, installTarget, isGitSource, listInstalled, readExternalManifest, readLock, storedCodeDir, type ExtensionDirs, type ExtensionScope, type InstalledExtension } from "./externalExtensions.js";
import { cachePackage, cachedPackageDir } from "./npxPackages.js";
import { trustWorkspace } from "./workspaceTrust.js";
import { describeCapability, describeInLanguage, type DescribedCapability } from "./extensions.js";
import { getLanguage } from "./messages/index.js";
import type { Language } from "./language.js";
import { addMarketplace, findPlugin, installFromMarketplace, listMarketplaces, resolvePluginSource, updateMarketplace, type KnownMarketplace, type MarketplacePlugin } from "./marketplaces.js";

/**
 * The agent's catalog of extensions (#56): what its known marketplaces offer, what's installed
 * from them and what has a newer version, and installing and updating from it. The kit's
 * command and the chats (terminal, web, desktop) share it, so a person without a shell can do
 * what `extension add`, `search` and `update` do.
 */

/** Where an agent keeps its marketplaces: with its extensions (the project's when it has no scope of its own). */
export function marketplacesDir(dirs: ExtensionDirs): string | undefined {
  return dirs.agent ?? dirs.project;
}

/**
 * The marketplaces the agent knows, its `official` one among them: added without asking the
 * first time, and a folder one copied afresh each time (it's the agent's own code).
 */
export async function knownMarketplaces(dirs: ExtensionDirs, official?: string): Promise<KnownMarketplace[]> {
  const dir = marketplacesDir(dirs);
  if (!dir) throw new Error("This agent has no folder for extensions.");
  // Calls at the same time share one look (a page asking for several images at once): two copies
  // of the same marketplace taken together would clash.
  const key = path.resolve(dir);
  const pending = looking.get(key);
  if (pending) return pending;
  const look = lookAt(dir, official).finally(() => looking.delete(key));
  looking.set(key, look);
  return look;
}

const looking = new Map<string, Promise<KnownMarketplace[]>>();

async function lookAt(dir: string, official: string | undefined): Promise<KnownMarketplace[]> {
  const known = await listMarketplaces(dir);
  if (official && !(isGitSource(official) && known.some((marketplace) => marketplace.official))) {
    await addMarketplace(official, dir, { official: true });
    return listMarketplaces(dir);
  }
  return known;
}

/** One extension a marketplace offers, and how it stands in the agent. */
export interface CatalogEntry {
  /** `<name>@<marketplace>`, what installs it. */
  spec: string;
  marketplace: string;
  /** From the agent's own marketplace: installed without a confirmation. */
  official: boolean;
  plugin: MarketplacePlugin;
  /** What it is, in the kit's language (#67): its own there, else the marketplace entry's, else its `plugin.json`'s, in English. */
  description: string;
  /** The version it offers: its `plugin.json`'s when the marketplace has its folder, else the marketplace's entry's. */
  version?: string;
  /** Installed (and used: not shadowed), from wherever it came. */
  installed?: InstalledExtension;
  /** Installed from this marketplace with an older version than it offers. */
  update: boolean;
  /** What it's about and who it's for (#59): its `plugin.json`'s `keywords` and its entry's `tags`, `keywords` and `category`, lowercased. */
  topics: string[];
  /** Its logo and banner (#59), as files of the marketplace's copy, when it has them. */
  logo?: string;
  banner?: string;
  /** What it lets the agent do (#62), in the kit's language: from its `plugin.json` when the marketplace has its folder. */
  capabilities: DescribedCapability[];
  /** The programs it needs on the computer (#63), by name ("Docker"), with the capabilities that need them (none: all of it). */
  requirements: { name: string; for: string[] }[];
  /** The hosts its remote servers talk to (#61): what the agent sends there leaves the computer. */
  remote: string[];
}

/** The images a catalog shows: these types only. */
const IMAGE = /\.(svg|png|jpe?g|webp)$/i;

/**
 * What a marketplace offers of a plugin, from its folder in the marketplace's copy when it has one:
 * the version (its `plugin.json` wins over the entry, as Claude Code computes it), its keywords,
 * and its look, an image inside its folder only.
 */
async function offered(
  marketplace: KnownMarketplace,
  plugin: MarketplacePlugin,
  language: Language,
): Promise<{ version?: string; keywords: string[]; logo?: string; banner?: string; capabilities: DescribedCapability[]; requirements: CatalogEntry["requirements"]; description: string; remote: string[] }> {
  try {
    const resolved = resolvePluginSource(marketplace, plugin);
    if ("source" in resolved && !isGitSource(resolved.source) && (await stat(resolved.source).catch(() => null))?.isDirectory()) {
      const manifest = await readExternalManifest(resolved.source).catch(() => undefined);
      const image = async (relative: string | undefined): Promise<string | undefined> => {
        if (!relative || !IMAGE.test(relative)) return undefined;
        const file = path.resolve(resolved.source, relative);
        if (path.relative(resolved.source, file).startsWith("..") || !(await stat(file).catch(() => null))?.isFile()) return undefined;
        return file;
      };
      const [logo, banner] = [await image(manifest?.catalog?.logo), await image(manifest?.catalog?.banner)];
      const version = manifest?.version ?? plugin.version;
      const capabilities = (manifest?.capabilities ?? []).map((capability) => describeCapability(capability, language));
      const requirements = (manifest?.requirements ?? []).map((requirement) => ({ name: requirement.name, for: requirement.for }));
      const description = describeInLanguage(plugin.description ?? manifest?.description ?? "", manifest?.descriptions, language);
      const remote = manifest ? remoteHosts(manifest) : [];
      return { ...(version ? { version } : {}), keywords: manifest?.keywords ?? [], ...(logo ? { logo } : {}), ...(banner ? { banner } : {}), capabilities, requirements, description, remote };
    }
  } catch {
    // A source the kit doesn't install: the entry's own fields.
  }
  return { ...(plugin.version ? { version: plugin.version } : {}), keywords: [], capabilities: [], requirements: [], description: plugin.description ?? "", remote: [] };
}

/** Whether `offered` is newer than `installed` (x.y.z); a version that can't be compared isn't. */
export function isNewer(offered: string | undefined, installed: string | undefined): boolean {
  if (!offered || !installed || !/^\d+\.\d+\.\d+/.test(offered) || !/^\d+\.\d+\.\d+/.test(installed)) return false;
  return inKitRange(offered, `>${installed.split("-")[0]}`);
}

/** Everything the known marketplaces offer, matching `words` (in its name, description, category, tags or keywords) when given; its texts in `language` (the kit's by default). */
export async function extensionCatalog(dirs: ExtensionDirs, options: { official?: string; words?: readonly string[]; topics?: readonly string[]; language?: Language } = {}): Promise<CatalogEntry[]> {
  const installed = (await listInstalled(dirs)).filter((extension) => !extension.shadowed);
  const words = (options.words ?? []).map((word) => word.toLowerCase());
  // What the agent offers its users (#59): only what has one of its topics.
  const wanted = options.topics?.length ? new Set(options.topics.map((topic) => topic.toLowerCase())) : undefined;
  const entries: CatalogEntry[] = [];
  for (const marketplace of await knownMarketplaces(dirs, options.official)) {
    for (const plugin of marketplace.manifest?.plugins ?? []) {
      const look = await offered(marketplace, plugin, options.language ?? getLanguage());
      const topics = [...new Set([...look.keywords, ...(plugin.tags ?? []), ...(plugin.keywords ?? []), ...(plugin.category ? [plugin.category] : [])].map((topic) => topic.toLowerCase()))];
      if (wanted && !topics.some((topic) => wanted.has(topic))) continue;
      // Its capabilities count too: a search for "grading" finds what grades.
      const text = [plugin.name, plugin.description, look.description, ...topics, ...look.capabilities.flatMap(({ id, label, description }) => [id, label, description])].join(" ").toLowerCase();
      if (!words.every((word) => text.includes(word))) continue;
      const version = look.version;
      const mine = installed.find((extension) => extension.name === plugin.name);
      const fromHere = mine?.lock.marketplace === `${plugin.name}@${marketplace.name}`;
      entries.push({
        spec: `${plugin.name}@${marketplace.name}`,
        description: look.description,
        marketplace: marketplace.name,
        official: marketplace.official,
        plugin,
        ...(version ? { version } : {}),
        ...(mine ? { installed: mine } : {}),
        update: Boolean(fromHere && isNewer(version, mine?.manifest?.version)),
        topics,
        ...(look.logo ? { logo: look.logo } : {}),
        ...(look.banner ? { banner: look.banner } : {}),
        capabilities: look.capabilities,
        requirements: look.requirements,
        remote: look.remote,
      });
    }
  }
  return entries;
}

/** Whether installing `spec` needs the person's confirmation first: a plugin of a marketplace that isn't the agent's own. */
export async function needsConfirmation(dirs: ExtensionDirs, spec: string, official?: string): Promise<{ marketplace: KnownMarketplace; plugin: MarketplacePlugin } | undefined> {
  await knownMarketplaces(dirs, official);
  const found = await findPlugin(marketplacesDir(dirs)!, spec);
  return found.marketplace.official ? undefined : found;
}

/**
 * Installs a plugin of a known marketplace (`<name>@<marketplace>`, or a name only one offers)
 * into a scope: the agent's by default (the project's when it has none), the packages its npx
 * servers run into the agent's cache. Asking the person first, for one that isn't the agent's
 * own (`needsConfirmation()`), is the caller's.
 */
export async function installExtension(
  dirs: ExtensionDirs,
  spec: string,
  options: { scope?: ExtensionScope; official?: string } = {},
): Promise<{ name: string; scope: ExtensionScope; replaced: boolean; marketplace: string; commit?: string; missing: string[]; remote: string[] }> {
  const scope = options.scope ?? (dirs.agent ? "agent" : "project");
  const scopeDir = dirs[scope];
  if (!scopeDir) throw new Error(`This agent has no ${scope} scope for extensions.`);
  await knownMarketplaces(dirs, options.official);
  const result = await installFromMarketplace(marketplacesDir(dirs)!, spec, scopeDir, installTarget(dirs, scope));
  // Installed into a workspace by the person: trusted there as it is (#57).
  if (scope === "project") await trustWorkspace(dirs, [result.name]);
  return { ...result, scope };
}

/**
 * Updates an installed extension from the marketplace it came from: a fresh copy of the
 * marketplace, then installed again in the same scope (its data and options kept). One that
 * didn't come from a marketplace is installed again with `extension add`.
 */
export async function updateExtension(dirs: ExtensionDirs, name: string, options: { official?: string } = {}): Promise<{ name: string; from?: string; to?: string; scope: ExtensionScope }> {
  const installed = (await listInstalled(dirs)).find((extension) => extension.name === name && !extension.shadowed);
  if (!installed) throw new Error(`${name} isn't installed.`);
  const from = installed.lock.marketplace;
  if (!from) throw new Error(`${name} didn't come from a marketplace (${path.normalize(installed.lock.source)}): install it again from there to update it.`);
  const marketplace = from.slice(from.indexOf("@") + 1);
  await knownMarketplaces(dirs, options.official);
  await updateMarketplace(marketplacesDir(dirs)!, marketplace);
  await installFromMarketplace(marketplacesDir(dirs)!, from, installed.scopeDir, installTarget(dirs, installed.scope));
  if (installed.scope === "project") await trustWorkspace(dirs, [name]);
  const after = (await listInstalled(dirs)).find((extension) => extension.name === name && extension.scopeDir === installed.scopeDir);
  return { name, scope: installed.scope, ...(installed.manifest?.version ? { from: installed.manifest.version } : {}), ...(after?.manifest?.version ? { to: after.manifest.version } : {}) };
}

/**
 * Gets what a workspace's lock lists and this computer lacks (#57): each extension's code into
 * the agent's store, from where it came (its marketplace, its git repository at its commit, its
 * folder), checked against the lock's hash, and the packages its npx servers run into the
 * agent's cache. It trusts nothing: the workspace still asks before they run. What can't be got
 * says why (a marketplace the agent doesn't know, another version there now, a folder that isn't
 * on this computer).
 */
export async function restoreExtensions(dirs: ExtensionDirs, options: { official?: string } = {}): Promise<{ restored: string[]; failed: { name: string; reason: string }[] }> {
  const restored: string[] = [];
  const failed: { name: string; reason: string }[] = [];
  const store = codeStoreDir(dirs);
  if (!dirs.project || !store) return { restored, failed };
  const target = installTarget(dirs, "project");
  for (const [name, lock] of Object.entries(await readLock(dirs.project))) {
    if (lock.linked) continue;
    try {
      const stored = storedCodeDir(store, name, lock.sha256);
      const have = (await stat(stored).catch(() => null))?.isDirectory() && (await hashExtension(stored)) === lock.sha256;
      if (!have) {
        // Installed again into a scratch scope, which puts its code in the store; its hash must be the lock's.
        const scratch = await mkdtemp(path.join(os.tmpdir(), "agent-kit-restore-"));
        try {
          if (lock.marketplace) {
            await knownMarketplaces(dirs, options.official);
            await installFromMarketplace(marketplacesDir(dirs)!, lock.marketplace, scratch, target);
          } else if (isGitSource(lock.source)) {
            await addExtension(lock.source, scratch, { ...target, ...(lock.commit ? { sha: lock.commit } : {}), ...(lock.subdir ? { subdir: lock.subdir } : {}) });
          } else if ((await stat(lock.source).catch(() => null))?.isDirectory()) {
            await addExtension(lock.source, scratch, target);
          } else {
            throw new Error(`it came from a folder that isn't on this computer (${lock.source})`);
          }
          const got = (await readLock(scratch))[name]?.sha256;
          if (got !== lock.sha256) throw new Error(`where it came from has another version now${lock.marketplace ? `: \`extension update ${name}\` takes it` : ""}`);
        } finally {
          await rm(scratch, { recursive: true, force: true });
        }
      }
      // Its npx packages, the versions the lock names, checked against their hashes there.
      const cache = target.packages;
      for (const [spec, cached] of Object.entries(lock.packages ?? {})) {
        const at = spec.lastIndexOf("@");
        const [pkg, version] = [spec.slice(0, at), spec.slice(at + 1)];
        if (!cache) throw new Error("this agent has no package cache");
        const dir = cachedPackageDir(cache, pkg, version);
        if ((await stat(dir).catch(() => null))?.isDirectory() && (await hashExtension(dir)) === cached.sha256) continue;
        if ((await cachePackage(cache, pkg, version)).sha256 !== cached.sha256) throw new Error(`its package ${spec} isn't what the workspace locked`);
      }
      if (!have || Object.keys(lock.packages ?? {}).length) restored.push(name);
    } catch (error) {
      failed.push({ name, reason: error instanceof Error ? error.message.replace(/\.$/, "") : String(error) });
    }
  }
  return { restored, failed };
}

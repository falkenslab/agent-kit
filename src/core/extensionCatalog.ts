import { stat } from "node:fs/promises";
import path from "node:path";
import { inKitRange, isGitSource, listInstalled, readExternalManifest, type ExtensionDirs, type ExtensionScope, type InstalledExtension } from "./externalExtensions.js";
import { addMarketplace, findPlugin, installFromMarketplace, listMarketplaces, resolvePluginSource, updateMarketplace, type KnownMarketplace, type MarketplacePlugin } from "./marketplaces.js";
import { packageCacheDir } from "./npxPackages.js";

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
  /** The version it offers: its `plugin.json`'s when the marketplace has its folder, else the marketplace's entry's. */
  version?: string;
  /** Installed (and used: not shadowed), from wherever it came. */
  installed?: InstalledExtension;
  /** Installed from this marketplace with an older version than it offers. */
  update: boolean;
}

/** The version a marketplace offers of a plugin, as Claude Code computes it: its `plugin.json` wins over the entry. */
async function offeredVersion(marketplace: KnownMarketplace, plugin: MarketplacePlugin): Promise<string | undefined> {
  try {
    const resolved = resolvePluginSource(marketplace, plugin);
    if ("source" in resolved && !isGitSource(resolved.source) && (await stat(resolved.source).catch(() => null))?.isDirectory()) {
      const version = (await readExternalManifest(resolved.source).catch(() => undefined))?.version;
      if (version) return version;
    }
  } catch {
    // A source the kit doesn't install: the entry's version, if any.
  }
  return plugin.version;
}

/** Whether `offered` is newer than `installed` (x.y.z); a version that can't be compared isn't. */
export function isNewer(offered: string | undefined, installed: string | undefined): boolean {
  if (!offered || !installed || !/^\d+\.\d+\.\d+/.test(offered) || !/^\d+\.\d+\.\d+/.test(installed)) return false;
  return inKitRange(offered, `>${installed.split("-")[0]}`);
}

/** Everything the known marketplaces offer, matching `words` (in its name, description, category, tags or keywords) when given. */
export async function extensionCatalog(dirs: ExtensionDirs, options: { official?: string; words?: readonly string[] } = {}): Promise<CatalogEntry[]> {
  const installed = (await listInstalled(dirs)).filter((extension) => !extension.shadowed);
  const words = (options.words ?? []).map((word) => word.toLowerCase());
  const entries: CatalogEntry[] = [];
  for (const marketplace of await knownMarketplaces(dirs, options.official)) {
    for (const plugin of marketplace.manifest?.plugins ?? []) {
      const text = [plugin.name, plugin.description, plugin.category, ...(plugin.tags ?? []), ...(plugin.keywords ?? [])].join(" ").toLowerCase();
      if (!words.every((word) => text.includes(word))) continue;
      const version = await offeredVersion(marketplace, plugin);
      const mine = installed.find((extension) => extension.name === plugin.name);
      const fromHere = mine?.lock.marketplace === `${plugin.name}@${marketplace.name}`;
      entries.push({
        spec: `${plugin.name}@${marketplace.name}`,
        marketplace: marketplace.name,
        official: marketplace.official,
        plugin,
        ...(version ? { version } : {}),
        ...(mine ? { installed: mine } : {}),
        update: Boolean(fromHere && isNewer(version, mine?.manifest?.version)),
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
export async function installExtension(dirs: ExtensionDirs, spec: string, options: { scope?: ExtensionScope; official?: string } = {}): Promise<{ name: string; scope: ExtensionScope; replaced: boolean; marketplace: string; commit?: string }> {
  const scope = options.scope ?? (dirs.agent ? "agent" : "project");
  const scopeDir = dirs[scope];
  if (!scopeDir) throw new Error(`This agent has no ${scope} scope for extensions.`);
  await knownMarketplaces(dirs, options.official);
  const cache = packageCacheDir(dirs);
  const result = await installFromMarketplace(marketplacesDir(dirs)!, spec, scopeDir, cache ? { packages: cache } : {});
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
  const cache = packageCacheDir(dirs);
  await installFromMarketplace(marketplacesDir(dirs)!, from, installed.scopeDir, cache ? { packages: cache } : {});
  const after = (await listInstalled(dirs)).find((extension) => extension.name === name && extension.scopeDir === installed.scopeDir);
  return { name, scope: installed.scope, ...(installed.manifest?.version ? { from: installed.manifest.version } : {}), ...(after?.manifest?.version ? { to: after.manifest.version } : {}) };
}

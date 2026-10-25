import path from "node:path";
import { extensionOptionStates, readLock, setExtensionConfirm, setExtensionEnabled, setExtensionOptions, type InstalledExtension } from "../core/externalExtensions.js";
import type { ExtensionsStatus } from "../core/session.js";
import { t } from "../core/messages/index.js";
import { extensionCatalog, type CatalogEntry } from "../core/extensionCatalog.js";

/** One line for an installed extension: name and version, scope, on or off, its author, where it came from. */
export function describe(extension: InstalledExtension): string {
  const state = `${extension.shadowed ? "not used (the project's wins)" : extension.lock.enabled ? "enabled" : "disabled"}${extension.lock.linked ? ", linked" : ""}`;
  // From a marketplace, its name there (`jokebook@shipyard`): the copy it came from is the kit's business.
  const where = extension.lock.commit ? `${extension.lock.source} @ ${extension.lock.commit.slice(0, 12)}` : path.normalize(extension.lock.source);
  const source = extension.lock.marketplace ? `${extension.lock.marketplace}${extension.lock.commit ? ` @ ${extension.lock.commit.slice(0, 12)}` : ""}` : where;
  const version = extension.manifest?.version ? ` ${extension.manifest.version}` : "";
  const author = extension.manifest?.author ? `  by ${extension.manifest.author.name}` : "";
  return `${extension.name}${version}  [${extension.scope}]  ${state}${author}  from ${source}`;
}

/**
 * What the active extensions let the agent do (#62), in the session's language: a heading per
 * extension with capabilities, a line per capability, and the tools a capability names that its
 * server doesn't offer, once the session has started and knows them. Not for one waiting for a
 * sign-in (`waiting`): its tools aren't there until the person signs in, which `/extensions` says.
 */
export function describeCapabilities(status: ExtensionsStatus, waiting: readonly string[] = []): string[] {
  const offered = new Set(status.sessionTools?.() ?? []);
  return status.active.flatMap((name) => {
    const capabilities = status.about[name]?.capabilities ?? [];
    const unavailable = status.about[name]?.unavailable ?? [];
    if (!capabilities.length && !unavailable.length) return [];
    return [
      t().extensionCan(name),
      ...capabilities.map(({ label, description, tools }) => {
        const missing = offered.size && !waiting.includes(name) ? [...new Set(tools.filter((tool) => !offered.has(tool)).map((tool) => tool.replace(/^mcp__.+?__/, "")))] : [];
        return `  - ${label}${description ? `: ${description}` : ""}${missing.length ? ` ${t().capabilityToolsMissing(missing.join(", "))}` : ""}`;
      }),
      // What it can't do on this computer, with what to install (#63).
      ...unavailable.map(({ label, reason }) => `  - ${t().capabilityUnavailable(label, reason)}`),
    ];
  });
}

/** The running extensions whose remote servers need the person to sign in (#61). */
async function needingSignIn(status: ExtensionsStatus): Promise<string[]> {
  const waiting = new Set((await status.serverStatus?.().catch(() => []))?.filter((server) => server.status === "needs-auth").map((server) => server.name));
  if (!waiting.size) return [];
  return status.active.filter((name) => status.about[name]?.servers.some((server) => waiting.has(server)));
}

/** What the chat does for `/extensions install|update|remove|reload` (#56). */
export type ExtensionAction =
  | { type: "install"; spec: string; confirmed: boolean }
  | { type: "update"; name?: string }
  | { type: "remove"; name: string; deleteData: boolean }
  | { type: "reload" }
  | { type: "trust" }
  /** Signing in to an extension's remote servers (#61), or finishing it with the callback URL pasted from another computer. */
  | { type: "sign-in"; name: string; callbackUrl?: string }
  | { type: "sign-out"; name: string };

/** One line for a catalog entry: what installs it, its version, whether it's installed or has an update, what it is. */
export function describeEntry(entry: CatalogEntry): string {
  const state = entry.installed ? (entry.update ? ` ${t().extensionUpdateAvailable(entry.installed.manifest?.version ?? "?")}` : ` ${t().extensionIsInstalled}`) : "";
  return `${entry.spec}${entry.version ? ` ${entry.version}` : ""}${state}${entry.description ? `  ${entry.description}` : ""}`;
}

/** An installed extension's options, one line each: its value, its default, or whether a sensitive one is set (never its value). */
export async function describeOptions(extension: InstalledExtension): Promise<string[]> {
  return (await extensionOptionStates(extension)).map(({ key, option, value, set, isDefault }) => {
    const shown = option.sensitive ? (set ? t().optionSecretSet : t().optionNotSet) : set ? `${Array.isArray(value) ? value.join(",") : String(value)}${isDefault ? ` ${t().optionDefault}` : ""}` : t().optionNotSet;
    return `  ${key} = ${shown}  (${option.title}${option.required ? `, ${t().optionRequired}` : ""})`;
  });
}

/** What guided mode keeps about an extension's tools (#74, #76): whether they ask, and the answers kept. None for one without tools. */
export function describeConfirm(extension: InstalledExtension): string[] {
  if (!Object.keys(extension.manifest?.servers ?? {}).length) return [];
  const confirm = extension.lock.confirm;
  if (confirm?.off) return [t().extensionConfirmOff(extension.name)];
  const kept = Object.entries(confirm?.tools ?? {});
  return [t().extensionConfirmOn(extension.name), ...(kept.length ? kept.map(([tool, answer]) => t().confirmKept(tool, answer)) : [t().confirmNoneKept])];
}

/**
 * `confirm=on|off|reset` among `config`'s pairs (#74, #76): `off` lets its tools run without asking
 * in guided mode, `on` asks again, `reset` forgets the answers kept. Returns the other pairs and
 * the extension as it is now, or why it can't.
 */
export async function applyConfirm(extension: InstalledExtension, pairs: readonly string[]): Promise<{ rest: string[]; extension: InstalledExtension; changed: boolean } | { error: string }> {
  const rest = pairs.filter((pair) => !pair.startsWith("confirm="));
  const values = pairs.filter((pair) => pair.startsWith("confirm=")).map((pair) => pair.slice("confirm=".length).toLowerCase());
  if (values.some((value) => !["on", "off", "reset"].includes(value))) return { error: "confirm takes on, off or reset" };
  for (const value of values) await setExtensionConfirm(extension.scopeDir, extension.name, value === "reset" ? { reset: true } : { off: value === "off" });
  const lock = values.length ? (await readLock(extension.scopeDir))[extension.name] : undefined;
  return { rest, extension: lock ? { ...extension, lock } : extension, changed: values.length > 0 };
}

/**
 * `/extensions` in a chat (#37): with nothing after it, what the session runs with, what's off
 * and why, and what's installed; with `enable <name>` or `disable <name>`, changes its lock and
 * says which (`toggled`): the chat turns it on or off in the running session when it can (#49),
 * and opens the session again otherwise, keeping the conversation. With `config <name>`, its
 * options; with `key=value` after it, sets them (`reconfigured`: the chat restarts its servers,
 * #55). A sensitive one isn't set here: what's typed in a chat is kept in its history. The
 * catalog (#56): `search [words]` lists what the agent's marketplaces offer; `install <name>`,
 * `update [name]`, `remove <name> [--delete-data]` and `reload` are the chat's to do (`action`),
 * since they change what the session has. `null` when `line` isn't this command.
 */
export async function chatExtensionsCommand(
  line: string,
  status: ExtensionsStatus | undefined,
  canReopen: boolean,
): Promise<{ lines: string[]; toggled?: { name: string; enabled: boolean }; reconfigured?: string; action?: ExtensionAction } | null> {
  const [command, action, name, ...extra] = line.trim().split(/\s+/);
  if (command?.toLowerCase() !== "/extensions") return null;
  const verb = action?.toLowerCase();
  if (verb === "search") {
    const words = [name, ...extra].filter((word): word is string => Boolean(word));
    const entries = status ? await extensionCatalog(status.dirs, { ...(status.official ? { official: status.official } : {}), ...(status.catalogTopics ? { topics: status.catalogTopics } : {}), words }).catch(() => []) : [];
    return { lines: entries.length ? entries.map((entry) => `  ${describeEntry(entry)}`) : [t().extensionsNoMatch] };
  }
  if (verb === "install" && name) return canReopen ? { lines: [], action: { type: "install", spec: name, confirmed: extra.includes("--yes") } } : { lines: [t().extensionsCantReopen] };
  if (verb === "update") return canReopen ? { lines: [], action: { type: "update", ...(name ? { name } : {}) } } : { lines: [t().extensionsCantReopen] };
  if (verb === "remove" && name) return canReopen ? { lines: [], action: { type: "remove", name, deleteData: extra.includes("--delete-data") } } : { lines: [t().extensionsCantReopen] };
  if (verb === "reload" && !name) return canReopen ? { lines: [], action: { type: "reload" } } : { lines: [t().extensionsCantReopen] };
  if (verb === "trust" && !name) return canReopen ? { lines: [], action: { type: "trust" } } : { lines: [t().extensionsCantReopen] };
  // Signing in happens in the running session: no reopening (#61).
  if (verb === "sign-in" && name) return { lines: [], action: { type: "sign-in", name, ...(extra[0] ? { callbackUrl: extra[0] } : {}) } };
  if (verb === "sign-out" && name) return { lines: [], action: { type: "sign-out", name } };
  if (action?.toLowerCase() === "config" && name) {
    const installed = (status?.installed ?? []).find((extension) => extension.name === name && !extension.shadowed);
    if (!installed) return { lines: [t().extensionNotInstalled(name)] };
    if (!extra.length) {
      const options = await describeOptions(installed);
      return { lines: [...(options.length ? [t().extensionOptions(name), ...options] : [t().extensionNoOptions(name)]), ...describeConfirm(installed)] };
    }
    // Guided mode's answers: the gate reads them on each call, so nothing restarts (#74, #76).
    const confirm = await applyConfirm(installed, extra);
    if ("error" in confirm) return { lines: [`(${confirm.error})`] };
    if (!confirm.rest.length) return { lines: describeConfirm(confirm.extension) };
    const typed: Record<string, string | undefined> = {};
    for (const pair of confirm.rest) {
      const at = pair.indexOf("=");
      const key = at > 0 ? pair.slice(0, at) : pair;
      if (installed.manifest?.userConfig[key]?.sensitive) return { lines: [t().optionSensitiveInChat(key, name)] };
      typed[key] = at > 0 ? pair.slice(at + 1) || undefined : undefined;
    }
    try {
      await setExtensionOptions(installed, name, typed);
    } catch (error) {
      return { lines: [`(${error instanceof Error ? error.message : String(error)})`] };
    }
    if (!canReopen) return { lines: [t().extensionOptionsSaved(name)] };
    return { lines: [], reconfigured: name };
  }
  if (!action) {
    const lines = [status?.active.length ? t().extensionsRunning(status.active.join(", ")) : t().extensionsNone];
    if (status) {
      const waiting = await needingSignIn(status);
      lines.push(...describeCapabilities(status, waiting), ...waiting.map((extension) => t().extensionNeedsSignIn(extension)));
    }
    // The claude.ai connectors the agent lets in, apart from installed extensions (#70).
    if (status?.connectors?.allowed.length) lines.push(t().connectorsAllowed(status.connectors.allowed.map((name) => name.replace(/^claude\.ai /, "")).join(", ")));
    if (status?.connectors?.missing.length) lines.push(t().connectorsMissing(status.connectors.missing.join(", ")));
    // The project's own .mcp.json servers left out (#83), by its folder's name: "<project>/.mcp.json".
    const project = status?.projectServers;
    if (project) {
      const file = `${path.basename(path.dirname(project.file))}/.mcp.json`;
      lines.push(t().projectServersDuplicated(file, project.duplicates.map(({ server, target }) => `${server} (${target})`).join(", ")));
    }
    for (const { name: off, reason } of status?.inactive ?? []) lines.push(t().extensionOff(off, reason));
    if (status?.installed.length) lines.push(t().extensionsInstalled, ...status.installed.map((extension) => `  ${describe(extension)}`));
    return { lines };
  }
  const enable = action.toLowerCase() === "enable";
  if ((!enable && action.toLowerCase() !== "disable") || !name || extra.length) return { lines: [t().extensionsUsage] };
  if (!canReopen) return { lines: [t().extensionsCantReopen] };
  const installed = (status?.installed ?? []).find((extension) => extension.name === name && !extension.shadowed);
  const dir = installed ? status?.dirs[installed.scope] : undefined;
  if (!installed || !dir) return { lines: [t().extensionNotInstalled(name)] };
  await setExtensionEnabled(dir, name, enable);
  return { lines: [], toggled: { name, enabled: enable } };
}

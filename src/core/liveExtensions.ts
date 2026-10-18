import { cp, lstat, mkdir, readdir, rm, symlink, unlink } from "node:fs/promises";
import path from "node:path";
import type { ExtensionsStatus } from "./session.js";
import { aboutExtension, describeCapability, type ExtensionCapability, type UnavailableCapability } from "./extensions.js";
import { hashExtension, listInstalled, readLock } from "./externalExtensions.js";
import { cachedPackagesIntact, packageCacheDir } from "./npxPackages.js";
import type { SessionLive, StaticSessionFacts } from "./sessionFacts.js";
import type { ToolLabels } from "./toolLabels.js";

/**
 * Turning an installed extension off and on in a running session (#49), without reopening it.
 * Only one that was running when the session opened: its MCP servers are toggled
 * (`toggleMcpServer()`, which removes their tools from the model's context and brings them back,
 * confirmed empirically) and its plugin, mounted in the run's folder, is unmounted or mounted again
 * before `reloadPlugins()` (its skills, commands and subagents go and come back, confirmed
 * empirically, through a link too). The kit's own lists follow: the plan gate's read-only tools, the subagent gates'
 * allowed types, the chat's labels, `/extensions` and what `about_me` says. One that wasn't
 * running has no plugin path the session knows: it takes reopening the session.
 *
 * Not through `setMcpServers()`: it leaves the servers given at start alone (confirmed
 * empirically: removing one from its set removes nothing).
 */

/**
 * Mounts an installed extension's plugin at `at`, in a run's folder, for the session to load from
 * there: a link to it (a junction on Windows, which needs no privilege), so nothing is copied and
 * its `node_modules` costs nothing; a copy where a link can't be made. The CLI loads a plugin
 * through a link, and `reloadPlugins()` unloads it when the link goes and loads it when it's back
 * (confirmed empirically).
 */
export async function mountPlugin(from: string, at: string): Promise<"link" | "copy"> {
  // Whatever was there goes: a link (never what it points at), or a copy, whole.
  const found = await lstat(at).catch(() => undefined);
  if (found?.isSymbolicLink()) await unlink(at);
  else if (found) await rm(at, { recursive: true, force: true });
  await mkdir(path.dirname(at), { recursive: true });
  try {
    await symlink(from, at, process.platform === "win32" ? "junction" : "dir");
    return "link";
  } catch {
    await cp(from, at, { recursive: true });
    return "copy";
  }
}

/**
 * Takes a mounted plugin away: a link is removed, never what it points at (its contents are the
 * installed extension); a copy is emptied, so the path stays for mounting it again.
 */
export async function unmountPlugin(at: string): Promise<void> {
  const found = await lstat(at).catch(() => undefined);
  if (!found) return;
  if (found.isSymbolicLink()) await unlink(at);
  else for (const entry of await readdir(at)) await rm(path.join(at, entry), { recursive: true, force: true });
}

/** What an installed extension brought to this session, to take it away and bring it back. */
export interface LiveExtension {
  name: string;
  /** Its plugin as installed (in its scope's folder, or where it's linked): what's mounted in the run's folder. */
  installedDir: string;
  /** Its scope's folder, where its lock is. */
  scopeDir: string;
  /** Where its plugin is mounted in the run's folder for this session (`mountPlugin()`). */
  pluginMount: string;
  servers: string[];
  readOnlyTools: string[];
  toolLabels: ToolLabels;
  /** Its subagents, as the type gate names them (`<plugin>:<name>`). */
  agents: string[];
  description: string;
  provides: string[];
  capabilities: ExtensionCapability[];
  /** What it can't do on this computer (#63). */
  unavailable: UnavailableCapability[];
  /** Its remote servers, by session name (#61): their options apply when the session opens, and they may need signing in. */
  remoteServers: string[];
  help: string[];
}

/** The session's own lists the switch keeps in step: the same objects the gates, the chat and the view read. */
export interface LiveTargets {
  readOnlyTools: string[];
  allowedSubagentTypes: string[];
  toolLabels: ToolLabels;
  status: ExtensionsStatus;
  facts: StaticSessionFacts;
  /** The running session's controls, once it has started. */
  controls: () => SessionLive;
}

/**
 * Turns `name` on or off in the running session; false when it can't be done here (it wasn't
 * running when the session opened, the session hasn't started, or its files changed since it
 * was installed), and the session must be opened again.
 */
export type ExtensionSwitch = (name: string, enabled: boolean) => Promise<boolean>;

/** The switch for a session's installed extensions. */
export function createExtensionSwitch(extensions: readonly LiveExtension[], targets: LiveTargets): ExtensionSwitch {
  const off = new Set<string>();
  return async (name, enabled) => {
    const extension = extensions.find((candidate) => candidate.name === name);
    const controls = targets.controls();
    if (!extension || !controls.toggleMcpServer || !controls.reloadPlugins) return false;
    if (enabled === !off.has(name)) return true; // already as asked
    if (enabled) {
      // Its files as they were installed, or nothing: a changed one is for a new session to judge.
      // A linked one's aren't checked: it's being developed, and a rebuild is why it's turned on again.
      const lock = (await readLock(extension.scopeDir))[name];
      if (!lock || (!lock.linked && lock.sha256 !== (await hashExtension(extension.installedDir)))) return false;
      // The packages its npx servers run (#54), checked whether it's linked or not.
      if (!(await cachedPackagesIntact(packageCacheDir(targets.status.dirs), lock.packages))) return false;
      await mountPlugin(extension.installedDir, extension.pluginMount);
    } else {
      await unmountPlugin(extension.pluginMount);
    }
    await controls.reloadPlugins();
    for (const server of extension.servers) await controls.toggleMcpServer(server, enabled);
    if (enabled) off.delete(name);
    else off.add(name);
    follow(extension, enabled, targets);
    targets.status.installed = await listInstalled(targets.status.dirs);
    return true;
  };
}

/**
 * Restarts `name`'s MCP servers in the running session, so they take its options as they are now
 * (#55): the launcher reads them when it starts a server. `reconnectMcpServer()` ends a server's
 * process and starts a new one with the session's config (confirmed empirically; `setMcpServers()`
 * replaced every server of the session and left the old process running). False when it can't
 * be done here (not running in this session, or the session hasn't started): the next session
 * takes them.
 */
export type ExtensionRestart = (name: string) => Promise<boolean>;

/** The restart for a session's installed extensions. */
export function createExtensionRestart(extensions: readonly LiveExtension[], targets: LiveTargets): ExtensionRestart {
  return async (name) => {
    const extension = extensions.find((candidate) => candidate.name === name);
    const reconnect = targets.controls().reconnectMcpServer;
    if (!extension || !reconnect || !extension.servers.length) return false;
    // A remote server's URL and headers are fixed when the session opens: restarting it would keep
    // the old values (#61), so its options take opening the session again.
    if (extension.remoteServers.length) return false;
    try {
      for (const server of extension.servers) await reconnect(server);
      return true;
    } catch {
      // Turned off in the session: it starts with them when it's turned on again.
      return false;
    }
  };
}

/** Where signing in to an extension's remote servers stands (#61). */
export type SignIn =
  /** Its servers are connected: nothing to sign in to. */
  | { status: "signed-in" }
  /** The links the person opens to sign in, one per server that needs it. */
  | { status: "open"; links: { server: string; url: string }[] }
  /** It isn't running in this session, has no remote server, or the SDK can't sign in. */
  | { status: "unavailable"; reason: "not-running" | "not-remote" | "unsupported" };

/** Signing in to installed extensions' remote servers, and out (#61). */
export interface ExtensionAuth {
  /** The running extensions whose remote servers need the person to sign in. */
  needed(): Promise<string[]>;
  /**
   * Starts signing in to `name`'s servers that need it, giving the links to open: the SDK's CLI
   * waits for the browser at its localhost callback. With `callbackUrl` (the address the browser
   * ended on, pasted from another computer), finishes it instead, and reconnects.
   */
  signIn(name: string, callbackUrl?: string): Promise<SignIn>;
  /** Whether all of `name`'s remote servers are connected, waiting up to `timeoutMs` for it. */
  connected(name: string, timeoutMs?: number): Promise<boolean>;
  /** Signs out of `name`'s remote servers; false when it can't be done here. */
  signOut(name: string): Promise<boolean>;
}

/** Signing in and out for a session's installed extensions. */
export function createExtensionAuth(extensions: readonly LiveExtension[], targets: Pick<LiveTargets, "controls">): ExtensionAuth {
  const remote = (name: string) => extensions.find((candidate) => candidate.name === name)?.remoteServers ?? [];
  const statuses = async (): Promise<Map<string, string>> => {
    const status = targets.controls().mcpServerStatus;
    return new Map(status ? (await status().catch(() => [])).map((server) => [server.name, server.status]) : []);
  };
  return {
    async needed() {
      const now = await statuses();
      return extensions.filter((extension) => extension.remoteServers.some((server) => now.get(server) === "needs-auth")).map((extension) => extension.name);
    },
    async signIn(name, callbackUrl) {
      const extension = extensions.find((candidate) => candidate.name === name);
      if (!extension) return { status: "unavailable", reason: "not-running" };
      if (!extension.remoteServers.length) return { status: "unavailable", reason: "not-remote" };
      const controls = targets.controls();
      const now = await statuses();
      const pending = extension.remoteServers.filter((server) => now.get(server) === "needs-auth");
      if (!pending.length) return { status: "signed-in" };
      if (callbackUrl) {
        if (!controls.mcpSubmitOAuthCallbackUrl || !controls.reconnectMcpServer) return { status: "unavailable", reason: "unsupported" };
        // A pasted callback stores the token, but the session stays needs-auth until the server
        // reconnects (confirmed empirically, CLI 2.1.300).
        for (const server of pending) {
          await controls.mcpSubmitOAuthCallbackUrl(server, callbackUrl);
          await controls.reconnectMcpServer(server);
        }
        return (await this.connected(name, 5000)) ? { status: "signed-in" } : { status: "open", links: [] };
      }
      if (!controls.mcpAuthenticate) return { status: "unavailable", reason: "unsupported" };
      const links: { server: string; url: string }[] = [];
      for (const server of pending) {
        const started = await controls.mcpAuthenticate(server);
        if (started.authUrl) links.push({ server, url: started.authUrl });
      }
      return { status: "open", links };
    },
    async connected(name, timeoutMs = 0) {
      const servers = remote(name);
      for (const start = Date.now(); ; await new Promise((resolve) => setTimeout(resolve, 500))) {
        const now = await statuses();
        if (servers.length && servers.every((server) => now.get(server) === "connected")) return true;
        if (Date.now() - start >= timeoutMs) return false;
      }
    },
    async signOut(name) {
      const servers = remote(name);
      const clear = targets.controls().mcpClearAuth;
      if (!servers.length || !clear) return false;
      for (const server of servers) await clear(server);
      return true;
    },
  };
}

/** The kit's lists, as the extension is now. */
function follow(extension: LiveExtension, enabled: boolean, targets: LiveTargets): void {
  const without = <T>(list: T[], items: readonly T[]) => {
    for (const item of items) {
      const index = list.indexOf(item);
      if (index >= 0) list.splice(index, 1);
    }
  };
  const { status, facts } = targets;
  if (enabled) {
    targets.readOnlyTools.push(...extension.readOnlyTools);
    targets.allowedSubagentTypes.push(...extension.agents);
    Object.assign(targets.toolLabels, extension.toolLabels);
    status.active.push(extension.name);
    status.about[extension.name] = aboutExtension({ name: extension.name, description: extension.description, provides: extension.provides, requires: [], capabilities: extension.capabilities }, extension.servers, facts.language, extension.unavailable);
    status.inactive = status.inactive.filter((entry) => entry.name !== extension.name);
    facts.extensions.active.push({
      name: extension.name,
      description: extension.description,
      provides: extension.provides,
      capabilities: extension.capabilities.map((capability) => describeCapability(capability, "en")),
      unavailable: extension.unavailable.map(({ capability, reason }) => ({ ...describeCapability(capability, "en"), reason })),
      servers: extension.servers,
      help: extension.help,
    });
    facts.extensions.inactive = facts.extensions.inactive.filter((entry) => entry.name !== extension.name);
  } else {
    without(targets.readOnlyTools, extension.readOnlyTools);
    without(targets.allowedSubagentTypes, extension.agents);
    // The same object the chat reads its labels from: changed in place, readonly to everyone else.
    for (const tool of Object.keys(extension.toolLabels)) delete (targets.toolLabels as Record<string, unknown>)[tool];
    without(status.active, [extension.name]);
    delete status.about[extension.name];
    const reason = { name: extension.name, reason: "was turned off in this session" };
    status.inactive.push(reason);
    facts.extensions.active = facts.extensions.active.filter((entry) => entry.name !== extension.name);
    facts.extensions.inactive.push(reason);
  }
}

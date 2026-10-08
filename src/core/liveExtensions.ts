import { cp, lstat, mkdir, readdir, rm, symlink, unlink } from "node:fs/promises";
import path from "node:path";
import type { ExtensionsStatus } from "./session.js";
import { hashExtension, listInstalled, readLock } from "./externalExtensions.js";
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
    status.about[extension.name] = { description: extension.description, provides: extension.provides };
    status.inactive = status.inactive.filter((entry) => entry.name !== extension.name);
    facts.extensions.active.push({ name: extension.name, description: extension.description, provides: extension.provides, servers: extension.servers, help: extension.help });
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

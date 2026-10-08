import { cp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import type { ExtensionsStatus } from "./session.js";
import { hashExtension, listInstalled, readLock } from "./externalExtensions.js";
import type { SessionLive, StaticSessionFacts } from "./sessionFacts.js";
import type { ToolLabels } from "./toolLabels.js";

/**
 * Turning an installed extension off and on in a running session (#49), without reopening it.
 * Only one that was running when the session opened: its MCP servers are toggled
 * (`toggleMcpServer()`, which removes their tools from the model's context and brings them back,
 * confirmed empirically) and its plugin, a copy in the run's folder, is emptied or filled again
 * before `reloadPlugins()` (its skills, commands and subagents go and come back, confirmed
 * empirically). The kit's own lists follow: the plan gate's read-only tools, the subagent gates'
 * allowed types, the chat's labels, `/extensions` and what `about_me` says. One that wasn't
 * running has no plugin path the session knows: it takes reopening the session.
 *
 * Not through `setMcpServers()`: it leaves the servers given at start alone (confirmed
 * empirically: removing one from its set removes nothing).
 */

/** What an installed extension brought to this session, to take it away and bring it back. */
export interface LiveExtension {
  name: string;
  /** Its plugin as installed (in its scope's folder, or where it's linked): the plugin copy is filled from there. */
  installedDir: string;
  /** Its scope's folder, where its lock is. */
  scopeDir: string;
  /** Its plugin, copied into the run's folder for this session. */
  pluginCopy: string;
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
      await cp(extension.installedDir, extension.pluginCopy, { recursive: true });
    } else {
      for (const entry of await readdir(extension.pluginCopy)) await rm(path.join(extension.pluginCopy, entry), { recursive: true, force: true });
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

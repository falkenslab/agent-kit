import path from "node:path";
import { setExtensionEnabled, type InstalledExtension } from "../core/externalExtensions.js";
import type { ExtensionsStatus } from "../core/session.js";
import { t } from "../core/messages/index.js";

/** One line for an installed extension: name and version, scope, on or off, its author, where it came from. */
export function describe(extension: InstalledExtension): string {
  const state = extension.shadowed ? "not used (the project's wins)" : extension.lock.enabled ? "enabled" : "disabled";
  // From a marketplace, its name there (`jokebook@shipyard`): the copy it came from is the kit's business.
  const where = extension.lock.commit ? `${extension.lock.source} @ ${extension.lock.commit.slice(0, 12)}` : path.normalize(extension.lock.source);
  const source = extension.lock.marketplace ? `${extension.lock.marketplace}${extension.lock.commit ? ` @ ${extension.lock.commit.slice(0, 12)}` : ""}` : where;
  const version = extension.manifest?.version ? ` ${extension.manifest.version}` : "";
  const author = extension.manifest?.author ? `  by ${extension.manifest.author.name}` : "";
  return `${extension.name}${version}  [${extension.scope}]  ${state}${author}  from ${source}`;
}

/**
 * `/extensions` in a chat (#37): with nothing after it, what the session runs with, what's off
 * and why, and what's installed; with `enable <name>` or `disable <name>`, changes its lock and
 * asks the chat to reopen the session (`reopen`), which keeps the conversation. `null` when
 * `line` isn't this command.
 */
export async function chatExtensionsCommand(line: string, status: ExtensionsStatus | undefined, canReopen: boolean): Promise<{ lines: string[]; reopen: boolean } | null> {
  const [command, action, name, ...extra] = line.trim().split(/\s+/);
  if (command?.toLowerCase() !== "/extensions") return null;
  if (!action) {
    const lines = [status?.active.length ? t().extensionsRunning(status.active.join(", ")) : t().extensionsNone];
    for (const { name: off, reason } of status?.inactive ?? []) lines.push(t().extensionOff(off, reason));
    if (status?.installed.length) lines.push(t().extensionsInstalled, ...status.installed.map((extension) => `  ${describe(extension)}`));
    return { lines, reopen: false };
  }
  const enable = action.toLowerCase() === "enable";
  if ((!enable && action.toLowerCase() !== "disable") || !name || extra.length) return { lines: [t().extensionsUsage], reopen: false };
  if (!canReopen) return { lines: [t().extensionsCantReopen], reopen: false };
  const installed = (status?.installed ?? []).find((extension) => extension.name === name && !extension.shadowed);
  const dir = installed ? status?.dirs[installed.scope] : undefined;
  if (!installed || !dir) return { lines: [t().extensionNotInstalled(name)], reopen: false };
  await setExtensionEnabled(dir, name, enable);
  return { lines: [t().extensionToggled(name, enable)], reopen: true };
}

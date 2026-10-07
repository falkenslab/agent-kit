import { stat } from "node:fs/promises";
import path from "node:path";
import {
  addExtension,
  listInstalled,
  removeExtension,
  setExtensionEnabled,
  type ExtensionDirs,
  type ExtensionScope,
  type InstalledExtension,
} from "../core/externalExtensions.js";
import type { ExtensionsStatus } from "../core/session.js";
import { t } from "../core/messages/index.js";

/**
 * The `extension` command an agent exposes in its own binary (#37), e.g. `captain extension add
 * ./jokebook --project`: installs, removes, enables, disables and lists the extensions in its two
 * scopes. Returns `false` when `argv` isn't this command (so the agent goes on), and sets
 * `process.exitCode` to 1 on an error.
 *
 * - `extension list`
 * - `extension info <name>`: its metadata, what it offers and where its README is
 * - `extension add <folder | git URL[#ref]> [--project] [--path <subfolder>]`
 * - `extension remove|enable|disable <name> [--project | --agent]`
 *
 * Without a scope, `add` installs into the agent's (the project's when the agent has no scope of
 * its own); the others act where the extension is, the project's first.
 */
export async function runExtensionCommand(
  argv: readonly string[],
  options: { dirs: ExtensionDirs; command?: string; write?: (line: string) => void },
): Promise<boolean> {
  if (argv[0] !== "extension") return false;
  const write = options.write ?? ((line: string) => console.log(line));
  const command = options.command ?? "agent";
  const [action, ...rest] = argv.slice(1);
  const flag = (name: string): boolean => rest.includes(`--${name}`);
  const value = (name: string): string | undefined => {
    const index = rest.indexOf(`--${name}`);
    return index >= 0 ? rest[index + 1] : undefined;
  };
  const positional = rest.filter((arg, index) => !arg.startsWith("--") && rest[index - 1] !== "--path");
  const askedScope: ExtensionScope | undefined = flag("project") ? "project" : flag("agent") ? "agent" : undefined;
  const fail = (message: string): true => {
    write(message);
    process.exitCode = 1;
    return true;
  };
  const scopeDir = (scope: ExtensionScope): string | undefined => options.dirs[scope];

  try {
    switch (action) {
      case "list": {
        const installed = await listInstalled(options.dirs);
        if (!installed.length) {
          write(`No extensions installed. \`${command} extension add <folder | git URL>\` installs one.`);
          return true;
        }
        for (const extension of installed) write(describe(extension));
        return true;
      }
      case "info": {
        const name = positional[0];
        if (!name) return fail(`Usage: ${command} extension info <name>`);
        const found = (await listInstalled(options.dirs)).find((extension) => extension.name === name && !extension.shadowed);
        if (!found) return fail(`${name} isn't installed. \`${command} extension list\` lists them.`);
        for (const line of await info(found)) write(line);
        return true;
      }
      case "add": {
        const source = positional[0];
        if (!source) return fail(`Usage: ${command} extension add <folder | git URL[#ref]> [--project] [--path <subfolder>]`);
        const scope = askedScope ?? (options.dirs.agent ? "agent" : "project");
        const dir = scopeDir(scope);
        if (!dir) return fail(`This agent has no ${scope} scope for extensions.`);
        const subdir = value("path");
        const result = await addExtension(source, dir, subdir ? { subdir } : {});
        write(`${result.replaced ? "Reinstalled" : "Installed"} ${result.name} in the ${scope} scope (${dir})${result.commit ? `, at ${result.commit.slice(0, 12)}` : ""}. It's enabled: it runs from the next session.`);
        return true;
      }
      case "remove":
      case "enable":
      case "disable": {
        const name = positional[0];
        if (!name) return fail(`Usage: ${command} extension ${action} <name> [--project | --agent]`);
        const found = (await listInstalled(options.dirs)).filter((extension) => extension.name === name && (!askedScope || extension.scope === askedScope));
        if (!found.length) return fail(`${name} isn't installed${askedScope ? ` in the ${askedScope} scope` : ""}. \`${command} extension list\` lists them.`);
        if (found.length > 1 && !askedScope) return fail(`${name} is installed in both scopes: say which, with --project or --agent.`);
        const { scope } = found[0]!;
        const dir = scopeDir(scope)!;
        if (action === "remove") await removeExtension(dir, name);
        else await setExtensionEnabled(dir, name, action === "enable");
        write(`${name} ${action === "remove" ? "removed" : `${action}d`} in the ${scope} scope. It applies from the next session (in the chat, \`/extensions\` reopens it).`);
        return true;
      }
      default:
        return fail(
          [
            `Usage: ${command} extension <action>`,
            "  list                                   what's installed, in which scope, on or off",
            "  info <name>                            its metadata, what it offers, its README",
            "  add <folder | git URL[#ref]> [--project] [--path <subfolder>]",
            "  remove|enable|disable <name> [--project | --agent]",
          ].join("\n"),
        );
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

/** One line for an installed extension: name and version, scope, on or off, its author, where it came from. */
export function describe(extension: InstalledExtension): string {
  const state = extension.shadowed ? "not used (the project's wins)" : extension.lock.enabled ? "enabled" : "disabled";
  const source = extension.lock.commit ? `${extension.lock.source} @ ${extension.lock.commit.slice(0, 12)}` : path.normalize(extension.lock.source);
  const version = extension.manifest?.version ? ` ${extension.manifest.version}` : "";
  const author = extension.manifest?.author ? `  by ${extension.manifest.author.name}` : "";
  return `${extension.name}${version}  [${extension.scope}]  ${state}${author}  from ${source}`;
}

/** Everything an installed extension's manifest says about it, for `extension info`. */
async function info(extension: InstalledExtension): Promise<string[]> {
  const manifest = extension.manifest;
  if (!manifest) return [describe(extension), "Its manifest can't be read."];
  const author = manifest.author ? [manifest.author.name, manifest.author.email && `<${manifest.author.email}>`, manifest.author.url && `(${manifest.author.url})`].filter(Boolean).join(" ") : undefined;
  const readme = path.join(extension.dir, "README.md");
  const field = (label: string, value: string | undefined): string[] => (value ? [`${label.padEnd(13)}${value}`] : []);
  return [
    `${manifest.name}${manifest.version ? ` ${manifest.version}` : ""}: ${manifest.description}`,
    ...field("Author", author),
    ...field("License", manifest.license),
    ...field("Homepage", manifest.homepage),
    ...field("Repository", manifest.repository),
    ...field("Keywords", manifest.keywords?.join(", ")),
    ...field("Works with", manifest.kit && `agent-kit ${manifest.kit}`),
    ...field("Provides", manifest.provides.join(", ") || undefined),
    ...field("Requires", manifest.requires.join(", ") || undefined),
    ...field("Servers", Object.keys(manifest.servers).join(", ") || undefined),
    ...field("Only read", manifest.readOnlyTools.join(", ") || undefined),
    ...field("Variables", Object.values(manifest.servers).flatMap((server) => Object.keys(server.env ?? {})).join(", ") || undefined),
    ...field("Installed", `${extension.scope} scope, ${extension.lock.enabled ? "enabled" : "disabled"}, on ${extension.lock.installed}, from ${describe(extension).split("  from ")[1]}`),
    ...field("README", (await stat(readme).catch(() => null))?.isFile() ? readme : undefined),
  ];
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

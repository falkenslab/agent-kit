import { stat } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  addMarketplace,
  findPlugin,
  inspectMarketplace,
  installFromMarketplace,
  listMarketplaces,
  removeMarketplace,
  updateMarketplace,
  type KnownMarketplace,
} from "../core/marketplaces.js";
import {
  addExtension,
  isGitSource,
  listInstalled,
  removeExtension,
  setExtensionEnabled,
  type ExtensionDirs,
  type ExtensionScope,
  type InstalledExtension,
} from "../core/externalExtensions.js";
import { describe } from "../chat/extensions.js";

export { chatExtensionsCommand, describe } from "../chat/extensions.js";

/**
 * The `extension` command an agent exposes in its own binary (#37), e.g. `captain extension add
 * ./jokebook --project`: installs, removes, enables, disables and lists the extensions in its two
 * scopes. Returns `false` when `argv` isn't this command (so the agent goes on), and sets
 * `process.exitCode` to 1 on an error.
 *
 * - `extension list`
 * - `extension info <name>`: its metadata, what it offers and where its README is
 * - `extension add <folder | git URL[#ref] | plugin[@marketplace]> [--project] [--path <subfolder>] [--yes]`
 * - `extension remove|enable|disable <name> [--project | --agent]`
 * - `extension search [words]`: what the known marketplaces offer
 * - `extension marketplace add <folder | git URL[#ref] | owner/repo> [--yes]`, `list`, `update [name]`, `remove <name>`
 *
 * Without a scope, `add` installs into the agent's (the project's when the agent has no scope of
 * its own); the others act where the extension is, the project's first. The marketplaces live in
 * the same folder. `official` is the agent's own marketplace (a folder or git URL): known without
 * asking, and installed from without a confirmation. Any other is added after a warning and
 * typing its name, and installing from it asks first; `--yes` answers for the person (a script).
 */
export async function runExtensionCommand(
  argv: readonly string[],
  options: {
    dirs: ExtensionDirs;
    command?: string;
    write?: (line: string) => void;
    /** The agent's official marketplace: a folder or a git URL (`#ref`). */
    official?: string;
    /** Asks the person (a confirmation); by default on the terminal, and nothing without one. */
    ask?: (question: string) => Promise<string>;
  },
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
  // The marketplaces live with the agent's extensions (the project's when it has no scope of its own).
  const marketsDir = options.dirs.agent ?? options.dirs.project;
  const ask = options.ask ?? askOnTerminal;
  const confirmed = async (question: string, accepts: (typed: string) => boolean): Promise<boolean> => flag("yes") || accepts((await ask(question)).trim());
  // The agent's own marketplace, known without asking; a folder is copied afresh each time (it's the agent's own code).
  const knownMarketplaces = async (): Promise<KnownMarketplace[]> => {
    if (!marketsDir) throw new Error("This agent has no folder for extensions.");
    const known = await listMarketplaces(marketsDir);
    const official = options.official;
    if (official && !(isGitSource(official) && known.some((marketplace) => marketplace.official))) {
      await addMarketplace(official, marketsDir, { official: true });
      return listMarketplaces(marketsDir);
    }
    return known;
  };

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
        if (!source) return fail(`Usage: ${command} extension add <folder | git URL[#ref] | plugin[@marketplace]> [--project] [--path <subfolder>]`);
        const scope = askedScope ?? (options.dirs.agent ? "agent" : "project");
        const dir = scopeDir(scope);
        if (!dir) return fail(`This agent has no ${scope} scope for extensions.`);
        // A plugin of a marketplace, unless it's a folder here or a git URL.
        const isFolder = await stat(path.resolve(source)).then((found) => found.isDirectory(), () => false);
        if (!isFolder && !isGitSource(source) && /^[A-Za-z0-9][\w.-]*(@[A-Za-z0-9][\w.-]*)?$/.test(source)) {
          await knownMarketplaces();
          const { marketplace, plugin } = await findPlugin(marketsDir!, source);
          if (!marketplace.official) {
            write(`${plugin.name}${plugin.version ? ` ${plugin.version}` : ""}, from the marketplace ${marketplace.name} (${marketplace.source}): ${plugin.description ?? "no description"}`);
            write("It will run on this computer with your permissions.");
            if (!(await confirmed("Install it? (y/N) ", (typed) => /^(y|yes|s|si|sí)$/i.test(typed)))) return fail("Not installed.");
          }
          const result = await installFromMarketplace(marketsDir!, source, dir);
          write(`${result.replaced ? "Reinstalled" : "Installed"} ${result.name} from ${result.marketplace} in the ${scope} scope (${dir})${result.commit ? `, at ${result.commit.slice(0, 12)}` : ""}. It's enabled: it runs from the next session.`);
          return true;
        }
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
      case "search": {
        const words = positional.map((word) => word.toLowerCase());
        const installed = new Set((await listInstalled(options.dirs)).map((extension) => extension.name));
        const offered = (await knownMarketplaces()).flatMap((marketplace) => (marketplace.manifest?.plugins ?? []).map((plugin) => ({ marketplace, plugin })));
        const matching = offered.filter(({ plugin }) => {
          const text = [plugin.name, plugin.description, plugin.category, ...(plugin.tags ?? []), ...(plugin.keywords ?? [])].join(" ").toLowerCase();
          return words.every((word) => text.includes(word));
        });
        if (!matching.length) {
          write(offered.length ? "No extension matches." : `No marketplace offers extensions yet. \`${command} extension marketplace add <folder | git URL | owner/repo>\` adds one.`);
          return true;
        }
        for (const { marketplace, plugin } of matching) {
          write(`${plugin.name}@${marketplace.name}${plugin.version ? ` ${plugin.version}` : ""}${installed.has(plugin.name) ? " (installed)" : ""}${plugin.description ? `  ${plugin.description}` : ""}`);
        }
        return true;
      }
      case "marketplace":
        return await marketplaceCommand();
      default:
        return fail(
          [
            `Usage: ${command} extension <action>`,
            "  list                                   what's installed, in which scope, on or off",
            "  info <name>                            its metadata, what it offers, its README",
            "  add <folder | git URL[#ref] | plugin[@marketplace]> [--project] [--path <subfolder>] [--yes]",
            "  remove|enable|disable <name> [--project | --agent]",
            "  search [words]                         what the known marketplaces offer",
            "  marketplace add <folder | git URL[#ref] | owner/repo> [--yes]",
            "  marketplace list | update [name] | remove <name>",
          ].join("\n"),
        );
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  /** `extension marketplace <add | list | update | remove>`. */
  async function marketplaceCommand(): Promise<boolean> {
    const [what, name] = positional;
    switch (what) {
      case "add": {
        if (!name) return fail(`Usage: ${command} extension marketplace add <folder | git URL[#ref] | owner/repo> [--yes]`);
        await knownMarketplaces();
        const manifest = await inspectMarketplace(name);
        write(`The marketplace ${manifest.name}, by ${manifest.owner.name}${manifest.description ? `: ${manifest.description}` : ""} (${manifest.plugins.length} extension${manifest.plugins.length === 1 ? "" : "s"}).`);
        write("Its extensions run on this computer with your permissions, and it isn't this agent's own: add it only if you trust who publishes it.");
        if (!(await confirmed(`Type its name (${manifest.name}) to add it: `, (typed) => typed === manifest.name))) return fail("Not added.");
        const result = await addMarketplace(name, marketsDir!);
        write(`${result.replaced ? "Updated" : "Added"} the marketplace ${result.name}${result.commit ? `, at ${result.commit.slice(0, 12)}` : ""}. \`${command} extension search\` lists what it offers.`);
        return true;
      }
      case "list": {
        const known = await knownMarketplaces();
        if (!known.length) {
          write(`No marketplaces. \`${command} extension marketplace add <folder | git URL | owner/repo>\` adds one.`);
          return true;
        }
        for (const marketplace of known) {
          write(`${marketplace.name}${marketplace.official ? " (official)" : ""}  ${marketplace.manifest ? `${marketplace.manifest.plugins.length} extension${marketplace.manifest.plugins.length === 1 ? "" : "s"}` : "can't be read"}  from ${marketplace.source}${marketplace.commit ? ` at ${marketplace.commit.slice(0, 12)}` : ""}, updated ${marketplace.updated.slice(0, 10)}`);
        }
        return true;
      }
      case "update": {
        const known = await knownMarketplaces();
        const chosen = name ? known.filter((marketplace) => marketplace.name === name) : known;
        if (name && !chosen.length) return fail(`No marketplace ${name}.`);
        for (const marketplace of chosen) {
          const { commit } = await updateMarketplace(marketsDir!, marketplace.name);
          write(`Updated ${marketplace.name}${commit ? `, at ${commit.slice(0, 12)}` : ""}. Its installed extensions stay as they are: \`${command} extension add <name>@${marketplace.name}\` installs one again.`);
        }
        return true;
      }
      case "remove": {
        if (!name) return fail(`Usage: ${command} extension marketplace remove <name>`);
        if (!marketsDir || !(await removeMarketplace(marketsDir, name))) return fail(`No marketplace ${name}.`);
        write(`Removed the marketplace ${name}. The extensions installed from it stay.`);
        return true;
      }
      default:
        return fail(`Usage: ${command} extension marketplace <add | list | update | remove>`);
    }
  }
}

/** A question on the terminal, or no answer without one. */
async function askOnTerminal(question: string): Promise<string> {
  if (!process.stdin.isTTY) return "";
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
  }
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

import { stat } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import {
  addMarketplace,
  findPlugin,
  inspectMarketplace,
  installFromMarketplace,
  removeMarketplace,
  updateMarketplace,
  type KnownMarketplace,
} from "../core/marketplaces.js";
import {
  addExtension,
  extensionOptionStates,
  installTarget,
  folderSize,
  isGitSource,
  isRemoteServer,
  remoteHosts,
  listInstalled,
  removeExtension,
  setExtensionEnabled,
  setExtensionOptions,
  type ExtensionDirs,
  type ExtensionScope,
  type InstalledExtension,
} from "../core/externalExtensions.js";
import { describe, describeOptions } from "../chat/extensions.js";
import { extensionCatalog, knownMarketplaces as catalogMarketplaces, restoreExtensions, updateExtension } from "../core/extensionCatalog.js";
import { trustWorkspace } from "../core/workspaceTrust.js";
import { describeCapability, describeInLanguage } from "../core/extensions.js";
import { getLanguage } from "../core/messages/index.js";

export { chatExtensionsCommand, describe } from "../chat/extensions.js";

/**
 * The `extension` command an agent exposes in its own binary (#37), e.g. `captain extension add
 * ./jokebook --project`: installs, removes, enables, disables and lists the extensions in its two
 * scopes. Returns `false` when `argv` isn't this command (so the agent goes on), and sets
 * `process.exitCode` to 1 on an error.
 *
 * - `extension list`
 * - `extension info <name>`: its metadata, what it offers and where its README is
 * - `extension add <folder | git URL[#ref] | plugin[@marketplace]> [--project] [--path <subfolder>] [--set key=value…] [--yes]`: asks for its options (#55) unless `--set` gives them
 * - `extension add <folder> --link [--project]`: registered where it is, to develop it (not copied, its files not checked)
 * - `extension remove <name> [--project | --agent] [--yes | --keep-data]`: asks before deleting its data folder
 * - `extension enable|disable <name> [--project | --agent]`
 * - `extension config <name> [key=value… | key… | --unset key…] [--project | --agent]`: its options; `key` alone asks for it (without echo when it's a secret)
 * - `extension update [name] [--yes]`: one installed from a marketplace (or all that have a newer version there) to the version it offers now, its data and options kept
 * - `extension restore [--trust]`: gets the code a workspace's lock lists and this computer lacks (#57); `--trust` trusts it too
 * - `extension trust [name…]`: lets a workspace's extensions run, as their code is now
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
    /** The topics of the extensions `search` shows (#59), as the agent's `catalogTopics`; without it, every one. */
    catalogTopics?: string[];
    /** Asks the person (a confirmation, an option's value); by default on the terminal, and nothing without one. */
    ask?: (question: string) => Promise<string>;
    /** Asks for a secret (a sensitive option), without echo; by default on the terminal. */
    askSecret?: (question: string) => Promise<string>;
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
  const values = (name: string): string[] => rest.flatMap((arg, index) => (rest[index - 1] === `--${name}` ? [arg] : []));
  const positional = rest.filter((arg, index) => !arg.startsWith("--") && !["--path", "--set", "--unset"].includes(rest[index - 1]!));
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
  const askSecret = options.askSecret ?? (options.ask ? options.ask : askSecretOnTerminal);
  /**
   * After installing `name` into `dir`: its options from `--set`, then asked for each still
   * without a value (on a terminal; none without one), saying which required ones are left.
   */
  const configure = async (name: string, dir: string): Promise<void> => {
    const installed = (await listInstalled(options.dirs)).find((extension) => extension.name === name && extension.scopeDir === dir);
    const declared = installed?.manifest?.userConfig ?? {};
    if (!installed || !Object.keys(declared).length) return;
    const typed: Record<string, string> = {};
    for (const pair of values("set")) {
      const at = pair.indexOf("=");
      if (at <= 0) throw new Error(`--set takes key=value: "${pair}"`);
      typed[pair.slice(0, at)] = pair.slice(at + 1);
    }
    const states = await describeOptionStates(installed);
    for (const [key, option] of Object.entries(declared)) {
      if (key in typed || states.get(key)) continue;
      const question = `${option.title}${option.required ? "" : " (optional)"}${option.default !== undefined ? ` [${String(option.default)}]` : ""}: ${option.description}\n  ${key} = `;
      const answer = (await (option.sensitive ? askSecret : ask)(question)).trim();
      if (answer) typed[key] = answer;
    }
    if (Object.keys(typed).length) await setExtensionOptions(installed, name, typed);
    const missing = Object.entries(declared).filter(([key, option]) => option.required && !(key in typed) && !states.get(key) && option.default === undefined).map(([key]) => key);
    if (missing.length) write(`It stays off until ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} set: \`${command} extension config ${name} ${missing[0]}\`.`);
  };
  const confirmed = async (question: string, accepts: (typed: string) => boolean): Promise<boolean> => flag("yes") || accepts((await ask(question)).trim());
  // The agent's own marketplace, known without asking; a folder is copied afresh each time (it's the agent's own code).
  const knownMarketplaces = (): Promise<KnownMarketplace[]> => catalogMarketplaces(options.dirs, options.official);

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
        // The packages its npx servers run, in the agent's cache, shared by both scopes (#54); a
        // project's code in the agent's store, its lock all the workspace keeps (#57).
        const packages = installTarget(options.dirs, scope);
        // Installed into the workspace by the person: trusted there as it is.
        const trusted = async (name: string): Promise<void> => void (scope === "project" && (await trustWorkspace(options.dirs, [name])));
        // What it needs and this computer lacks (#63): said, never installed.
        const lacking = (missing: readonly string[], remote: readonly string[] = []): void => {
          for (const line of missing) write(`It ${line}.`);
          // Where what the agent sends goes (#61).
          if (remote.length) write(`It talks to ${remote.join(", ")}: what the agent sends there leaves this computer.`);
        };
        // A plugin of a marketplace, unless it's a folder here or a git URL.
        const isFolder = await stat(path.resolve(source)).then((found) => found.isDirectory(), () => false);
        if (flag("link")) {
          if (!isFolder) return fail(`Only a folder can be linked: ${source} isn't one here.`);
          const result = await addExtension(source, dir, { link: true, ...(packages.packages ? { packages: packages.packages } : {}) });
          await trusted(result.name);
          await configure(result.name, dir);
          write(`Linked ${result.name} in the ${scope} scope: it runs from ${path.resolve(source)}, whose files aren't checked. A rebuild takes effect when its server starts again (a new session, or \`/extensions disable\` and \`enable\` in the chat).`);
          lacking(result.missing, result.remote);
          return true;
        }
        if (!isFolder && !isGitSource(source) && /^[A-Za-z0-9][\w.-]*(@[A-Za-z0-9][\w.-]*)?$/.test(source)) {
          await knownMarketplaces();
          const { marketplace, plugin } = await findPlugin(marketsDir!, source);
          if (!marketplace.official) {
            write(`${plugin.name}${plugin.version ? ` ${plugin.version}` : ""}, from the marketplace ${marketplace.name} (${marketplace.source}): ${plugin.description ?? "no description"}`);
            write("It will run on this computer with your permissions.");
            if (!(await confirmed("Install it? (y/N) ", (typed) => /^(y|yes|s|si|sí)$/i.test(typed)))) return fail("Not installed.");
          }
          const result = await installFromMarketplace(marketsDir!, source, dir, packages);
          await trusted(result.name);
          await configure(result.name, dir);
          write(`${result.replaced ? "Reinstalled" : "Installed"} ${result.name} from ${result.marketplace} in the ${scope} scope (${dir})${result.commit ? `, at ${result.commit.slice(0, 12)}` : ""}. It's enabled: it runs from the next session.`);
          lacking(result.missing, result.remote);
          return true;
        }
        const subdir = value("path");
        const result = await addExtension(source, dir, { ...(subdir ? { subdir } : {}), ...packages });
        await trusted(result.name);
        await configure(result.name, dir);
        write(`${result.replaced ? "Reinstalled" : "Installed"} ${result.name} in the ${scope} scope (${dir})${result.commit ? `, at ${result.commit.slice(0, 12)}` : ""}. It's enabled: it runs from the next session.`);
        lacking(result.missing, result.remote);
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
        const { scope, dataDir, privateDir } = found[0]!;
        const dir = scopeDir(scope)!;
        if (action !== "remove") {
          await setExtensionEnabled(dir, name, action === "enable");
          write(`${name} ${action}d in the ${scope} scope. It applies from the next session (in the chat, \`/extensions\` reopens it).`);
          return true;
        }
        // Its data (a browser profile, a signed-in session) may be worth keeping for a reinstall: asked, unless said.
        const size = await folderSize(dataDir);
        const deleteData =
          size > 0 && !flag("keep-data") && (await confirmed(`Delete its data too (${dataDir}, ${formatSize(size)})? (y/N) `, (typed) => /^(y|yes|s|si|sí)$/i.test(typed)));
        await removeExtension(dir, name, { deleteData, privateDir });
        write(`${name} removed in the ${scope} scope${size > 0 ? (deleteData ? ", with its data" : `; its data stays in ${dataDir}`) : ""}. It applies from the next session (in the chat, \`/extensions\` reopens it).`);
        return true;
      }
      case "config": {
        const name = positional[0];
        if (!name) return fail(`Usage: ${command} extension config <name> [key=value… | key… | --unset key…] [--project | --agent]`);
        const found = (await listInstalled(options.dirs)).filter((extension) => extension.name === name && !extension.shadowed && (!askedScope || extension.scope === askedScope));
        if (!found.length) return fail(`${name} isn't installed${askedScope ? ` in the ${askedScope} scope` : ""}. \`${command} extension list\` lists them.`);
        const installed = found[0]!;
        const declared = installed.manifest?.userConfig ?? {};
        const typed: Record<string, string | undefined> = {};
        for (const key of values("unset")) typed[key] = undefined;
        for (const pair of positional.slice(1)) {
          const at = pair.indexOf("=");
          if (at > 0) typed[pair.slice(0, at)] = pair.slice(at + 1);
          else {
            const option = declared[pair];
            if (!option) return fail(`${name} has no option "${pair}"${Object.keys(declared).length ? `: it has ${Object.keys(declared).join(", ")}` : ""}.`);
            typed[pair] = (await (option.sensitive ? askSecret : ask)(`${option.title}: ${option.description}\n  ${pair} = `)).trim() || undefined;
          }
        }
        if (Object.keys(typed).length) {
          await setExtensionOptions(installed, name, typed);
          write(`${name}'s options saved in the ${installed.scope} scope. They apply when its server starts again: the next session, or in a chat \`/extensions disable ${name}\` and \`enable\`.`);
        }
        const lines = await describeOptions((await listInstalled(options.dirs)).find((extension) => extension.name === name && extension.scopeDir === installed.scopeDir)!);
        if (!lines.length) write(`${name} has no options.`);
        for (const line of lines) write(line);
        return true;
      }
      case "restore": {
        const result = await restoreExtensions(options.dirs, options.official ? { official: options.official } : {});
        for (const name of result.restored) write(`Restored ${name}.`);
        for (const { name, reason } of result.failed) write(`${name} can't be restored: ${reason}.`);
        if (!result.restored.length && !result.failed.length) write("This workspace's extensions are all on this computer.");
        if (result.failed.length) process.exitCode = 1;
        if (flag("trust")) for (const name of await trustWorkspace(options.dirs)) write(`Trusted ${name} in this workspace.`);
        else if (options.dirs.project && options.dirs.agent) write(`They run once you trust them: \`${command} extension trust\`, or the chat asks.`);
        return true;
      }
      case "trust": {
        if (!options.dirs.project || !options.dirs.agent) return fail("This agent has no workspace scope to trust: only its own, which never asks.");
        const names = await trustWorkspace(options.dirs, positional.length ? positional : undefined);
        if (!names.length) write("This workspace has no extensions.");
        for (const name of names) write(`Trusted ${name} in this workspace, as it is now: another version asks again.`);
        return true;
      }
      case "search": {
        const matching = await extensionCatalog(options.dirs, { ...(options.official ? { official: options.official } : {}), ...(options.catalogTopics?.length ? { topics: options.catalogTopics } : {}), words: positional });
        if (!matching.length) {
          const offered = (await knownMarketplaces()).some((marketplace) => marketplace.manifest?.plugins.length);
          write(offered ? "No extension matches." : `No marketplace offers extensions yet. \`${command} extension marketplace add <folder | git URL | owner/repo>\` adds one.`);
          return true;
        }
        for (const entry of matching) {
          const state = entry.installed ? (entry.update ? ` (installed: ${entry.installed.manifest?.version ?? "?"}, update available)` : " (installed)") : "";
          write(`${entry.spec}${entry.version ? ` ${entry.version}` : ""}${state}${entry.plugin.description ? `  ${entry.plugin.description}` : ""}`);
        }
        return true;
      }
      case "update": {
        const name = positional[0];
        const official = options.official ? { official: options.official } : {};
        const names = name ? [name] : (await extensionCatalog(options.dirs, official)).filter((entry) => entry.update).map((entry) => entry.plugin.name);
        if (!names.length) {
          write("Every extension from a marketplace is up to date.");
          return true;
        }
        for (const each of names) {
          const result = await updateExtension(options.dirs, each, official);
          write(`Updated ${each}${result.from || result.to ? ` (${result.from ?? "?"} → ${result.to ?? "?"})` : ""} in the ${result.scope} scope: its data and options kept. It runs from the next session.`);
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
            "  add <folder | git URL[#ref] | plugin[@marketplace]> [--project] [--path <subfolder>] [--set key=value…] [--yes]",
            "  add <folder> --link [--project]       to develop one: runs from its folder, not copied nor checked",
            "  remove <name> [--project | --agent] [--yes | --keep-data]",
            "  enable|disable <name> [--project | --agent]",
            "  config <name> [key=value… | key… | --unset key…]   its options (key alone asks for it)",
            "  update [name]                          to the version its marketplace offers now (all that have one, without a name)",
            "  restore [--trust]                      gets what this workspace's lock lists and this computer lacks",
            "  trust [name…]                          lets this workspace's extensions run, as they are now",
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
/** Which of an installed extension's options have a value of their own (not a default). */
async function describeOptionStates(installed: InstalledExtension): Promise<Map<string, boolean>> {
  return new Map((await extensionOptionStates(installed)).map((state) => [state.key, state.set && !state.isDefault]));
}

/** A secret from the terminal, not echoed; "" without one. */
async function askSecretOnTerminal(question: string): Promise<string> {
  if (!process.stdin.isTTY) return "";
  const terminal = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // What's typed isn't written back: only the question, readline's first write.
  const output = terminal as unknown as { _writeToOutput: (text: string) => void; output: NodeJS.WriteStream };
  let prompted = false;
  output._writeToOutput = (text: string) => {
    if (prompted) return;
    prompted = true;
    output.output.write(text);
  };
  try {
    return await terminal.question(question);
  } finally {
    terminal.close();
    process.stdout.write("\n");
  }
}

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
  // Its README in the kit's language when it has one (README.es.md), else the English (#67).
  const language = getLanguage();
  const translated = path.join(extension.dir, `README.${language}.md`);
  const readme = language !== "en" && (await stat(translated).catch(() => null))?.isFile() ? translated : path.join(extension.dir, "README.md");
  const field = (label: string, value: string | undefined): string[] => (value ? [`${label.padEnd(13)}${value}`] : []);
  return [
    `${manifest.name}${manifest.version ? ` ${manifest.version}` : ""}: ${describeInLanguage(manifest.description, manifest.descriptions, language)}`,
    ...field("Author", author),
    ...field("License", manifest.license),
    ...field("Homepage", manifest.homepage),
    ...field("Repository", manifest.repository),
    ...field("Keywords", manifest.keywords?.join(", ")),
    ...field("Works with", manifest.kit && `agent-kit ${manifest.kit}`),
    // What it lets the agent do (#62), in the kit's language: one per line.
    ...manifest.capabilities.flatMap((capability, index) => {
      const { id, label, description } = describeCapability(capability, getLanguage());
      return field(index ? "" : "Can do", `${label} (${id})${description ? `: ${description}` : ""}`);
    }),
    ...field("Provides", manifest.provides.join(", ") || undefined),
    ...field("Requires", manifest.requires.join(", ") || undefined),
    // The programs it needs on this computer (#63), one per line, with what for.
    ...manifest.requirements.flatMap((requirement, index) =>
      field(index ? "" : "Needs", `${requirement.name} (${requirement.program}${requirement.version ? ` ${requirement.version.min} or later` : ""})${requirement.for.length ? ` for ${requirement.for.join(", ")}` : ""}`),
    ),
    ...field("Servers", Object.keys(manifest.servers).join(", ") || undefined),
    ...field(
      "Only read",
      manifest.readOnlyTools
        ? `${manifest.readOnlyTools.join(", ") || "none"} (its manifest)`
        : Object.keys(manifest.servers).length
          ? "what its servers mark readOnlyHint"
          : undefined,
    ),
    ...field("Packages", Object.keys(extension.lock.packages ?? {}).join(", ") || undefined),
    ...field(
      "Options",
      Object.entries(manifest.userConfig)
        .map(([key, option]) => `${key} (${[option.title, option.required && "required", option.sensitive && "secret"].filter(Boolean).join(", ")})`)
        .join(", ") || undefined,
    ),
    ...field("Variables", Object.values(manifest.servers).flatMap((server) => (isRemoteServer(server) ? [] : Object.keys(server.env ?? {}))).join(", ") || undefined),
    // Where what the agent sends goes (#61): a remote server's host.
    ...field("Talks to", remoteHosts(manifest).join(", ") || undefined),
    ...field("Installed", `${extension.scope} scope, ${extension.lock.enabled ? "enabled" : "disabled"}, on ${extension.lock.installed}, from ${describe(extension).split("  from ")[1]}`),
    ...field("Data", (await stat(extension.dataDir).catch(() => null))?.isDirectory() ? `${extension.dataDir} (${formatSize(await folderSize(extension.dataDir))})` : undefined),
    ...field("README", (await stat(readme).catch(() => null))?.isFile() ? readme : undefined),
  ];
}

/** A size in bytes, as a person reads it: `512 B`, `3.4 KB`, `120 MB`. */
function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${unit === 0 ? size : size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
}

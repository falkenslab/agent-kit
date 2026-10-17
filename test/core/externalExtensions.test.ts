import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { trustWorkspace } from "../../src/core/workspaceTrust.js";
import {
  addExtension,
  codeStoreDir,
  installTarget,
  storedCodeDir,
  extensionLauncherPath,
  hashExtension,
  inKitRange,
  isGitSource,
  listInstalled,
  loadExternalExtensions,
  onPath,
  readLock,
  removeExtension,
  setExtensionEnabled,
} from "../../src/core/externalExtensions.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";
import { runExtensionCommand, chatExtensionsCommand } from "../../src/tui/extensionCommand.js";
import { setLanguage } from "../../src/core/messages/index.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "external-extensions-test-"));

/** An extension in a new folder: a manifest with the kit's key, a server and a subagent that asks for Bash. */
function makeExtension(name = "dice", kit: Record<string, unknown> = {}): string {
  const dir = path.join(temp(), name);
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, "server"));
  fs.mkdirSync(path.join(dir, "agents"));
  fs.writeFileSync(
    path.join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({
      name,
      version: "2.1.0",
      description: "Rolls dice.",
      author: { name: "Ada", email: "ada@example.com" },
      license: "MIT",
      repository: { url: "https://example.com/dice.git" },
      keywords: ["dice", 7],
      metadata: {
        "agent-kit": {
          provides: ["dice"],
          readOnlyTools: ["roll"],
          labels: { roll: { en: { label: "Rolling {sides}", phrase: ["rolled once", "rolled {n} times"] }, es: { label: "Tirando un dado de {sides}" } } },
          help: "Dice: `roll` rolls one.",
          ...kit,
        },
      },
    }),
  );
  fs.writeFileSync(path.join(dir, "server", "index.mjs"), "// a server\n");
  // Its server, as any Claude Code plugin declares it.
  fs.writeFileSync(
    path.join(dir, ".mcp.json"),
    JSON.stringify({ mcpServers: { dice: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs", "--fair"], env: { DICE_SEED: "${DICE_SEED}" } } } }),
  );
  fs.writeFileSync(path.join(dir, "README.md"), "# dice\n");
  fs.writeFileSync(path.join(dir, "agents", "croupier.md"), "---\nname: croupier\ndescription: Deals.\ntools: [Bash, Read]\n---\n\nYou deal.");
  return dir;
}

const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false };

test("the kit's version is checked against an extension's range", () => {
  assert.ok(inKitRange("0.19.2", ">=0.19.0 <0.21.0"));
  assert.ok(inKitRange("0.19.2", "0.19.2"));
  assert.equal(inKitRange("0.21.0", ">=0.19.0 <0.21.0"), false);
  assert.equal(inKitRange("0.19.2", "^0.19"), false); // not supported: off, never guessed
  assert.ok(isGitSource("https://github.com/x/y#v1"));
  assert.ok(isGitSource("github:x/y"));
  assert.equal(isGitSource("./extensions/dice"), false);
});

test("add copies a folder into a scope, locks it by hash and enables it; remove, enable and disable change the lock", async () => {
  const scope = path.join(temp(), "extensions");
  const source = makeExtension();
  assert.deepEqual(await addExtension(source, scope), { name: "dice", replaced: false, missing: [] });
  const lock = await readLock(scope);
  assert.equal(lock.dice?.enabled, true);
  assert.equal(lock.dice?.sha256, await hashExtension(path.join(scope, "dice")));
  assert.equal(lock.dice?.source, path.resolve(source));
  assert.equal((await addExtension(source, scope)).replaced, true);

  assert.equal(await setExtensionEnabled(scope, "dice", false), true);
  assert.equal((await readLock(scope)).dice?.enabled, false);
  assert.equal(await setExtensionEnabled(scope, "nope", true), false);
  assert.equal(await removeExtension(scope, "dice"), true);
  assert.deepEqual(await readLock(scope), {});
  assert.equal(fs.existsSync(path.join(scope, "dice")), false);

  await assert.rejects(addExtension(temp(), scope), /isn't an extension/);
  const noServer = makeExtension("broken");
  fs.rmSync(path.join(noServer, "server"), { recursive: true });
  await assert.rejects(addExtension(noServer, scope), /no script at server[\\/]index\.mjs/);
  const python = makeExtension("snake");
  fs.writeFileSync(path.join(python, ".mcp.json"), JSON.stringify({ mcpServers: { snake: { command: "python", args: ["server.py"] } } }));
  await assert.rejects(addExtension(python, scope), /with "python": only Node servers, or npx with a package.s exact version, can be installed/);
});

test("add clones a git repository at a ref and records its commit", async () => {
  const repo = makeExtension("coins");
  const git = (...args: string[]) => execFileSync("git", ["-C", repo, ...args], { stdio: "pipe" }).toString().trim();
  git("init", "-q", "-b", "main");
  git("-c", "user.email=t@t", "-c", "user.name=t", "add", ".");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "first");
  const scope = path.join(temp(), "extensions");
  const result = await addExtension(`${pathToFileURL(repo).href}#main`, scope);
  assert.equal(result.name, "coins");
  assert.equal(result.commit, git("rev-parse", "HEAD"));
  assert.equal((await readLock(scope)).coins?.commit, result.commit);
  assert.equal(fs.existsSync(path.join(scope, "coins", ".git")), false);
});

test("the project's scope wins once trusted, its code in the agent's store; a changed file, a disabled one or a kit range left out don't load", async () => {
  const dirs = { agent: path.join(temp(), "agent"), project: path.join(temp(), "project") };
  await addExtension(makeExtension(), dirs.agent);
  await addExtension(makeExtension(), dirs.project, installTarget(dirs, "project"));
  // The workspace keeps only its lock; its code is in the agent's store.
  assert.deepEqual(fs.readdirSync(dirs.project), ["extensions.lock.json"]);
  const stored = storedCodeDir(codeStoreDir(dirs)!, "dice", (await readLock(dirs.project)).dice!.sha256);
  assert.equal((await loadExternalExtensions(dirs)).untrusted.map((extension) => extension.name).join(), "dice");
  await trustWorkspace(dirs);
  await addExtension(makeExtension("old", { kit: ">=0.1.0 <0.2.0" }), dirs.agent);
  await addExtension(makeExtension("quiet"), dirs.agent);
  await setExtensionEnabled(dirs.agent, "quiet", false);

  const installed = await listInstalled(dirs);
  assert.deepEqual(installed.map(({ name, scope, shadowed }) => `${name}:${scope}:${shadowed}`), ["dice:project:false", "dice:agent:true", "old:agent:false", "quiet:agent:false"]);
  let loaded = await loadExternalExtensions(dirs);
  assert.deepEqual(loaded.extensions.map((extension) => [extension.name, extension.plugin]), [["dice", stored]]);
  assert.match(loaded.off.find((off) => off.name === "old")?.reason ?? "", /works with agent-kit >=0.1.0 <0.2.0/);

  fs.appendFileSync(path.join(stored, "server", "index.mjs"), "// tampered\n");
  loaded = await loadExternalExtensions(dirs);
  assert.match(loaded.off.find((off) => off.name === "dice")?.reason ?? "", /changed since it was installed/);
});

test("a plain Claude Code plugin is an extension: its servers from .mcp.json or plugin.json, no kit key needed", async () => {
  const scope = path.join(temp(), "extensions");
  const plain = path.join(temp(), "plain");
  fs.mkdirSync(path.join(plain, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(plain, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "plain", description: "Just a plugin." }));
  fs.writeFileSync(path.join(plain, "s.mjs"), "");
  // A .mcp.json without the mcpServers key works too.
  fs.writeFileSync(path.join(plain, ".mcp.json"), JSON.stringify({ tools: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/s.mjs"] } }));
  await addExtension(plain, scope);
  let [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
  let contribution = await extension!.contribute({} as never);
  assert.deepEqual(Object.keys(contribution.mcpServers ?? {}), ["tools"]);
  // No list in its manifest: plan mode asks its servers (#53).
  assert.deepEqual(contribution.readOnlyTools, []);
  assert.deepEqual(contribution.readOnlyHintServers, ["tools"]);

  // mcpServers inline in plugin.json, and a script outside the folder refused.
  fs.writeFileSync(path.join(plain, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "plain", mcpServers: { inline: { command: "node", args: ["s.mjs"] } } }));
  await addExtension(plain, scope);
  [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
  contribution = await extension!.contribute({} as never);
  assert.deepEqual(Object.keys(contribution.mcpServers ?? {}), ["inline"]);
  fs.writeFileSync(path.join(plain, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "plain", mcpServers: { out: { command: "node", args: ["../elsewhere.mjs"] } } }));
  await assert.rejects(addExtension(plain, scope), /from outside its folder/);
});

test("the launcher leaves the server only the system's variables and those it declares", () => {
  const dir = temp();
  const entry = path.join(dir, "env.mjs");
  fs.writeFileSync(entry, "process.stdout.write(JSON.stringify({ names: Object.keys(process.env), argv: process.argv.slice(2) }));");
  const out = execFileSync(process.execPath, [extensionLauncherPath(), entry, JSON.stringify({ keep: ["DICE_SEED"] }), "--fair"], {
    env: { ...process.env, DICE_SEED: "7", CLAUDE_CODE_OAUTH_TOKEN: "secret", ANTHROPIC_API_KEY: "secret", SOMETHING_ELSE: "x", PROGRAMFILES: "C:\\Program Files", DISPLAY: ":0" },
  }).toString();
  const { names, argv } = JSON.parse(out) as { names: string[]; argv: string[] };
  assert.ok(names.includes("DICE_SEED"));
  // Where programs are and the desktop session: a browser is found and opened through them.
  for (const kept of ["PROGRAMFILES", "DISPLAY"]) assert.ok(names.some((name) => name.toUpperCase() === kept), kept);
  for (const hidden of ["CLAUDE_CODE_OAUTH_TOKEN", "ANTHROPIC_API_KEY", "SOMETHING_ELSE"]) assert.equal(names.includes(hidden), false, hidden);
  assert.deepEqual(argv, ["--fair"]);
});

test("a session runs an installed extension: its server through the launcher, its rules from its manifest, no Bash, no plugin hooks", async () => {
  const projectDir = temp();
  const dirs = { project: path.join(projectDir, "extensions") };
  await addExtension(makeExtension(), dirs.project);
  setLanguage("es");
  try {
    const runDir = temp();
    const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, runDir, spec);
    const server = (built.options.mcpServers as Record<string, { type: string; command: string; args: string[]; env: Record<string, string> }>).dice!;
    assert.equal(server.command, process.execPath);
    assert.deepEqual(server.args, [extensionLauncherPath(), path.join(dirs.project, "dice", "server", "index.mjs"), '{"keep":["CLAUDE_PLUGIN_ROOT","CLAUDE_PLUGIN_DATA","DICE_SEED"]}', "--fair"]);
    // Its folders as Claude Code gives them to a plugin's servers, and its own variables.
    const data = path.join(dirs.project, ".data", "dice");
    assert.deepEqual(server.env, { CLAUDE_PLUGIN_ROOT: path.join(dirs.project, "dice"), CLAUDE_PLUGIN_DATA: data, DICE_SEED: process.env.DICE_SEED ?? "" });
    assert.ok(fs.statSync(data).isDirectory());
    assert.equal(built.toolLabels.mcp__dice__roll?.label({ sides: 6 }), "Tirando un dado de 6");
    assert.deepEqual(built.toolLabels.mcp__dice__roll?.phrase, undefined);
    assert.match(String(built.options.systemPrompt), /\*\*dice\*\*: Rolls dice\. Provides: dice\./);
    assert.equal((built.options.settings as { disableAllHooks?: boolean }).disableAllHooks, true);
    assert.deepEqual(built.options.agents?.["dice:croupier"]?.tools, ["Read"]);
    // Its plugin mounted in the run's folder (a link), which the session can unmount to turn it off (#49).
    const mount = path.join(runDir, "extensions", "dice");
    assert.ok(built.options.plugins?.some((plugin) => plugin.path === mount));
    assert.ok(fs.lstatSync(mount).isSymbolicLink());
    assert.ok(fs.existsSync(path.join(mount, ".claude-plugin", "plugin.json")));
    assert.deepEqual(built.extensions.active, ["dice"]);

    // /extensions lists it; disabling it changes the lock and says which, for the chat to apply.
    const listed = await chatExtensionsCommand("/extensions", built.extensions, true);
    assert.match(listed?.lines.join("\n") ?? "", /dice 2\.1\.0 {2}\[project\] {2}enabled {2}by Ada/);
    const disabled = await chatExtensionsCommand("/extensions disable dice", built.extensions, true);
    assert.deepEqual(disabled?.toggled, { name: "dice", enabled: false });
    assert.equal((await readLock(dirs.project)).dice?.enabled, false);
    const reopened = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec);
    assert.equal((reopened.options.mcpServers as Record<string, unknown>).dice, undefined);
    assert.equal(await chatExtensionsCommand("hello", built.extensions, true), null);
  } finally {
    setLanguage("en");
  }
});

test("the command installs, lists, disables and removes, and says what it did", async () => {
  const dirs = { agent: path.join(temp(), "agent"), project: path.join(temp(), "project") };
  const lines: string[] = [];
  const run = (...argv: string[]) => runExtensionCommand(["extension", ...argv], { dirs, command: "captain", write: (line) => lines.push(line) });
  assert.equal(await runExtensionCommand(["--continue"], { dirs }), false);
  await run("add", makeExtension());
  await run("add", makeExtension(), "--project");
  assert.match(lines.join("\n"), /Installed dice in the agent scope[\s\S]*Installed dice in the project scope/);
  lines.length = 0;
  await run("list");
  assert.match(lines[0]!, /^dice 2\.1\.0 {2}\[project\] {2}enabled {2}by Ada {2}from /);
  assert.match(lines[1]!, /^dice 2\.1\.0 {2}\[agent\] {2}not used/);
  lines.length = 0;
  await run("info", "dice");
  const info = lines.join("\n");
  assert.match(info, /^dice 2\.1\.0: Rolls dice\./);
  assert.match(info, /Author {7}Ada <ada@example\.com>/);
  assert.match(info, /Repository {3}https:\/\/example\.com\/dice\.git/);
  assert.match(info, /Keywords {5}dice\n/);
  assert.match(info, /Variables {4}DICE_SEED/);
  assert.match(info, /Only read {4}roll \(its manifest\)/);
  assert.match(info, /README {7}.*README\.md/);
  lines.length = 0;
  const before = process.exitCode;
  await run("disable", "dice");
  assert.match(lines[0]!, /in both scopes: say which/);
  process.exitCode = before;
  await run("disable", "dice", "--agent");
  assert.equal((await readLock(dirs.agent)).dice?.enabled, false);
  await run("remove", "dice", "--project");
  assert.deepEqual(await readLock(dirs.project), {});
});

/** An extension whose server keeps a profile in its data folder, as a browser would. */
function makeStatefulExtension(): string {
  const dir = makeExtension("browser");
  fs.writeFileSync(
    path.join(dir, ".mcp.json"),
    JSON.stringify({ mcpServers: { browser: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server/index.mjs", "--profile", "${CLAUDE_PLUGIN_DATA}/profile"], env: { CACHE: "${CLAUDE_PLUGIN_DATA}/cache" } } } }),
  );
  return dir;
}

test("an installed extension's data folder is ${CLAUDE_PLUGIN_DATA}: outside its plugin and hash, kept when it's reinstalled, deleted only when asked", async () => {
  const scope = path.join(temp(), "extensions");
  const source = makeStatefulExtension();
  await addExtension(source, scope);
  const data = path.join(scope, ".data", "browser");
  const server = async () => {
    const built = await buildSessionOptions({ mode: "guided", projectDir: temp(), extensionDirs: { agent: scope } }, temp(), spec);
    return (built.options.mcpServers as Record<string, { args: string[]; env: Record<string, string> }>).browser!;
  };
  const first = await server();
  assert.deepEqual(first.args.slice(3), ["--profile", `${data}/profile`]);
  assert.equal(first.env.CACHE, `${data}/cache`);
  // What the server writes there doesn't change its hash, and survives a reinstall.
  fs.writeFileSync(path.join(data, "cookies"), "signed in");
  assert.ok(await server());
  assert.deepEqual((await loadExternalExtensions({ agent: scope })).off, []);
  await addExtension(source, scope);
  assert.equal(fs.readFileSync(path.join(data, "cookies"), "utf8"), "signed in");
  const [installed] = await listInstalled({ agent: scope });
  assert.equal(installed!.dataDir, data);

  await removeExtension(scope, "browser");
  assert.ok(fs.existsSync(path.join(data, "cookies")));
  await addExtension(source, scope);
  await removeExtension(scope, "browser", { deleteData: true });
  assert.ok(!fs.existsSync(data));
});

test("a linked extension runs from its folder, unchecked; removing it leaves the folder; only a folder elsewhere can be linked", async () => {
  const scope = path.join(temp(), "extensions");
  const source = makeExtension();
  await addExtension(source, scope, { link: true });
  const lock = (await readLock(scope)).dice!;
  assert.equal(lock.linked, true);
  assert.equal(lock.source, source);
  assert.ok(!fs.existsSync(path.join(scope, "dice")));
  const [installed] = await listInstalled({ agent: scope });
  assert.equal(installed!.dir, source);

  // A rebuild changes its files: it still loads, from where it is.
  fs.writeFileSync(path.join(source, "server", "index.mjs"), "// rebuilt\n");
  const built = await buildSessionOptions({ mode: "guided", projectDir: temp(), extensionDirs: { agent: scope } }, temp(), spec);
  assert.deepEqual(built.extensions.active, ["dice"]);
  assert.equal((built.options.mcpServers as Record<string, { args: string[] }>).dice!.args[1], path.join(source, "server", "index.mjs"));

  await removeExtension(scope, "dice");
  assert.ok(fs.existsSync(path.join(source, "server", "index.mjs")));
  await assert.rejects(addExtension("https://example.com/dice.git", scope, { link: true }), /Only a folder can be linked/);
  await addExtension(source, scope);
  await assert.rejects(addExtension(path.join(scope, "dice"), scope), /is where dice is installed/);
});

test("the command links a folder, shows it linked with its data, and asks before deleting the data when it removes", async () => {
  const dirs = { agent: path.join(temp(), "agent") };
  const lines: string[] = [];
  let answer = "";
  const run = (...argv: string[]) =>
    runExtensionCommand(["extension", ...argv], { dirs, command: "captain", write: (line) => lines.push(line), ask: async () => answer });
  const source = makeStatefulExtension();
  await run("add", source, "--link");
  assert.match(lines.at(-1)!, /^Linked browser in the agent scope: it runs from /);
  const data = path.join(dirs.agent, ".data", "browser");
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, "cookies"), "signed in");
  await run("list");
  assert.match(lines.at(-1)!, /^browser 2\.1\.0 {2}\[agent\] {2}enabled, linked/);
  await run("info", "browser");
  assert.match(lines.join("\n"), /Data {9}.*browser \(9 B\)/);

  // "n" (or no answer) keeps it; --keep-data doesn't ask; "y" deletes it.
  answer = "n";
  await run("remove", "browser");
  assert.match(lines.at(-1)!, /removed in the agent scope; its data stays in /);
  assert.ok(fs.existsSync(data));
  await run("add", source, "--link");
  await run("remove", "browser", "--keep-data");
  assert.ok(fs.existsSync(data));
  await run("add", source, "--link");
  answer = "y";
  await run("remove", "browser");
  assert.match(lines.at(-1)!, /removed in the agent scope, with its data/);
  assert.ok(!fs.existsSync(data));
  assert.ok(fs.existsSync(source));
});

/** A program this computer lacks, with how to install it everywhere (so the reason reads the same on any system). */
const lab = { name: "Lab tool", program: "no-such-program-for-agent-kit", install: { windows: "get-lab", macos: "get-lab", linux: "get-lab" } };

test("an extension needing a program this computer lacks installs, saying so, and is off with how to install it; one that's there doesn't stop it", async () => {
  assert.equal(await onPath("node"), true);
  assert.equal(await onPath("no-such-program-for-agent-kit"), false);
  const dirs = { agent: path.join(temp(), "extensions") };
  const added = await addExtension(makeExtension("dice", { requirements: [{ name: "Node.js", program: "node", install: { url: "https://nodejs.org" } }, lab] }), dirs.agent);
  assert.deepEqual(added.missing, ["needs Lab tool (no-such-program-for-agent-kit), which isn't on this computer: install it with `get-lab`"]);
  const loaded = await loadExternalExtensions(dirs);
  assert.deepEqual(loaded.extensions, []);
  assert.deepEqual(loaded.off, [{ name: "dice", reason: "needs Lab tool (no-such-program-for-agent-kit), which isn't on this computer: install it with `get-lab`" }]);
  await addExtension(makeExtension("dice", { requirements: [{ name: "Node.js", program: "node", version: { args: ["--version"], min: "18.0.0" }, install: { url: "https://nodejs.org" } }] }), dirs.agent);
  assert.deepEqual((await loadExternalExtensions(dirs)).extensions.map((extension) => extension.name), ["dice"]);
  // A check that could do something isn't installed.
  await assert.rejects(addExtension(makeExtension("dice", { requirements: [{ ...lab, program: "docker", version: { args: ["run", "alpine"], min: "1" } }] }), dirs.agent), /checks docker's version with "run"/);
});

test("a program only one capability needs keeps that capability off, and its skills, and the agent says what to install; the rest works", async () => {
  const source = makeExtension("dice", {
    capabilities: [
      { ...rolling, skills: ["luck"] },
      { id: "dice-lab", skills: ["odds"], tools: ["simulate"], texts: { en: { label: "Simulating odds" }, es: { label: "Simular probabilidades" } } },
    ],
    requirements: [{ ...lab, for: ["dice-lab"] }],
  });
  for (const skill of ["luck", "odds"]) {
    fs.mkdirSync(path.join(source, "skills", skill), { recursive: true });
    fs.writeFileSync(path.join(source, "skills", skill, "SKILL.md"), `---\nname: ${skill}\ndescription: ${skill}.\n---\n\n${skill}.`);
  }
  const projectDir = temp();
  const dirs = { agent: path.join(projectDir, "extensions") };
  assert.deepEqual((await addExtension(source, dirs.agent)).missing, ["needs Lab tool (no-such-program-for-agent-kit), which isn't on this computer: install it with `get-lab` for dice-lab"]);
  setLanguage("es");
  try {
    const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec);
    assert.deepEqual(built.extensions.active, ["dice"]);
    const prompt = String(built.options.systemPrompt);
    assert.match(prompt, /Provides: dice, dice-rolling \(Rolling dice\)\./);
    assert.match(prompt, /Simulating odds \(dice-lab\) isn't available on this computer: it needs Lab tool \(no-such-program-for-agent-kit\), which isn't on this computer: install it with `get-lab`\. If the person asks for it, tell them what to install\./);
    // Its skill is left out; the other capability's stays.
    assert.ok(Array.isArray(built.options.skills) && built.options.skills.includes("dice:luck") && !built.options.skills.includes("dice:odds"), JSON.stringify(built.options.skills));
    const lines = (await chatExtensionsCommand("/extensions", built.extensions, true))?.lines ?? [];
    assert.ok(lines.includes("  - Simular probabilidades: no disponible en este ordenador: needs Lab tool (no-such-program-for-agent-kit), which isn't on this computer: install it with `get-lab`"), lines.join("\n"));
  } finally {
    setLanguage("en");
  }
});

/** dice's capability, as #62 writes one: its tool, texts in two languages. */
const rolling = { id: "dice-rolling", tools: ["roll", "shuffle"], texts: { en: { label: "Rolling dice", description: "Rolls fair dice of any size." }, es: { label: "Tirar dados", description: "Tira dados justos de cualquier tamaño." } } };

test("an installed extension's capabilities: refused when one names a skill it lacks, provided, and shown in the person's language with the tools its server doesn't offer", async () => {
  await assert.rejects(
    addExtension(makeExtension("dice", { capabilities: [{ ...rolling, skills: ["odds"] }] }), path.join(temp(), "extensions")),
    /dice can't be installed: it names the skill odds in its capability dice-rolling, and has no skills\/odds\/SKILL\.md/,
  );
  const projectDir = temp();
  const dirs = { agent: path.join(projectDir, "extensions") };
  await addExtension(makeExtension("dice", { capabilities: [rolling] }), dirs.agent);
  setLanguage("es");
  try {
    const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec);
    // The model reads it in English, by its id and label.
    assert.match(String(built.options.systemPrompt), /\*\*dice\*\*: Rolls dice\. Provides: dice, dice-rolling \(Rolling dice\)\./);
    assert.deepEqual(built.extensions.about.dice?.capabilities, [{ id: "dice-rolling", label: "Tirar dados", description: "Tira dados justos de cualquier tamaño.", tools: ["mcp__dice__roll", "mcp__dice__shuffle"] }]);
    let lines = (await chatExtensionsCommand("/extensions", built.extensions, true))?.lines ?? [];
    assert.ok(lines.includes("Lo que tu agente puede hacer con dice:"), lines.join("\n"));
    assert.ok(lines.includes("  - Tirar dados: Tira dados justos de cualquier tamaño."), lines.join("\n"));
    // Once the session runs, a tool it names that its server doesn't offer is said.
    built.extensions.sessionTools = () => ["mcp__dice__roll"];
    lines = (await chatExtensionsCommand("/extensions", built.extensions, true))?.lines ?? [];
    assert.ok(lines.includes("  - Tirar dados: Tira dados justos de cualquier tamaño. (su servidor no ofrece shuffle)"), lines.join("\n"));
  } finally {
    setLanguage("en");
  }
});

test("a manifest's read-only list wins over its servers' hints, even empty", async () => {
  const scope = path.join(temp(), "extensions");
  await addExtension(makeExtension(), scope);
  let [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
  let contribution = await extension!.contribute({} as never);
  assert.deepEqual(contribution.readOnlyTools, ["mcp__dice__roll"]);
  assert.equal(contribution.readOnlyHintServers, undefined);

  await addExtension(makeExtension("dice", { readOnlyTools: [] }), scope);
  [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
  contribution = await extension!.contribute({} as never);
  assert.deepEqual(contribution.readOnlyTools, []);
  assert.equal(contribution.readOnlyHintServers, undefined);

  await addExtension(makeExtension("dice", { readOnlyTools: undefined }), scope);
  [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
  contribution = await extension!.contribute({} as never);
  assert.deepEqual(contribution.readOnlyHintServers, ["dice"]);
});

test("an extension's hash doesn't count text files' line endings, as git checks them out on each computer; a binary file counts as it is", async () => {
  const write = (dir: string, files: Record<string, string | Uint8Array>) => {
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), content);
    }
    return dir;
  };
  const binary = new Uint8Array([0, 13, 10, 255]);
  const lf = write(temp(), { "server.mjs": "a\nb\n", "skills/x/SKILL.md": "# x\n\nbody\n", "logo.png": binary });
  const crlf = write(temp(), { "server.mjs": "a\r\nb\r\n", "skills/x/SKILL.md": "# x\r\n\r\nbody\r\n", "logo.png": binary });
  assert.equal(await hashExtension(crlf), await hashExtension(lf));
  // A real change still shows, and a binary file's bytes all count.
  write(crlf, { "server.mjs": "a\r\nc\r\n" });
  assert.notEqual(await hashExtension(crlf), await hashExtension(lf));
  const other = write(temp(), { "server.mjs": "a\nb\n", "skills/x/SKILL.md": "# x\n\nbody\n", "logo.png": new Uint8Array([0, 10, 255]) });
  assert.notEqual(await hashExtension(other), await hashExtension(lf));
});

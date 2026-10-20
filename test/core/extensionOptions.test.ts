import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { addExtension, extensionLauncherPath, extensionOptionStates, listInstalled, loadExternalExtensions, readLock, setExtensionOptions } from "../../src/core/externalExtensions.js";
import { extensionSecretsPath, parseOptionValue, parseUserConfig } from "../../src/core/extensionOptions.js";
import { chatExtensionsCommand } from "../../src/chat/extensions.js";
import { runExtensionCommand } from "../../src/tui/extensionCommand.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { sources } from "../../src/extensions/sources/index.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "extension-options-test-"));

const USER_CONFIG = {
  url: { type: "string", title: "Moodle URL", description: "The site.", required: true },
  token: { type: "string", title: "Token", description: "Its token.", sensitive: true },
  headless: { type: "boolean", title: "Headless", description: "No window.", default: false },
};

/** An extension whose server takes its options: the URL and token in variables, headless as an argument. */
function makeConfigurable(userConfig: Record<string, unknown> = USER_CONFIG, env: Record<string, string> = { SITE: "${user_config.url}", TOKEN: "${user_config.token}" }): string {
  const dir = path.join(temp(), "moodle");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "moodle", description: "Moodle.", userConfig }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { moodle: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs", "--headless=${user_config.headless}"], env } } }));
  fs.writeFileSync(path.join(dir, "server.mjs"), "process.stdout.write(JSON.stringify({ site: process.env.SITE, token: process.env.TOKEN, argv: process.argv.slice(2) }));");
  return dir;
}

test("userConfig is read as Claude Code declares it, and an option with an unknown field is refused", () => {
  const options = parseUserConfig({ url: { type: "string", description: "The site." } });
  assert.equal(options.url!.title, "url");
  assert.throws(() => parseUserConfig({ url: { type: "string", description: "x", secret: true } }), /unknown fields \(secret\)/);
  assert.throws(() => parseUserConfig({ url: { type: "text", description: "x" } }), /no valid type/);
  assert.throws(() => parseUserConfig({ url: { type: "string" } }), /no description/);
  assert.throws(() => parseUserConfig({ "bad-name": { type: "string", description: "x" } }), /valid name/);
});

test("a value is checked by its option's type: numbers and their bounds, booleans, choices, lists", () => {
  assert.equal(parseOptionValue({ type: "number", title: "n", description: "", min: 1, max: 5 }, "3"), 3);
  assert.throws(() => parseOptionValue({ type: "number", title: "n", description: "", max: 5 }, "9"), /above 5/);
  assert.throws(() => parseOptionValue({ type: "number", title: "n", description: "" }, "x"), /isn't a number/);
  assert.equal(parseOptionValue({ type: "boolean", title: "b", description: "" }, "yes"), true);
  assert.throws(() => parseOptionValue({ type: "string", title: "s", description: "", options: ["teacher", "student"] }, "admin"), /isn't one of/);
  assert.deepEqual(parseOptionValue({ type: "string", title: "s", description: "", multiple: true }, "a, b,,c"), ["a", "b", "c"]);
});

test("a required option without a value keeps the extension off; set, the launcher gives its server the values, the secret kept apart", async () => {
  const scope = temp();
  await addExtension(makeConfigurable(), scope);
  const dirs = { agent: scope };
  assert.match((await loadExternalExtensions(dirs)).off[0]!.reason, /needs url \(Moodle URL\) set: `extension config moodle url=<value>`/);

  await setExtensionOptions(scope, "moodle", { url: "https://campus.example.org", token: "s3cret" });
  const lock = await readLock(scope);
  assert.deepEqual(lock.moodle!.options, { url: "https://campus.example.org" });
  assert.equal(JSON.stringify(lock).includes("s3cret"), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(extensionSecretsPath(scope, "moodle"), "utf8")), { token: "s3cret" });

  const { extensions, off } = await loadExternalExtensions(dirs);
  assert.deepEqual(off, []);
  const server = (await extensions[0]!.contribute({} as never)).mcpServers!.moodle as { args: string[]; env: Record<string, string> };
  // The placeholders reach the launcher as they are: the values are read when it starts the server.
  assert.equal(server.env.SITE, "${user_config.url}");
  assert.equal(JSON.stringify(server).includes("s3cret"), false);
  const out = JSON.parse(execFileSync(process.execPath, server.args, { env: { ...process.env, ...server.env } }).toString());
  assert.deepEqual(out, { site: "https://campus.example.org", token: "s3cret", argv: ["--headless=false"] });

  // A value changed later is what the server gets when it starts again.
  await setExtensionOptions(scope, "moodle", { url: "https://other.example.org", headless: "true" });
  const again = JSON.parse(execFileSync(process.execPath, server.args, { env: { ...process.env, ...server.env } }).toString());
  assert.deepEqual(again, { site: "https://other.example.org", token: "s3cret", argv: ["--headless=true"] });
  assert.equal(server.args[0], extensionLauncherPath());

  // Reinstalled, it keeps its values; its states never give the secret.
  await addExtension(makeConfigurable(), scope);
  const [installed] = await listInstalled(dirs);
  const states = await extensionOptionStates(installed!);
  assert.deepEqual(
    states.map(({ key, value, set, isDefault }) => ({ key, value, set, isDefault })),
    [
      { key: "url", value: "https://other.example.org", set: true, isDefault: false },
      { key: "token", value: undefined, set: true, isDefault: false },
      { key: "headless", value: true, set: true, isDefault: false },
    ],
  );
  await assert.rejects(setExtensionOptions(scope, "moodle", { port: "1" }), /no option "port": it has url, token, headless/);
  await assert.rejects(setExtensionOptions(scope, "moodle", { headless: "maybe" }), /headless: "maybe" isn't true or false/);
});

test("a server naming an option its userConfig doesn't declare is off", async () => {
  const scope = temp();
  await addExtension(makeConfigurable({}, { SITE: "${user_config.url}" }), scope);
  assert.match((await loadExternalExtensions({ agent: scope })).off[0]!.reason, /names \$\{user_config\.headless\}, \$\{user_config\.url\}, which its userConfig doesn't declare/);
});

test("the command asks for the options when installing (--set gives them), and config lists them without the secret", async () => {
  const scope = temp();
  const lines: string[] = [];
  const asked: string[] = [];
  const answers: Record<string, string> = { token: "t0ken" };
  const run = (argv: string[]) =>
    runExtensionCommand(["extension", ...argv], {
      dirs: { agent: scope },
      command: "moodler",
      write: (line) => lines.push(line),
      ask: async (question) => {
        asked.push(question);
        return answers[/(\w+) = $/.exec(question)?.[1] ?? ""] ?? "";
      },
    });
  await run(["add", makeConfigurable(), "--set", "url=https://campus.example.org"]);
  // Asked for what --set didn't give: the token and the headless flag (left at its default).
  assert.deepEqual(asked.map((question) => /(\w+) = $/.exec(question)?.[1]), ["token", "headless"]);
  assert.equal(JSON.parse(fs.readFileSync(extensionSecretsPath(scope, "moodle"), "utf8")).token, "t0ken");
  lines.length = 0;
  await run(["config", "moodle"]);
  // Then what guided mode keeps about its tools (#74, #76): nothing yet.
  assert.deepEqual(lines, [
    "  url = https://campus.example.org  (Moodle URL, required)",
    "  token = (set, hidden)  (Token)",
    "  headless = false (default)  (Headless)",
    "In guided mode, moodle's tools that change things ask first (confirm=off runs them without asking):",
    "  (no kept answers; confirm=reset forgets them)",
  ]);
  lines.length = 0;
  await run(["config", "moodle", "headless=true", "--unset", "token"]);
  assert.match(lines[0]!, /options saved in the agent scope/);
  assert.ok(lines.includes("  token = (not set)  (Token)"));
  lines.length = 0;
  await run(["info", "moodle"]);
  assert.ok(lines.some((line) => /^Options {6}url \(Moodle URL, required\), token \(Token, secret\), headless \(Headless\)$/.test(line)), lines.join("\n"));

  // Without --set nor an answer, a required one is left, and the command says how to set it.
  const other = temp();
  lines.length = 0;
  await runExtensionCommand(["extension", "add", makeConfigurable()], { dirs: { agent: other }, command: "moodler", write: (line) => lines.push(line), ask: async () => "" });
  assert.ok(lines.some((line) => line === "It stays off until url is set: `moodler extension config moodle url`."), lines.join("\n"));
});

test("/extensions config in the chat lists and sets an extension's options, never a secret", async () => {
  const scope = temp();
  await addExtension(makeConfigurable(), scope);
  await setExtensionOptions(scope, "moodle", { url: "https://campus.example.org", token: "s3cret" });
  const status = { dirs: { agent: scope }, installed: await listInstalled({ agent: scope }), active: ["moodle"], inactive: [], extensions: [] } as never;
  const listed = await chatExtensionsCommand("/extensions config moodle", status, true);
  assert.equal(listed!.lines.join("\n").includes("s3cret"), false);
  assert.ok(listed!.lines.includes("  token = (set, hidden)  (Token)"));
  const secret = await chatExtensionsCommand("/extensions config moodle token=other", status, true);
  assert.match(secret!.lines[0]!, /token is a secret/);
  assert.equal(JSON.parse(fs.readFileSync(extensionSecretsPath(scope, "moodle"), "utf8")).token, "s3cret");
  const set = await chatExtensionsCommand("/extensions config moodle url=https://b.example.org", status, true);
  assert.deepEqual(set, { lines: [], reconfigured: "moodle" });
  assert.equal((await readLock(scope)).moodle!.options!.url, "https://b.example.org");
});

test("a session's file tools never reach the scopes' secrets, even with the scope readable", async () => {
  const projectDir = temp();
  const scope = path.join(projectDir, "extensions");
  await addExtension(makeConfigurable(), scope);
  await setExtensionOptions(scope, "moodle", { url: "https://campus.example.org", token: "s3cret" });
  // File tools (the sources'), and the scope's folder readable on purpose: its secrets still aren't.
  const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: { project: scope }, extraReadableDirs: [scope] }, temp(), {
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
    extensions: [sources({ dir: path.join(projectDir, "sources") })],
  });
  const hooks = built.options.hooks!.PreToolUse!.flatMap((matcher) => matcher.hooks);
  const denied = async (tool_name: string, tool_input: Record<string, unknown>) => {
    for (const hook of hooks) {
      const output = (await hook({ hook_event_name: "PreToolUse", tool_name, tool_input } as unknown as PreToolUseHookInput, "t", { signal: new AbortController().signal })) as { hookSpecificOutput?: { permissionDecision?: string } };
      if (output.hookSpecificOutput?.permissionDecision === "deny") return true;
    }
    return false;
  };
  assert.equal(await denied("Read", { file_path: path.join(scope, "extensions.lock.json") }), false);
  assert.equal(await denied("Read", { file_path: extensionSecretsPath(scope, "moodle") }), true);
  assert.equal(await denied("Grep", { pattern: "s3cret", path: path.dirname(extensionSecretsPath(scope, "moodle")) }), true);
});

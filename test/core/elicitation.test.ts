import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { query, type ElicitationRequest } from "@anthropic-ai/claude-agent-sdk";
import { createElicitationHandler, fieldValue, formFields, type FormRequest } from "../../src/core/elicitation.js";
import { getInteractionPort, setInteractionPort, type InteractionPort } from "../../src/core/interaction.js";
import { setLanguage } from "../../src/core/messages/index.js";
import { addExtension } from "../../src/core/externalExtensions.js";
import { buildSessionOptions, createInputQueue } from "../../src/core/session.js";
import { createChatController } from "../../src/chat/chatController.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "elicitation-test-"));
const signal = new AbortController().signal;

const SCHEMA = {
  type: "object",
  properties: {
    url: { type: "string", title: "Site URL", description: "The campus." },
    port: { type: "integer", minimum: 1, maximum: 65535, default: 443 },
    role: { type: "string", enum: ["teacher", "student"], enumNames: ["Teacher", "Student"] },
    level: { type: "string", oneOf: [{ const: "a", title: "Basic" }, { const: "b", title: "Advanced" }] },
    days: { type: "array", items: { enum: ["mon", "tue"] } },
    remember: { type: "boolean", default: true },
  },
  required: ["url", "role"],
};

/** Runs `body` with `port` installed, putting back the one there was. */
async function withPort<T>(port: InteractionPort | null, body: () => Promise<T>): Promise<T> {
  const previous = getInteractionPort();
  setInteractionPort(port);
  try {
    return await body();
  } finally {
    setInteractionPort(previous);
  }
}

test("a form's fields from MCP's schema: text, numbers with bounds, choices (enum, titled oneOf, several), yes/no, required, defaults", () => {
  const fields = formFields(SCHEMA);
  assert.deepEqual(
    fields.map((field) => [field.key, field.type, field.required, field.options?.map((option) => option.label) ?? null, field.multiple ?? false]),
    [
      ["url", "string", true, null, false],
      ["port", "integer", false, null, false],
      ["role", "string", true, ["Teacher", "Student"], false],
      ["level", "string", false, ["Basic", "Advanced"], false],
      ["days", "string", false, ["mon", "tue"], true],
      ["remember", "boolean", false, null, false],
    ],
  );
  assert.equal(fields[1]!.default, 443);
  assert.equal(fieldValue(fields[1]!, "8080"), 8080);
  assert.ok(typeof fieldValue(fields[1]!, "8080.5") === "object");
  assert.ok(typeof fieldValue(fields[1]!, "70000") === "object");
  assert.equal(fieldValue(fields[5]!, "yes"), true);
});

test("nobody to ask (autonomous, or no port) declines; a port that shows forms gets it whole", async () => {
  const request: ElicitationRequest = { serverName: "moodle", message: "Which site?", mode: "form", requestedSchema: SCHEMA };
  const runDir = temp();
  assert.deepEqual(await withPort(null, () => createElicitationHandler(runDir, () => true)(request, { signal })), { action: "decline" });
  let shown: FormRequest | undefined;
  const port: InteractionPort = {
    askDecision: async () => "y",
    askManualIntervention: async () => "",
    notify: () => undefined,
    askForm: async (form) => {
      shown = form;
      return { action: "accept", content: { url: "https://campus.example.org", role: "teacher" } };
    },
  };
  assert.deepEqual(await withPort(port, () => createElicitationHandler(runDir, () => false)(request, { signal })), { action: "decline" });
  assert.equal(shown, undefined);
  assert.deepEqual(await withPort(port, () => createElicitationHandler(runDir, () => true)(request, { signal })), { action: "accept", content: { url: "https://campus.example.org", role: "teacher" } });
  assert.equal(shown?.server, "moodle");
  assert.equal(shown?.fields.length, 6);
});

test("a port without forms is asked field by field: shown first, then each value, a bad one asked again", async () => {
  setLanguage("en");
  const request: ElicitationRequest = { serverName: "moodle", message: "Which site?", mode: "form", requestedSchema: { type: "object", properties: { url: SCHEMA.properties.url, port: SCHEMA.properties.port, role: SCHEMA.properties.role, remember: SCHEMA.properties.remember }, required: ["url"] } };
  const texts = ["https://campus.example.org", "lots", "8443"];
  const asked: string[] = [];
  const port: InteractionPort = {
    askDecision: async (prompt) => (asked.push(prompt.title), "y"),
    askManualIntervention: async () => "",
    askText: async (prompt) => (asked.push(prompt.title), texts.shift() ?? ""),
    askChoice: async (prompt, choice) => (asked.push(prompt.title), choice.options[0] === "Teacher" ? "2" : "1"),
    notify: () => undefined,
  };
  const result = await withPort(port, () => createElicitationHandler(temp(), () => true)(request, { signal }));
  assert.deepEqual(result, { action: "accept", content: { url: "https://campus.example.org", port: 8443, role: "student", remember: true } });
  assert.deepEqual(asked, ["moodle asks you", "moodle: Site URL *", "moodle: port", "moodle: port", "moodle: role", "moodle: remember"]);

  // Declined at the first panel: nothing more is asked.
  const declining: InteractionPort = { ...port, askDecision: async () => "n" };
  assert.deepEqual(await withPort(declining, () => createElicitationHandler(temp(), () => true)(request, { signal })), { action: "decline" });
});

test("a page to open is shown, never opened for the person; only https, or http on this computer", async () => {
  let shown: string[] = [];
  const port: InteractionPort = { askDecision: async () => "y", askManualIntervention: async (prompt) => ((shown = prompt.lines), ""), notify: () => undefined };
  const ask = (url: string) => withPort(port, () => createElicitationHandler(temp(), () => true)({ serverName: "moodle", message: "Sign in", mode: "url", url }, { signal }));
  assert.deepEqual(await ask("https://campus.example.org/login"), { action: "accept" });
  assert.ok(shown.includes("https://campus.example.org/login"));
  assert.deepEqual(await ask("http://localhost:8080/login"), { action: "accept" });
  assert.deepEqual(await ask("http://campus.example.org/login"), { action: "decline" });
  assert.deepEqual(await ask("file:///etc/passwd"), { action: "decline" });
});

test("a chat with panels in its state shows a form whole, and its answer goes back typed", async () => {
  const controller = await createChatController({} as never, { panels: "state", promptSuggestions: false, runQuery: () => ({ events: (async function* () {})(), interrupt: async () => undefined, close: () => undefined, supportedCommands: async () => [], contextUsage: async () => null }) });
  try {
    const pending = getInteractionPort()!.askForm!({ server: "moodle", message: "Which site?", fields: formFields(SCHEMA) }, signal);
    const panel = controller.getState().panel!;
    assert.equal(panel.kind, "form");
    assert.equal(panel.kind === "form" && panel.form.fields[0]!.key, "url");
    controller.answer(panel.id, JSON.stringify({ action: "accept", content: { url: "https://campus.example.org", role: "teacher" } }));
    assert.deepEqual(await pending, { action: "accept", content: { url: "https://campus.example.org", role: "teacher" } });
    assert.equal(controller.getState().panel, null);
    const declined = getInteractionPort()!.askForm!({ server: "moodle", message: "Which site?", fields: [] }, signal);
    controller.answer(controller.getState().panel!.id, "not json");
    assert.deepEqual(await declined, { action: "cancel" });
  } finally {
    controller.close();
  }
});

// The SDK's CLI: skipped where there's none. No model is called: the server asks on its own.
const binary = path.resolve("node_modules", "@anthropic-ai", `claude-agent-sdk-${process.platform}-${process.arch}`, process.platform === "win32" ? "claude.exe" : "claude");

test("a session hands an installed server's elicitation to the person, and their answer back to the server", { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 90_000 }, async () => {
  const root = temp();
  const log = path.join(root, "answers.jsonl");
  const plugin = path.join(root, "asker");
  fs.mkdirSync(path.join(plugin, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(plugin, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "asker", description: "Asks." }));
  fs.writeFileSync(path.join(plugin, ".mcp.json"), JSON.stringify({ mcpServers: { asker: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"], env: { ASKER_LOG: log } } } }));
  // It asks a while after it starts (one sent before the SDK is ready is cancelled: measured),
  // and writes down the answer.
  fs.writeFileSync(
    path.join(plugin, "server.mjs"),
    [
      'import fs from "node:fs";',
      'import readline from "node:readline";',
      "const send = (m) => process.stdout.write(JSON.stringify(m) + String.fromCharCode(10));",
      'readline.createInterface({ input: process.stdin }).on("line", (line) => {',
      "  const m = JSON.parse(line);",
      '  if (m.method === "initialize") send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "asker", version: "1" } } });',
      '  else if (m.method === "notifications/initialized") setTimeout(() => send({ jsonrpc: "2.0", id: 900, method: "elicitation/create", params: { message: "Which site?", requestedSchema: { type: "object", properties: { url: { type: "string", title: "Site URL" } }, required: ["url"] } } }), 4000);',
      "  else if (m.id === 900) fs.appendFileSync(process.env.ASKER_LOG, JSON.stringify(m.result) + String.fromCharCode(10));",
      '  else if (m.method === "tools/list") send({ jsonrpc: "2.0", id: m.id, result: { tools: [] } });',
      "  else if (m.id !== undefined && m.method) send({ jsonrpc: '2.0', id: m.id, result: {} });",
      "});",
    ].join("\n"),
  );
  const scope = path.join(root, "extensions");
  await addExtension(plugin, scope);
  const built = await buildSessionOptions({ mode: "guided", projectDir: temp(), extensionDirs: { agent: scope } }, temp(), {
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
  });
  const forms: FormRequest[] = [];
  const port: InteractionPort = {
    askDecision: async () => "y",
    askManualIntervention: async () => "",
    notify: () => undefined,
    askForm: async (form) => (forms.push(form), { action: "accept", content: { url: "https://campus.example.org" } }),
  };
  await withPort(port, async () => {
    const input = createInputQueue();
    const session = query({ prompt: input.iterable, options: built.options });
    try {
      for (const start = Date.now(); !fs.existsSync(log); await new Promise((resolve) => setTimeout(resolve, 200))) {
        if (Date.now() - start > 30_000) assert.fail("the server never got an answer");
      }
      assert.deepEqual(JSON.parse(fs.readFileSync(log, "utf8").trim()), { action: "accept", content: { url: "https://campus.example.org" } });
      assert.equal(forms[0]?.server, "asker");
      assert.equal(forms[0]?.message, "Which site?");
    } finally {
      input.end();
      session.close();
    }
  });
});

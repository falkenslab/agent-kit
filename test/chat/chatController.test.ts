import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createChatController, type ChatEvent, type ChatSettings } from "../../src/chat/chatController.js";
import { getInteractionPort } from "../../src/core/interaction.js";
import { createModeControl } from "../../src/core/session.js";
import { createRunFolder, createRunStore } from "../../src/core/runs.js";
import { addExtension, readLock } from "../../src/core/externalExtensions.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";
import type { AgentEvent, AgentRun } from "../../src/core/runner.js";

const temp = () => mkdtempSync(path.join(tmpdir(), "chat-controller-test-"));
const turnEnd: AgentEvent = { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" };

/** An agent run that answers each message the person sends with what `reply` gives (it may ask through the port). */
function fakeAgent(reply: (text: string) => Promise<AgentEvent[]> | AgentEvent[]): NonNullable<ChatSettings["runQuery"]> {
  return (prompt: AsyncIterable<SDKUserMessage>): AgentRun => {
    async function* events(): AsyncGenerator<AgentEvent> {
      for await (const message of prompt) {
        for (const event of await reply(String(message.message.content))) yield event;
        yield turnEnd;
      }
    }
    return {
      events: events(),
      interrupt: async () => undefined,
      close: () => undefined,
      supportedCommands: async () => [{ name: "compact", description: "", argumentHint: "" }],
      contextUsage: async () => ({ percentage: 12 }) as never,
    };
  };
}

test("a turn: the person's line, the tool calls with their results and the reply, as plain data and as events, and in the session log", async () => {
  const sessionLogPath = path.join(temp(), "session.log");
  let copied = "";
  const controller = await createChatController({} as Options, {
    sessionLogPath,
    commands: { copy: () => void (copied = controller.lastReply()) },
    promptSuggestions: false,
    runQuery: fakeAgent((text) => [
      { type: "action", toolName: "Read", input: { file_path: "notes.md" }, toolUseId: "t1" },
      { type: "tool-result", toolUseId: "t1", toolName: "Read", isError: false, text: "two lines" },
      { type: "text", text: `You said: ` },
      { type: "text", text: text },
    ]),
  });
  const events: ChatEvent["type"][] = [];
  controller.onEvent((event) => events.push(event.type));
  await controller.start();
  await controller.send("hello");

  const state = controller.getState();
  assert.equal(state.busy, false);
  assert.deepEqual(
    state.transcript.map((entry) => entry.kind),
    ["user", "tools", "agent", "turn-summary"],
  );
  const tools = state.transcript[1];
  assert.ok(tools?.kind === "tools");
  assert.deepEqual(tools.calls[0], { id: "t1", toolName: "Read", label: "Reading notes.md", result: { isError: false, text: "two lines" }, children: [] });
  assert.deepEqual(state.transcript[2], { id: state.transcript[2]!.id, kind: "agent", text: "You said: hello" });
  assert.equal(controller.lastReply(), "You said: hello");
  assert.deepEqual(events, ["user", "turn-start", "agent", "agent", "agent", "agent", "agent", "turn-end"]);
  assert.ok(state.commands.includes("compact") && state.commands.includes("exit"));
  // The state is plain data: it survives JSON.
  assert.deepEqual(JSON.parse(JSON.stringify(state)).transcript, state.transcript);

  // A view's own command (a terminal's /copy) is logged like any line and sees the latest reply.
  await controller.send("/copy");
  assert.equal(copied, "You said: hello");
  // An unknown command never reaches the agent; an exit command ends the chat.
  await controller.send("/nope");
  assert.match(JSON.stringify(controller.getState().transcript.at(-1)), /nope/);
  assert.equal(await controller.send("/exit"), "exit");
  controller.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const log = readFileSync(sessionLogPath, "utf8");
  assert.match(log, /> hello/);
  assert.match(log, /> \/copy/);
  assert.match(log, /\[action\] Reading notes\.md/);
  assert.match(log, /You said: hello/);
});

test("with panels in the state, a checkpoint waits there until answered", async () => {
  const controller = await createChatController({} as Options, {
    panels: "state",
    promptSuggestions: false,
    runQuery: fakeAgent(async () => {
      const answer = await getInteractionPort()!.askDecision({ title: "Send the email?", lines: ["to: crew"] }, new AbortController().signal);
      return [{ type: "text", text: `answered ${answer}` }];
    }),
  });
  const turn = controller.send("go");
  while (!controller.getState().panel) await new Promise((resolve) => setTimeout(resolve, 5));
  const panel = controller.getState().panel!;
  assert.equal(panel.kind, "decision");
  assert.equal(panel.prompt.title, "Send the email?");
  controller.answer(panel.id, "y");
  await turn;
  assert.equal(controller.getState().panel, null);
  assert.equal(controller.lastReply(), "answered y");
  controller.close();
  assert.equal(getInteractionPort(), null);
});

test("the mode switches as the session allows, and plan mode toggles back", async () => {
  const modeControl = createModeControl("guided");
  const controller = await createChatController({} as Options, { modeControl, promptSuggestions: false, runQuery: fakeAgent(() => []) });
  assert.equal(controller.getState().mode, "guided");
  assert.ok(controller.getState().switchableModes.includes("plan"));
  controller.setMode("interactive");
  assert.equal(controller.getState().mode, "interactive");
  await controller.send("/plan");
  assert.equal(controller.getState().mode, "plan");
  controller.togglePlan();
  assert.equal(controller.getState().mode, "interactive");
  controller.close();

  const locked = await createChatController({} as Options, { modeControl: createModeControl("autonomous"), promptSuggestions: false, runQuery: fakeAgent(() => []) });
  locked.cycleMode();
  assert.equal(locked.getState().mode, "autonomous");
  assert.equal(locked.getState().transcript.at(-1)?.kind, "notice");
  locked.close();
});

test("with runs, the run's conversation is drawn, and /resume switches to another as a choice in the state", async () => {
  const runsDir = temp();
  const older = await createRunFolder(runsDir);
  const at = "2026-09-01T10:00:00.000Z";
  await createRunStore(older.dir).append({ projectKey: "p", sessionId: "old" }, [
    { type: "user", uuid: "u1", timestamp: at, message: { role: "user", content: "an old question" } },
    { type: "assistant", uuid: "a1", timestamp: at, message: { role: "assistant", content: [{ type: "text", text: "an old answer" }] } },
  ]);
  const opened: (string | null)[] = [];
  const controller = await createChatController(
    async (run) => {
      opened.push(run.sessionId);
      return { options: {} as Options };
    },
    { runsDir, promptSuggestions: false, runQuery: fakeAgent(() => []) },
  );
  await controller.start();
  assert.deepEqual(opened, [null]); // a new run: nothing to draw yet
  assert.deepEqual(controller.getState().transcript, []);

  const resuming = controller.send("/resume");
  while (!controller.getState().choice) await new Promise((resolve) => setTimeout(resolve, 5));
  const choice = controller.getState().choice!;
  const option = choice.options.find((candidate) => candidate.value === older.dir)!;
  assert.match(option.label, /an old question/);
  controller.choose(option.value);
  await resuming;
  assert.deepEqual(opened, [null, "old"]);
  assert.equal(path.resolve(controller.getState().run!.dir), path.resolve(older.dir));
  assert.deepEqual(
    controller.getState().transcript.map((entry) => (entry.kind === "user" || entry.kind === "agent" ? [entry.kind, entry.text] : entry.kind)),
    [
      ["user", "an old question"],
      ["agent", "an old answer"],
    ],
  );
  // A new conversation: a new run, nothing in the transcript, the old one still listed.
  await controller.newConversation();
  assert.notEqual(path.resolve(controller.getState().run!.dir), path.resolve(older.dir));
  assert.deepEqual(controller.getState().transcript, []);
  assert.deepEqual(opened, [null, "old", null]);
  controller.close();
});

test("an installed extension is turned off and on as an action: its lock, a notice, the session opened again, no line of the person's", async () => {
  const projectDir = temp();
  const source = path.join(temp(), "dice");
  mkdirSync(path.join(source, ".claude-plugin"), { recursive: true });
  writeFileSync(path.join(source, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "dice", description: "Rolls dice." }));
  const scope = path.join(projectDir, "extensions");
  await addExtension(source, scope);
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
  let opened = 0;
  const controller = await createChatController(
    async (run) => {
      opened++;
      return buildSessionOptions({ mode: "guided", projectDir, extensionDirs: { project: scope } }, run.dir, spec, { run });
    },
    { runsDir: temp(), promptSuggestions: false, runQuery: fakeAgent(() => []) },
  );
  assert.deepEqual(controller.getState().extensions?.active, ["dice"]);
  assert.equal(controller.getState().extensions?.about.dice?.description, "Rolls dice.");
  await controller.setExtension("dice", false);
  assert.equal((await readLock(scope)).dice?.enabled, false);
  assert.equal(opened, 2);
  assert.deepEqual(controller.getState().extensions?.active, []);
  assert.equal(controller.getState().transcript.some((entry) => entry.kind === "user"), false);
  assert.equal(controller.getState().transcript.at(-1)?.kind, "notice");
  await controller.setExtension("dice", true);
  assert.deepEqual(controller.getState().extensions?.active, ["dice"]);
  controller.close();
});

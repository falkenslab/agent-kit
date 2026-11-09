import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createChatController, type TranscriptCall, type TranscriptEntry } from "../../src/chat/chatController.js";
import { createRunFolder, createRunStore, readConversation, readRunSession } from "../../src/core/runs.js";
import { toolResultMeta, type AgentEvent, type AgentRun } from "../../src/core/runner.js";

const turnEnd: AgentEvent = { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" };
const callsOf = (transcript: TranscriptEntry[]): TranscriptCall[] => transcript.flatMap((entry) => (entry.kind === "tools" ? entry.calls : []));

function agentGiving(events: AgentEvent[]) {
  return (prompt: AsyncIterable<SDKUserMessage>): AgentRun => {
    async function* run(): AsyncGenerator<AgentEvent> {
      for await (const message of prompt) {
        void message;
        yield* events;
        yield turnEnd;
      }
    }
    return { events: run(), interrupt: async () => undefined, close: () => undefined, supportedCommands: async () => [], contextUsage: async () => null };
  };
}

test("toolResultMeta takes the _meta object and nothing else", () => {
  assert.deepEqual(toolResultMeta({ content: [], _meta: { page: "u" } }), { page: "u" });
  for (const holder of [undefined, null, "text", [], { content: [] }, { _meta: "text" }, { _meta: [1] }, { _meta: null }]) assert.equal(toolResultMeta(holder), undefined);
});

test("a tool's _meta is on its transcript call; a tool without one has no meta", async () => {
  const controller = await createChatController({} as Options, {
    promptSuggestions: false,
    runQuery: agentGiving([
      { type: "action", toolName: "mcp__moodle__edit", input: {}, toolUseId: "a" },
      { type: "tool-result", toolUseId: "a", toolName: "mcp__moodle__edit", isError: false, text: "ok", meta: { page: "https://example.test/1" } },
      { type: "action", toolName: "mcp__moodle__list", input: {}, toolUseId: "b" },
      { type: "tool-result", toolUseId: "b", toolName: "mcp__moodle__list", isError: false, text: "ok" },
    ]),
  });
  await controller.send("go");
  const [edit, list] = callsOf(controller.getState().transcript);
  assert.deepEqual(edit!.meta, { page: "https://example.test/1" });
  assert.equal("meta" in list!, false);
  controller.close();
});

test("a resumed conversation has its tool calls back in their place, with their results and _meta", async () => {
  const runsDir = mkdtempSync(path.join(tmpdir(), "tool-meta-test-"));
  const older = await createRunFolder(runsDir);
  const timestamp = "2026-09-01T10:00:00.000Z";
  await createRunStore(older.dir).append({ projectKey: "p", sessionId: "old" }, [
    { type: "user", uuid: "1", timestamp, message: { role: "user", content: "fix it" } },
    { type: "assistant", uuid: "2", timestamp, message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "mcp__moodle__edit", input: { id: 7 } }] } },
    { type: "user", uuid: "3", timestamp, message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: [{ type: "text", text: "saved" }] }] }, mcpMeta: { _meta: { page: "https://example.test/7" } } },
    { type: "attachment", uuid: "3b", timestamp, attachment: { type: "queued_command", commandMode: "prompt", prompt: "<system-reminder>a note</system-reminder>\n\nand this too" } },
    { type: "attachment", uuid: "3c", timestamp, attachment: { type: "queued_command", commandMode: "task-notification", prompt: "not the person's" } },
    { type: "assistant", uuid: "4", timestamp, message: { role: "assistant", content: [{ type: "tool_use", id: "t2", name: "mcp__moodle__list", input: {} }] } },
    { type: "user", uuid: "5", timestamp, message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t2", is_error: true, content: "denied" }] } },
    { type: "assistant", uuid: "6", timestamp, message: { role: "assistant", content: [{ type: "tool_use", id: "t3", name: "TodoWrite", input: { todos: [] } }] } },
    { type: "assistant", uuid: "7", timestamp, message: { role: "assistant", content: [{ type: "text", text: "done" }] } },
    { type: "assistant", uuid: "8", timestamp, message: { role: "assistant", content: [{ type: "tool_use", id: "t4", name: "mcp__moodle__cut", input: {} }] } },
  ]);
  const controller = await createChatController(async () => ({ options: {} as Options }), {
    runsDir,
    promptSuggestions: false,
    formatAction: (name) => `label of ${name}`,
    runQuery: agentGiving([]),
  });
  await controller.resume(older.dir);

  assert.equal(await readRunSession(older.dir), "old");
  const transcript = controller.getState().transcript;
  assert.deepEqual(transcript.map((entry) => entry.kind), ["user", "tools", "user", "tools", "agent", "tools"]);
  assert.equal((transcript[2] as { text: string }).text, "and this too");
  const [edit, list, cut] = callsOf(transcript);
  assert.equal(edit!.label, "label of mcp__moodle__edit");
  assert.deepEqual(edit!.result, { isError: false, text: "saved" });
  assert.deepEqual(edit!.meta, { page: "https://example.test/7" });
  assert.deepEqual(list!.result, { isError: true, text: "denied" });
  assert.equal("meta" in list!, false);
  // Cut off by the end of the session: not left looking as if it were still running.
  assert.deepEqual(cut!.result, { isError: false, text: "" });
  // What the terminals redraw, and listing runs, stay text only.
  assert.deepEqual(await readConversation(older.dir), [
    { role: "user", text: "fix it" },
    { role: "user", text: "and this too" },
    { role: "assistant", text: "done" },
  ]);
  controller.close();
});

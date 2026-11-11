import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createChatController, type ChatSettings } from "../../src/chat/chatController.js";
import { createRunFolder, createRunStore } from "../../src/core/runs.js";
import type { AgentEvent, AgentRun } from "../../src/core/runner.js";

const turnEnd: AgentEvent = { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" };

/** Each run (one per session opened) answers every message with "reply <run>". */
function agentPerSession(): { runQuery: NonNullable<ChatSettings["runQuery"]>; received: string[][] } {
  const received: string[][] = [];
  return {
    received,
    runQuery: (prompt: AsyncIterable<SDKUserMessage>): AgentRun => {
      const index = received.push([]) - 1;
      async function* events(): AsyncGenerator<AgentEvent> {
        for await (const message of prompt) {
          received[index]!.push(String(message.message.content));
          yield { type: "text", text: `reply ${index}` };
          yield turnEnd;
        }
      }
      return { events: events(), interrupt: async () => undefined, close: () => undefined, supportedCommands: async () => [], contextUsage: async () => null };
    },
  };
}

/** Opens the first session at once and every later one slowly: the window #93 is about. */
function slowOpener() {
  let opens = 0;
  return async () => {
    if (opens++ > 0) await new Promise((resolve) => setTimeout(resolve, 40));
    return { options: {} as Options };
  };
}

const lines = (controller: Awaited<ReturnType<typeof createChatController>>) => controller.getState().transcript.flatMap((entry) => (entry.kind === "user" || entry.kind === "agent" ? [`${entry.kind}: ${entry.text}`] : []));

test("a line sent while a new conversation opens goes to the new session, and is answered there", async () => {
  const agent = agentPerSession();
  const runsDir = mkdtempSync(path.join(tmpdir(), "switch-test-"));
  const controller = await createChatController(slowOpener(), { runsDir, promptSuggestions: false, runQuery: agent.runQuery });
  const opening = controller.newConversation();
  assert.equal(await controller.steer("too soon"), false);
  await controller.send("hello");
  await opening;
  assert.deepEqual(agent.received, [[], ["hello"]]);
  assert.deepEqual(lines(controller), ["user: hello", "agent: reply 1"]);
  assert.equal(controller.getState().busy, false);
  controller.close();
});

test("a line sent while an earlier run is being resumed goes to it, after its conversation", async () => {
  const agent = agentPerSession();
  const runsDir = mkdtempSync(path.join(tmpdir(), "switch-test-"));
  const older = await createRunFolder(runsDir);
  const timestamp = "2026-09-01T10:00:00.000Z";
  await createRunStore(older.dir).append({ projectKey: "p", sessionId: "old" }, [
    { type: "user", uuid: "1", timestamp, message: { role: "user", content: "before" } },
    { type: "assistant", uuid: "2", timestamp, message: { role: "assistant", content: [{ type: "text", text: "earlier" }] } },
  ]);
  const controller = await createChatController(slowOpener(), { runsDir, promptSuggestions: false, runQuery: agent.runQuery });
  // Sent at once: while resume() still reads the runs, before it opens the session.
  const resuming = controller.resume(older.dir);
  await controller.send("again");
  await resuming;
  assert.deepEqual(agent.received, [[], ["again"]]);
  assert.deepEqual(lines(controller), ["user: before", "agent: earlier", "user: again", "agent: reply 1"]);
  assert.equal(controller.getState().busy, false);
  controller.close();
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createChatController, type ChatSettings } from "../../src/chat/chatController.js";
import type { AgentEvent, AgentRun } from "../../src/core/runner.js";

const turnEnd: AgentEvent = { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" };
const idle: AgentEvent = { type: "session-idle" };
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

/** An agent run the test drives: what reached it, and the events it gives when told to. */
function drivenAgent(): { runQuery: NonNullable<ChatSettings["runQuery"]>; received: SDKUserMessage[]; give: (...events: AgentEvent[]) => Promise<void> } {
  const received: SDKUserMessage[] = [];
  const waiting: AgentEvent[] = [];
  let wake: (() => void) | null = null;
  return {
    received,
    async give(...events) {
      waiting.push(...events);
      wake?.();
      await tick();
    },
    runQuery: (prompt: AsyncIterable<SDKUserMessage>): AgentRun => {
      void (async () => {
        for await (const message of prompt) received.push(message);
      })();
      async function* events(): AsyncGenerator<AgentEvent> {
        while (true) {
          const event = waiting.shift();
          if (event) yield event;
          else await new Promise<void>((resolve) => (wake = resolve));
        }
      }
      return { events: events(), interrupt: async () => undefined, close: () => undefined, supportedCommands: async () => [], contextUsage: async () => null };
    },
  };
}

async function chatInTurn() {
  const agent = drivenAgent();
  const controller = await createChatController({} as Options, { promptSuggestions: false, runQuery: agent.runQuery });
  let finished = false;
  const turn = controller.send("first").then(() => void (finished = true));
  while (agent.received.length < 1) await tick();
  return { agent, controller, turn, isFinished: () => finished };
}

const kinds = (controller: Awaited<ReturnType<typeof chatInTurn>>["controller"]) => controller.getState().transcript.flatMap((entry) => (entry.kind === "user" || entry.kind === "agent" ? [`${entry.kind}: ${entry.text}`] : []));

test("a message sent during a turn goes in with priority next, stays where it was sent, and the turn lasts until the session is idle", async () => {
  const { agent, controller, turn, isFinished } = await chatInTurn();
  await agent.give({ type: "text", text: "working" });
  assert.equal(await controller.steer("  and this too  "), true);
  await tick();
  assert.equal(agent.received[0]!.priority, undefined);
  assert.equal(agent.received[1]!.priority, "next");
  assert.equal(agent.received[1]!.message.content, "and this too");
  await agent.give({ type: "text", text: "done" }, turnEnd);
  assert.equal(isFinished(), false);
  assert.equal(controller.getState().busy, true);
  await agent.give(idle);
  await turn;
  assert.equal(controller.getState().busy, false);
  assert.deepEqual(kinds(controller), ["user: first", "agent: working", "user: and this too", "agent: done"]);
  controller.close();
});

test("with no tool call left it's answered in a turn of its own: the first turn-end doesn't end it", async () => {
  const { agent, controller, turn, isFinished } = await chatInTurn();
  await controller.steer("one more");
  await agent.give({ type: "text", text: "first reply" }, turnEnd);
  assert.equal(isFinished(), false);
  await agent.give({ type: "text", text: " second reply" }, turnEnd);
  assert.equal(isFinished(), false);
  await agent.give(idle);
  await turn;
  assert.equal(controller.lastReply(), "first reply second reply");
  assert.equal(controller.getState().turns, 2);
  assert.deepEqual(kinds(controller), ["user: first", "user: one more", "agent: first reply", "agent:  second reply"]);
  controller.close();
});

test("an idle from before the message doesn't end the turn, nor one after it that has no turn-end yet", async () => {
  const { agent, controller, turn, isFinished } = await chatInTurn();
  await controller.steer("one more");
  await agent.give(idle);
  assert.equal(isFinished(), false);
  await agent.give(turnEnd);
  // A message right after the last turn-end: the idle on its way is from before it.
  await controller.steer("and another");
  await agent.give(idle);
  assert.equal(isFinished(), false);
  await agent.give(turnEnd, idle);
  await turn;
  assert.equal(controller.getState().busy, false);
  controller.close();
});

test("a turn nothing was sent into ends at its turn-end, and the idle that follows does nothing to the next one", async () => {
  const { agent, controller, turn, isFinished } = await chatInTurn();
  await agent.give(turnEnd);
  await turn;
  assert.equal(isFinished(), true);
  const next = controller.send("second");
  while (agent.received.length < 2) await tick();
  await agent.give(idle);
  assert.equal(controller.getState().busy, true);
  await agent.give(turnEnd);
  await next;
  assert.equal(controller.getState().busy, false);
  controller.close();
});

test("an interrupt reaches what's left to answer after a turn-end", async () => {
  const agent = drivenAgent();
  const run = agent.runQuery;
  let interrupts = 0;
  const controller = await createChatController({} as Options, {
    promptSuggestions: false,
    runQuery: (prompt, options) => ({ ...run(prompt, options), interrupt: async () => void interrupts++ }),
  });
  const turn = controller.send("first");
  while (agent.received.length < 1) await tick();
  await controller.steer("more");
  controller.interrupt();
  await agent.give(turnEnd);
  controller.interrupt();
  assert.equal(interrupts, 2);
  await agent.give(turnEnd, idle);
  await turn;
  controller.close();
});

test("steer refuses, and sends nothing, with no turn running, for a slash command, an exit line or an empty one", async () => {
  const historyPath = path.join(mkdtempSync(path.join(tmpdir(), "steer-test-")), "history.json");
  const agent = drivenAgent();
  const controller = await createChatController({} as Options, { promptSuggestions: false, runQuery: agent.runQuery, historyPath });
  assert.equal(await controller.steer("no turn yet"), false);
  const turn = controller.send("first");
  while (agent.received.length < 1) await tick();
  for (const line of ["/extensions install x", "/EXIT", "/quit", "   "]) assert.equal(await controller.steer(line), false, line);
  await tick();
  assert.equal(agent.received.length, 1);
  assert.deepEqual(controller.getState().history, ["first"]);
  assert.equal(await controller.steer("a real one"), true);
  assert.deepEqual(controller.getState().history, ["first", "a real one"]);
  await agent.give(turnEnd, idle);
  await turn;
  controller.close();
});

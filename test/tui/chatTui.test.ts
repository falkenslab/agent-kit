import { test } from "node:test";
import assert from "node:assert/strict";
import { drainTurn } from "../../src/tui/chatTui.js";
import type { AgentEvent } from "../../src/core/runner.js";

/** A fake multi-turn `run.events` source, shaped like `runner.ts`'s own generator. */
async function* fakeEvents(): AsyncGenerator<AgentEvent> {
  yield { type: "text", text: "turn 1 reply" };
  yield { type: "action", toolName: "Read", input: { file_path: "a.txt" } };
  yield { type: "turn-end", status: "success", failed: false, resultText: "turn 1 reply", errorText: "" };
  yield { type: "text", text: "turn 2 reply" };
  yield { type: "turn-end", status: "success", failed: false, resultText: "turn 2 reply", errorText: "" };
}

test("drainTurn stops at turn-end without closing the shared generator", async () => {
  const events = fakeEvents()[Symbol.asyncIterator]();

  const firstTurn: AgentEvent[] = [];
  await drainTurn(events, (event) => firstTurn.push(event));
  assert.deepEqual(
    firstTurn.map((e) => e.type),
    ["text", "action", "turn-end"],
  );

  const secondTurn: AgentEvent[] = [];
  await drainTurn(events, (event) => secondTurn.push(event));
  assert.deepEqual(
    secondTurn.map((e) => e.type),
    ["text", "turn-end"],
  );
});

test("drainTurn returns without calling onEvent once the source is exhausted", async () => {
  async function* empty(): AsyncGenerator<AgentEvent> {}
  const events = empty()[Symbol.asyncIterator]();

  let calls = 0;
  await drainTurn(events, () => {
    calls += 1;
  });
  assert.equal(calls, 0);
});

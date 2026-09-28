import { test } from "node:test";
import assert from "node:assert/strict";
import { createChatInput } from "../../../src/tui/ink/runChatInk.js";

test("a line submitted while the loop waits goes straight to it", async () => {
  const input = createChatInput();
  const next = input.next([]);
  assert.equal(input.getSnapshot().prompting, true);
  input.submit("hello");
  assert.equal(await next, "hello");
  assert.equal(input.getSnapshot().prompting, false);
});

test("lines submitted during a turn are queued and handed over in order", async () => {
  const input = createChatInput();
  input.submit("first");
  input.submit("   "); // nothing to queue
  input.submit("second");
  assert.deepEqual(input.getSnapshot().queued, ["first", "second"]);

  assert.equal(await input.next([]), "first");
  assert.deepEqual(input.getSnapshot().queued, ["second"]);
  assert.equal(await input.next([]), "second");
  assert.equal(input.getSnapshot().queued.length, 0);
  assert.equal(input.getSnapshot().prompting, false); // only waits once the queue is empty
});

test("asking to leave during a turn ends the chat at the next prompt", async () => {
  const input = createChatInput();
  input.submit(null);
  assert.equal(await input.next([]), null);
});

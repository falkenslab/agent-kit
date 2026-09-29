import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";
import { createChatInput } from "../../../src/tui/ink/runChatInk.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

test("a resumed conversation is redrawn without reaching the session log", () => {
  const logged: string[] = [];
  const model = createSessionModel({ onWrite: (text) => logged.push(text) });
  model.writeLine("welcome");
  model.reset();
  assert.deepEqual(model.getSnapshot().items, []);

  model.replay(
    [
      { role: "user", text: "tell me a joke" },
      { role: "assistant", text: "**Arrr**, here it goes" },
    ],
    (text) => `> ${text}`,
  );
  const items = model.getSnapshot().items;
  assert.deepEqual(
    items.map((item) => [item.kind ?? null, stripAnsi(item.text)]),
    [
      ["user", "> tell me a joke"],
      [null, ""],
      ["agent", "● Arrr, here it goes"],
    ],
  );
  assert.equal(model.getSnapshot().turns, 1);
  assert.deepEqual(logged, ["welcome\n"]);
});

test("the chat's picker shows in place of the prompt and settles with the choice", async () => {
  const input = createChatInput();
  const chosen = input.pick("Resume a conversation", [{ label: "1. today", value: "run-1" }]);
  const picker = input.getSnapshot().picker;
  assert.equal(picker?.title, "Resume a conversation");
  picker?.resolve("run-1");
  assert.equal(await chosen, "run-1");
  assert.equal(input.getSnapshot().picker, null);

  const cancelled = input.pick("Resume a conversation", []);
  input.getSnapshot().picker?.resolve(null);
  assert.equal(await cancelled, null);
});

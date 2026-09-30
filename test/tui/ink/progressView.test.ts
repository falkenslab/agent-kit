import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";
import { progressRenderer } from "../../../src/tui/ink/progressView.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

function setup() {
  const logged: string[] = [];
  const model = createSessionModel({ onWrite: (text) => logged.push(text) });
  const renderer = progressRenderer(model);
  const shown = () => model.getSnapshot().items.map((item) => stripAnsi(item.text)).filter(Boolean);
  return { renderer, shown, logged };
}

test("writeLine() text shows in the progress view, and reaches the log", () => {
  const { renderer, shown, logged } = setup();
  renderer.writeLine("Interrupting… (Ctrl+C again to exit without waiting)");
  assert.deepEqual(shown(), ["Interrupting… (Ctrl+C again to exit without waiting)"]);
  assert.equal(logged.join(""), "Interrupting… (Ctrl+C again to exit without waiting)\n");
});

test("write() text shows once its line ends, or when the line is ended", () => {
  const { renderer, shown, logged } = setup();
  renderer.write("Saving ");
  assert.equal(renderer.atLineStart, false);
  assert.deepEqual(shown(), []);
  renderer.write("the report…\nDone");
  assert.deepEqual(shown(), ["Saving the report…"]);
  renderer.endLine();
  assert.deepEqual(shown(), ["Saving the report…", "Done"]);
  assert.equal(renderer.atLineStart, true);
  assert.equal(logged.join(""), "Saving the report…\nDone\n");
});

test("events still go through the model", () => {
  const { renderer, shown } = setup();
  renderer.render({ type: "info", text: "compacting", level: "info" });
  assert.deepEqual(shown(), ["(compacting)"]);
});

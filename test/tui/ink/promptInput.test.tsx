/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { PromptInput } from "../../../src/tui/ink/PromptInput.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));
const ENTER = "\r";

afterEach(() => cleanup());

function setup(options: { history?: string[]; queued?: string[] } = {}) {
  const submitted: string[] = [];
  const queued = [...(options.queued ?? [])];
  const view = render(
    <PromptInput
      label="> "
      history={options.history ?? []}
      commands={[]}
      onSubmit={(line) => submitted.push(line)}
      onExit={() => {}}
      onRecallQueued={() => queued.pop() ?? null}
    />,
  );
  const type = async (...chunks: string[]) => {
    for (const chunk of chunks) {
      view.stdin.write(chunk);
      await settle();
    }
  };
  const screen = () => stripAnsi(view.lastFrame() ?? "");
  return { submitted, queued, type, screen };
}

test("a multi-line paste shows as one token and is sent whole", async () => {
  const { submitted, type, screen } = setup();
  await settle();
  await type("look: ", "one\r\ntwo\r\nthree");
  await new Promise((resolve) => setTimeout(resolve, 150)); // a human pause after pasting
  await type(" ok?");
  assert.match(screen(), /> look: \[Pasted text #1 \+2 lines\] ok\?/);
  await type(ENTER);
  assert.deepEqual(submitted, ["look: one\ntwo\nthree ok?"]);
});

test("Backspace right after a pasted block removes it whole", async () => {
  const { submitted, type } = setup();
  await settle();
  await type("a\rb", "\x7f", "ok", ENTER);
  assert.deepEqual(submitted, ["ok"]);
});

test("backslash + Enter and Ctrl+J write a multi-line prompt", async () => {
  const { submitted, type, screen } = setup();
  await settle();
  await type("first\\", ENTER, "second", "\n", "third");
  // trimEnd: the cursor after "third" is a space drawn in inverse video, which Ink only
  // trims from the line when colors are off (as in CI); in a real terminal it stays.
  assert.deepEqual(
    screen()
      .split("\n")
      .slice(0, 3)
      .map((line) => line.trimEnd()),
    ["> first", "  second", "  third"],
  );
  await type(ENTER);
  assert.deepEqual(submitted, ["first\nsecond\nthird"]);
});

test("Ctrl+W, Ctrl+K and Ctrl+← edit by words and to the line end", async () => {
  const { submitted, type } = setup();
  await settle();
  await type("one two three", "\x17"); // Ctrl+W: "one two "
  await type("\x1b[1;5D", "\x0b"); // Ctrl+←, Ctrl+K: "one "
  await type("four", ENTER);
  assert.deepEqual(submitted, ["one four"]);
});

test("Ctrl+R finds older matches; Enter takes one without sending, Esc restores", async () => {
  const { submitted, type, screen } = setup({ history: ["a joke", "hello", "another joke"] });
  await settle();
  await type("\x12", "jok");
  assert.match(screen(), /\(reverse-i-search\)'jok': another joke/);
  await type("\x12");
  assert.match(screen(), /'jok': a joke/);
  await type(ENTER);
  assert.deepEqual(submitted, []); // taken into the prompt, not sent
  await type(ENTER);
  assert.deepEqual(submitted, ["a joke"]);

  await type("draft", "\x12", "hello", "\x1b");
  await type(ENTER);
  assert.deepEqual(submitted, ["a joke", "draft"]);
});

test("↑ on an empty prompt takes the last queued line back to edit it", async () => {
  const { submitted, queued, type } = setup({ history: ["old"], queued: ["first", "second"] });
  await settle();
  await type("\x1b[A");
  assert.deepEqual(queued, ["first"]);
  await type(" edited", ENTER);
  assert.deepEqual(submitted, ["second edited"]);
});

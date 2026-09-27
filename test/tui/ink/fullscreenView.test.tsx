/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { Text } from "ink";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";
import { createInkInteraction } from "../../../src/tui/ink/inkInteraction.js";
import { SessionView } from "../../../src/tui/ink/SessionView.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";
import { PromptInput } from "../../../src/tui/ink/PromptInput.js";

const PAGE_UP = "\x1b[5~";
const PAGE_DOWN = "\x1b[6~";
const CTRL_END = "\x1b[1;5F";
const WHEEL_UP = "\x1b[<64;10;5M";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
const screen = (view: { lastFrame(): string | undefined }) => stripAnsi(view.lastFrame() ?? "").split("\n");

afterEach(() => cleanup());

// ink-testing-library's stdout reports no rows: the view falls back to 24.
function setup(lines: number) {
  const model = createSessionModel();
  const interaction = createInkInteraction((text) => model.note(text));
  for (let i = 1; i <= lines; i++) model.note(`line ${i}`);
  const view = render(
    <SessionView model={model} interaction={interaction} fullscreen>
      <Text>PROMPT</Text>
    </SessionView>,
  );
  return { model, view };
}

test("full screen: the frame fills the terminal, the prompt sits at the bottom and history grows upward", async () => {
  const { view } = setup(3);
  await settle();
  const rows = screen(view);
  assert.equal(rows.length, 24);
  assert.equal(rows.at(-2), "PROMPT");
  assert.match(rows.at(-1) ?? "", /0 turns/);
  // Three lines, right above the prompt; blank rows above them.
  assert.deepEqual(rows.slice(-5, -2), ["line 1", "line 2", "line 3"]);
  assert.equal(rows[0].trim(), "");
});

test("PageUp/PageDown and the wheel scroll the history; Ctrl+End and typing return to the bottom", async () => {
  const { view } = setup(100);
  await settle();
  assert.equal(screen(view).at(-3), "line 100");

  view.stdin.write(PAGE_UP);
  await settle();
  let rows = screen(view);
  assert.notEqual(rows.at(-3), "line 100");
  assert.match(rows.at(-1) ?? "", /↓ \d+ more lines \(Ctrl\+End\)/);

  view.stdin.write(PAGE_DOWN);
  await settle();
  assert.equal(screen(view).at(-3), "line 100");

  view.stdin.write(WHEEL_UP);
  await settle();
  assert.equal(screen(view).at(-3), "line 97");

  view.stdin.write(CTRL_END);
  await settle();
  assert.equal(screen(view).at(-3), "line 100");

  view.stdin.write(PAGE_UP);
  await settle();
  view.stdin.write("a");
  await settle();
  rows = screen(view);
  assert.equal(rows.at(-3), "line 100");
  assert.doesNotMatch(rows.at(-1) ?? "", /more lines/);
});

test("output arriving while scrolled up doesn't move the view", async () => {
  const { model, view } = setup(100);
  await settle();
  view.stdin.write(PAGE_UP);
  await settle();
  const before = screen(view).slice(0, -2);

  model.note("line 101");
  model.note("line 102");
  await settle();
  const rows = screen(view);
  assert.deepEqual(rows.slice(0, -2), before);
  assert.match(rows.at(-1) ?? "", /↓ \d+ more lines/);
});

test("the header stays pinned at the top while the history scrolls under it", async () => {
  const model = createSessionModel();
  const interaction = createInkInteraction((text) => model.note(text));
  for (let i = 1; i <= 100; i++) model.note(`line ${i}`);
  const view = render(
    <SessionView model={model} interaction={interaction} fullscreen header={["LOGO  Captain", "      mode guided"]}>
      <Text>PROMPT</Text>
    </SessionView>,
  );
  await settle();
  let rows = screen(view);
  assert.equal(rows.length, 24);
  assert.deepEqual(rows.slice(0, 2), ["LOGO  Captain", "      mode guided"]);
  assert.equal(rows[2].trim(), ""); // a blank row under it
  assert.equal(rows.at(-3), "line 100");

  view.stdin.write(PAGE_UP);
  await settle();
  rows = screen(view);
  assert.deepEqual(rows.slice(0, 2), ["LOGO  Captain", "      mode guided"]);
  assert.notEqual(rows.at(-3), "line 100");
});

test("the prompt never types a mouse report", async () => {
  const submitted: string[] = [];
  const view = render(<PromptInput label="> " history={[]} commands={[]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />);
  await settle();
  view.stdin.write(WHEEL_UP);
  await settle();
  view.stdin.write("hi");
  await settle();
  view.stdin.write("\r");
  await settle();
  assert.deepEqual(submitted, ["hi"]);
});

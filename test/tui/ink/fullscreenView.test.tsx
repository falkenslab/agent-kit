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

test("dragging over the history selects it (also while the agent works) and a right-click copies and clears it", async () => {
  const copies: string[] = [];
  const model = createSessionModel();
  const interaction = createInkInteraction((text) => model.note(text));
  for (let i = 1; i <= 30; i++) model.note(`line ${i}`);
  model.startTurn(); // the spinner is on screen
  const view = render(
    <SessionView model={model} interaction={interaction} fullscreen onCopy={(text) => copies.push(text)}>
      <Text>PROMPT</Text>
    </SessionView>,
  );
  await settle();
  const rows = screen(view);
  const y28 = rows.indexOf("line 28");
  assert.ok(y28 > 0);

  // Press on "line 28" at column 5, drag to "line 29" column 3, release there (1-based cells).
  view.stdin.write(`\x1b[<0;6;${y28 + 1}M`);
  await settle();
  view.stdin.write(`\x1b[<32;4;${y28 + 2}M`);
  await settle();
  view.stdin.write(`\x1b[<0;4;${y28 + 2}m`);
  await settle();
  assert.deepEqual(copies, []); // releasing only selects

  // New output doesn't move the highlight off its text: it's still on "line 28".
  model.note("line 31");
  await settle();
  assert.ok((view.lastFrame() ?? "").includes("\x1b[7m28"), "the highlight still starts on line 28's number");

  // A right-click copies the selection and clears it.
  view.stdin.write(`\x1b[<2;10;3M`);
  await settle();
  assert.deepEqual(copies, ["28\nline"]);
  assert.match(screen(view).at(-1) ?? "", /copied 7 characters/);
  assert.ok(!(view.lastFrame() ?? "").includes("\x1b[7m"), "no highlight left");

  // With nothing selected, a right-click copies nothing.
  view.stdin.write(`\x1b[<2;10;3M`);
  await settle();
  assert.equal(copies.length, 1);
});

// The history's height is measured after the first layout: a click before that still lands
// on the row shown under it (it fell 4 rows higher, making the test above fail at random).
test("a drag right after the first frame selects the rows shown under it", async () => {
  const { view } = setup(30);
  const y28 = screen(view).indexOf("line 28");
  assert.ok(y28 > 0);
  view.stdin.write(`\x1b[<0;6;${y28 + 1}M`);
  view.stdin.write(`\x1b[<32;4;${y28 + 2}M`);
  view.stdin.write(`\x1b[<0;4;${y28 + 2}m`);
  await settle();
  assert.ok((view.lastFrame() ?? "").includes("\x1b[7m28"), "the highlight starts on line 28's number");
});

// A long approval in a short terminal: the history gives up its rows and the panel's options
// and the status bar stay on screen (seen hidden at 110×34 from teacher-agent).
for (const [columns, height] of [
  [110, 34],
  [80, 24],
]) {
  test(`full screen at ${columns}×${height}: a long approval panel shows its options above the status bar`, async () => {
    const model = createSessionModel();
    const interaction = createInkInteraction((text) => model.note(text));
    for (let i = 1; i <= 200; i++) model.note(`line ${i}`);
    const view = render(
      <SessionView model={model} interaction={interaction} fullscreen header={["LOGO  Captain", "      mode guided", "      ~/project"]}>
        <Text>PROMPT</Text>
      </SessionView>,
    );
    Object.defineProperty(view.stdout, "columns", { value: columns });
    Object.defineProperty(view.stdout, "rows", { value: height });
    view.stdout.emit("resize");
    await settle();

    const summary = Array.from({ length: 40 }, (_, i) => `summary line ${i + 1}${i % 5 === 0 ? ` ${"long words ".repeat(20)}` : ""}`);
    void interaction.port.askDecision({ title: "Publish the activity", lines: summary }, new AbortController().signal);
    await settle();
    await settle();

    const rows = screen(view);
    assert.equal(rows.length, height, "the frame is exactly as tall as the terminal");
    assert.match(rows.at(-1) ?? "", /0 turns/, "the status bar is the last row");
    const title = rows.findIndex((row) => row.includes("Publish the activity"));
    assert.ok(title > 0, "the panel's title is on screen");
    assert.ok(
      rows.slice(title).some((row) => row.includes("Yes")),
      "the panel's options are on screen",
    );
    // The history's rows sit above the panel, never over it.
    assert.ok(rows.slice(title).every((row) => !/^line \d+/.test(row.trim())));
  });
}

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

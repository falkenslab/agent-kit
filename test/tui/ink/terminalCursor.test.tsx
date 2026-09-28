/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { Box, Text, type DOMElement } from "ink";
import { PromptInput } from "../../../src/tui/ink/PromptInput.js";
import { createCursorController, CursorContext, framePosition, type CursorController, type CursorTarget } from "../../../src/tui/ink/terminalCursor.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

afterEach(() => cleanup());

function fakeController() {
  const targets: (CursorTarget | null)[] = [];
  const controller: CursorController = { setTarget: (target) => void targets.push(target), stream: process.stdout };
  return { controller, targets, last: () => targets.at(-1) ?? null };
}

test("with a cursor controller the prompt draws no block and reports where the cursor goes", async () => {
  const { controller, last } = fakeController();
  const view = render(
    <CursorContext.Provider value={controller}>
      <Box flexDirection="column">
        <Text>header</Text>
        <Box borderStyle="round" paddingX={1}>
          <PromptInput label="you> " history={[]} commands={[]} onSubmit={() => {}} onExit={() => {}} />
        </Box>
      </Box>
    </CursorContext.Provider>,
  );
  await settle();
  assert.ok(!(view.lastFrame() ?? "").includes("\x1b[7m")); // no inverse video

  view.stdin.write("hello");
  await settle();
  const target = last();
  assert.ok(target);
  // Row: header (1) + the frame's top border (1); column: border (1) + padding (1) from the line's left.
  assert.deepEqual(framePosition(target.node), { x: 2, y: 2 });
  assert.equal(target.column, "you> hello".length);

  view.stdin.write("\x1b[D\x1b[D"); // two left arrows
  await settle();
  assert.equal(last()?.column, "you> hel".length);
});

test("the prompt clears the target when it goes away, so the cursor is hidden", async () => {
  const { controller, last } = fakeController();
  const view = render(
    <CursorContext.Provider value={controller}>
      <PromptInput label="> " history={[]} commands={[]} onSubmit={() => {}} onExit={() => {}} />
    </CursorContext.Provider>,
  );
  await settle();
  assert.ok(last());
  view.unmount();
  assert.equal(last(), null);
});

test("the controller hides the cursor for every Ink write and shows it only once placed", async () => {
  const written: string[] = [];
  const fake = { write: (chunk: string) => void written.push(chunk), columns: 80, rows: 24, isTTY: true } as unknown as NodeJS.WriteStream;
  const controller = createCursorController(fake);
  assert.equal(controller.stream.columns, 80); // everything else reaches the real stream

  // A node 2 rows down and 3 columns in (its parent at 1,1 plus its own 1,2).
  const parent = { yogaNode: { getComputedLeft: () => 1, getComputedTop: () => 1 }, parentNode: undefined };
  const node = { yogaNode: { getComputedLeft: () => 2, getComputedTop: () => 1 }, parentNode: parent } as unknown as DOMElement;
  controller.setTarget({ node, column: 5 });
  await settle();
  written.length = 0;

  controller.stream.write("frame part 1");
  controller.stream.write("frame part 2");
  assert.deepEqual(written, ["\x1b[?25lframe part 1", "\x1b[?25lframe part 2"]); // hidden while drawing
  await settle();
  assert.deepEqual(written.slice(2), ["\x1b[3;9H\x1b[?25h"]); // once, after the frame: row 2+1, column 3+5+1

  controller.setTarget(null);
  await settle();
  controller.stream.write("frame");
  await settle();
  assert.equal(written.at(-1), "\x1b[?25lframe"); // no input on screen: stays hidden
});

test("Ctrl+U clears everything typed in the prompt", async () => {
  const submitted: string[] = [];
  const view = render(<PromptInput label="> " history={[]} commands={[]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />);
  await settle();
  view.stdin.write("something extra");
  await settle();
  view.stdin.write("\x15"); // Ctrl+U
  await settle();
  view.stdin.write("ok");
  await settle();
  view.stdin.write("\r");
  await settle();
  assert.deepEqual(submitted, ["ok"]);
});

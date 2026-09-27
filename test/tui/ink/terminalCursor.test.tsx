/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { render, cleanup } from "ink-testing-library";
import { Box, Text } from "ink";
import { PromptInput } from "../../../src/tui/ink/PromptInput.js";
import { CursorContext, framePosition, type CursorController, type CursorTarget } from "../../../src/tui/ink/terminalCursor.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

afterEach(() => cleanup());

function fakeController() {
  const targets: (CursorTarget | null)[] = [];
  const controller: CursorController = { setTarget: (target) => void targets.push(target), place: () => {} };
  return { controller, targets, last: () => targets.at(-1) ?? null };
}

test("with a cursor controller the prompt draws no block and reports where the cursor goes", async () => {
  const { controller, last } = fakeController();
  const view = render(
    <CursorContext.Provider value={controller}>
      <Box flexDirection="column">
        <Text>header</Text>
        <Box borderStyle="round" paddingX={1}>
          <PromptInput label="tú> " history={[]} commands={[]} onSubmit={() => {}} onExit={() => {}} />
        </Box>
      </Box>
    </CursorContext.Provider>,
  );
  await settle();
  assert.ok(!(view.lastFrame() ?? "").includes("\x1b[7m")); // no inverse video

  view.stdin.write("hola");
  await settle();
  const target = last();
  assert.ok(target);
  // Row: header (1) + the frame's top border (1); column: border (1) + padding (1) from the line's left.
  assert.deepEqual(framePosition(target.node), { x: 2, y: 2 });
  assert.equal(target.column, "tú> hola".length);

  view.stdin.write("\x1b[D\x1b[D"); // two left arrows
  await settle();
  assert.equal(last()?.column, "tú> ho".length);
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

test("Ctrl+U clears everything typed in the prompt", async () => {
  const submitted: string[] = [];
  const view = render(<PromptInput label="> " history={[]} commands={[]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />);
  await settle();
  view.stdin.write("algo que sobra");
  await settle();
  view.stdin.write("\x15"); // Ctrl+U
  await settle();
  view.stdin.write("ok");
  await settle();
  view.stdin.write("\r");
  await settle();
  assert.deepEqual(submitted, ["ok"]);
});

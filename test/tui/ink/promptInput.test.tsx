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
  await type("mira: ", "uno\r\ndos\r\ntres");
  await new Promise((resolve) => setTimeout(resolve, 150)); // a human pause after pasting
  await type(" ¿vale?");
  assert.match(screen(), /> mira: \[Pasted text #1 \+2 lines\] ¿vale\?/);
  await type(ENTER);
  assert.deepEqual(submitted, ["mira: uno\ndos\ntres ¿vale?"]);
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
  await type("primera\\", ENTER, "segunda", "\n", "tercera");
  assert.deepEqual(screen().split("\n").slice(0, 3), ["> primera", "  segunda", "  tercera"]);
  await type(ENTER);
  assert.deepEqual(submitted, ["primera\nsegunda\ntercera"]);
});

test("Ctrl+W, Ctrl+K and Ctrl+← edit by words and to the line end", async () => {
  const { submitted, type } = setup();
  await settle();
  await type("uno dos tres", "\x17"); // Ctrl+W: "uno dos "
  await type("\x1b[1;5D", "\x0b"); // Ctrl+←, Ctrl+K: "uno "
  await type("cuatro", ENTER);
  assert.deepEqual(submitted, ["uno cuatro"]);
});

test("Ctrl+R finds older matches; Enter takes one without sending, Esc restores", async () => {
  const { submitted, type, screen } = setup({ history: ["un chiste", "hola", "otro chiste"] });
  await settle();
  await type("\x12", "chis");
  assert.match(screen(), /\(reverse-i-search\)'chis': otro chiste/);
  await type("\x12");
  assert.match(screen(), /'chis': un chiste/);
  await type(ENTER);
  assert.deepEqual(submitted, []); // taken into the prompt, not sent
  await type(ENTER);
  assert.deepEqual(submitted, ["un chiste"]);

  await type("borrador", "\x12", "hola", "\x1b");
  await type(ENTER);
  assert.deepEqual(submitted, ["un chiste", "borrador"]);
});

test("↑ on an empty prompt takes the last queued line back to edit it", async () => {
  const { submitted, queued, type } = setup({ history: ["old"], queued: ["primero", "segundo"] });
  await settle();
  await type("\x1b[A");
  assert.deepEqual(queued, ["primero"]);
  await type(" editado", ENTER);
  assert.deepEqual(submitted, ["segundo editado"]);
});

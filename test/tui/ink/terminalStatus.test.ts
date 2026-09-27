import { test } from "node:test";
import assert from "node:assert/strict";
import { createTerminalStatus, focusFromReport, isFocusReport } from "../../../src/tui/ink/terminalStatus.js";
import { createSessionModel } from "../../../src/tui/ink/sessionModel.js";

const TITLE = (text: string) => `\x1b]0;${text}\x07`;
const CLEAR = "\x1b]9;4;0;0\x07";
const BUSY = "\x1b]9;4;3;0\x07";
const ATTENTION = "\x1b]9;4;4;100\x07";

test("focus reports are recognized and never taken as text", () => {
  assert.equal(isFocusReport("[I"), true);
  assert.equal(isFocusReport("\x1b[O"), true);
  assert.equal(isFocusReport("[O[I"), true);
  assert.equal(isFocusReport("[Iba"), false);
  assert.equal(focusFromReport("[O"), false);
  assert.equal(focusFromReport("[O[I"), true);
  assert.equal(focusFromReport("hola"), null);
});

test("title and taskbar follow the turn; a turn ending unfocused marks the taskbar until focus", () => {
  const written: string[] = [];
  const status = createTerminalStatus((text) => void written.push(text), "Capitán");

  status.start();
  assert.deepEqual(written, [`\x1b[?1004h${TITLE("Capitán")}`]);

  written.length = 0;
  status.turnStarted();
  status.turnEnded();
  assert.deepEqual(written, [TITLE("✻ Capitán — working…") + BUSY, TITLE("Capitán") + CLEAR]);

  written.length = 0;
  status.setFocused(false);
  status.turnStarted();
  status.turnEnded();
  assert.equal(written.at(-1), TITLE("Capitán") + ATTENTION);
  status.setFocused(true);
  assert.equal(written.at(-1), CLEAR);

  written.length = 0;
  status.stop();
  assert.deepEqual(written, [`\x1b[?1004l${CLEAR}${TITLE("")}`]);
});

test("the model keeps the agent's text of the latest turn for /copy", () => {
  const model = createSessionModel();
  model.startTurn();
  model.render({ type: "text", text: "Primera " });
  model.render({ type: "action", toolName: "Read", input: {} });
  model.render({ type: "text", text: "respuesta.\n" });
  model.endTurn();
  assert.equal(model.lastReply(), "Primera respuesta.");
  model.startTurn();
  model.render({ type: "text", text: "Segunda." });
  assert.equal(model.lastReply(), "Segunda.");
});

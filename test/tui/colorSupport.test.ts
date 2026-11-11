import { test } from "node:test";
import assert from "node:assert/strict";
import { colorSupported, setTheme } from "../../src/tui/theme.js";
import { createConsoleRenderer } from "../../src/tui/consoleRenderer.js";
import type { AgentEvent } from "../../src/core/runner.js";

test("color only on a terminal, on every platform; NO_COLOR turns it off and FORCE_COLOR on (#95)", () => {
  assert.equal(colorSupported({}, true), true);
  // Redirected to a file: what picocolors gets wrong on Windows.
  assert.equal(colorSupported({}, false), false);
  assert.equal(colorSupported({ TERM: "dumb" }, true), false);
  assert.equal(colorSupported({ NO_COLOR: "1" }, true), false);
  assert.equal(colorSupported({ NO_COLOR: "1", FORCE_COLOR: "1" }, false), false);
  assert.equal(colorSupported({ NO_COLOR: "" }, true), true);
  assert.equal(colorSupported({ FORCE_COLOR: "1" }, false), true);
  assert.equal(colorSupported({ FORCE_COLOR: "" }, false), true);
  assert.equal(colorSupported({ FORCE_COLOR: "0" }, true), false);
  assert.equal(colorSupported({ FORCE_COLOR: "false" }, true), false);
});

test("streamed text is colored once for as long as it streams, not chunk by chunk (#95)", () => {
  setTheme({ agent: (text) => `<${text}>` });
  try {
    let out = "";
    const renderer = createConsoleRenderer({ formatAction: (name) => name, output: (text) => (out += text) });
    const events: AgentEvent[] = [
      { type: "text", text: "Empiezo rev" },
      { type: "text", text: "isando las" },
      { type: "text", text: " fuentes" },
      { type: "action", toolName: "Read", input: {} },
      { type: "text", text: "Hecho." },
      { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" },
    ];
    events.forEach(renderer.render);
    // The action line's own color (the default theme's) doesn't matter here.
    assert.equal(out.replace(/\x1b\[[0-9;]*m/g, ""), "<Empiezo revisando las fuentes>\n[action] Read\n<Hecho.>"); // eslint-disable-line no-control-regex
    assert.equal(renderer.atLineStart, false);
  } finally {
    setTheme();
  }
});

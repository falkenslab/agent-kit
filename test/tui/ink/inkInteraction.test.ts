import { test } from "node:test";
import assert from "node:assert/strict";
import { createInkInteraction } from "../../../src/tui/ink/inkInteraction.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const PROMPT = { title: "Proposed action", lines: ["Tool: Write"] };

test("checkpoints wait in order and each answer is recorded in the history", async () => {
  const notes: string[] = [];
  const interaction = createInkInteraction((text) => notes.push(stripAnsi(text)));
  const first = interaction.port.askDecision(PROMPT, new AbortController().signal);
  const second = interaction.port.askManualIntervention({ title: "Log in", lines: [] }, new AbortController().signal);

  assert.equal(interaction.getSnapshot()?.kind, "decision");
  interaction.getSnapshot()!.answer("y");
  assert.equal(await first, "y");

  assert.equal(interaction.getSnapshot()?.kind, "manual-intervention");
  interaction.getSnapshot()!.answer("");
  assert.equal(await second, "");
  assert.equal(interaction.getSnapshot(), null);

  assert.deepEqual(notes, ["=== Proposed action ===\nTool: Write\n✔ Approved", "=== Log in ===\n✔ Done"]);
});

test("an abort (the response file answered) drops the checkpoint from the screen", () => {
  const notes: string[] = [];
  const interaction = createInkInteraction((text) => notes.push(stripAnsi(text)));
  const controller = new AbortController();
  void interaction.port.askDecision(PROMPT, controller.signal);
  const checkpoint = interaction.getSnapshot()!;

  controller.abort();
  assert.equal(interaction.getSnapshot(), null);
  checkpoint.answer("y"); // too late: ignored
  assert.deepEqual(notes, ["=== Proposed action ===\nTool: Write\n(answered through the response file)"]);
});

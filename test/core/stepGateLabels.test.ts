import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStepGate } from "../../src/core/hooks/stepGate.js";
import { setInteractionPort, type ApprovalPrompt } from "../../src/core/interaction.js";
import { setLanguage } from "../../src/core/messages/index.js";

// Interactive mode asks with the call as the chat says it, not the tool's internal name and raw JSON (#88).

afterEach(() => setInteractionPort(null));

const ask = async (gate: ReturnType<typeof createStepGate>, tool_name: string, tool_input: unknown) =>
  await gate({ hook_event_name: "PreToolUse", tool_name, tool_input, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal });

test("the step gate's panel starts with the call's label, then its name and its parameters in one line, cut short", async () => {
  setLanguage("es");
  const asked: ApprovalPrompt[] = [];
  setInteractionPort({ askDecision: async (prompt) => (asked.push(prompt), "y"), askManualIntervention: async () => "" });
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "step-gate-labels-"));
  const gate = createStepGate(runDir, () => true, [], () => ({ mcp__knowledge__knowledge_read: { label: (input) => `Leyendo ${String(input.page)}` } }));
  await ask(gate, "mcp__knowledge__knowledge_read", { page: "overview" });
  assert.deepEqual(asked[0]!.lines, ["Leyendo overview", "Herramienta: mcp__knowledge__knowledge_read", 'Parámetros: {"page":"overview"}']);
  // A built-in tool gets the kit's own label; a long parameter is cut short.
  await ask(gate, "Write", { file_path: "notes.md", content: "x".repeat(1000) });
  assert.notEqual(asked[1]!.lines[0], "Write");
  assert.ok(asked[1]!.lines[2]!.endsWith("…") && asked[1]!.lines[2]!.length < 340, asked[1]!.lines[2]);
  setLanguage("en");
});

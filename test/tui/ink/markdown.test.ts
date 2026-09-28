import { test } from "node:test";
import assert from "node:assert/strict";
import { finishedLength, renderMarkdown } from "../../../src/tui/ink/markdown.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";
import { resultSummary, toolGroupExpanded, toolGroupSummary } from "../../../src/tui/ink/toolGroup.js";
import { toolResultText, visibleErrors } from "../../../src/core/runner.js";

const md = (source: string, width = 60) => renderMarkdown(source, width).map(stripAnsi);

test("inline styles leave no markdown marks behind", () => {
  assert.deepEqual(md("Con **negrita**, *cursiva*, ~~tachado~~ y `código`."), ["Con negrita, cursiva, tachado y código."]);
  assert.deepEqual(md("Mira [la guía](https://ejemplo.es) y <https://x.es>."), ["Mira la guía (https://ejemplo.es) y https://x.es."]);
  assert.deepEqual(md("5 &lt; 6 &amp; 7"), ["5 < 6 & 7"]);
});

test("blocks: headings, lists, quotes, rules, code, tables, with a blank line between them", () => {
  assert.deepEqual(md("# Título\n\nTexto."), ["Título", "", "Texto."]);
  assert.deepEqual(md("- uno\n- dos\n  - anidado\n\n1. primero\n2. segundo"), ["- uno", "- dos", "  - anidado", "", "1. primero", "2. segundo"]);
  assert.deepEqual(md("- [x] hecho\n- [ ] pendiente"), ["- [x] hecho", "- [ ] pendiente"]);
  assert.deepEqual(md("> una cita"), ["│ una cita"]);
  assert.deepEqual(md("---", 10), ["──────────"]);
  assert.deepEqual(md("```ts\nconst a = 1;\n```"), ["  const a = 1;"]);
  assert.deepEqual(md("| Nombre | Nota |\n| --- | --- |\n| Ana | 9 |\n| Bernardo | 10 |"), [
    "Nombre    Nota",
    "────────  ────",
    "Ana       9",
    "Bernardo  10",
  ]);
});

test("paragraphs wrap to the width; list items indent their continuation", () => {
  assert.deepEqual(md("uno dos tres cuatro cinco", 10), ["uno dos ", "tres ", "cuatro ", "cinco"]);
  assert.deepEqual(md("- uno dos tres cuatro", 10), ["- uno dos ", "  tres ", "  cuatro"]);
});

test("while streaming, only what ends at a blank line outside a code fence is finished", () => {
  assert.equal(finishedLength("Párrafo a medias"), 0);
  assert.equal(finishedLength("Uno.\n\nDos a medi"), "Uno.\n\n".length);
  assert.equal(finishedLength("Uno.\n\n```\ncódigo\n\nmás\n"), "Uno.\n\n".length); // the blank line is inside the fence
  assert.equal(finishedLength("```\nx\n```\n\nY"), "```\nx\n```\n\n".length);
});

test("a folded group counts its calls by kind; the agent can name its own tools", () => {
  const call = (toolName: string) => ({ toolName, label: toolName, result: null });
  assert.equal(toolGroupSummary([call("Read"), call("Bash"), call("Read"), call("Bash")]), "Read 2 files, ran 2 shell commands");
  assert.equal(toolGroupSummary([call("WebSearch")]), "Searched the web");
  assert.equal(toolGroupSummary([call("mcp__x__a"), call("mcp__x__b")]), "Used 2 tools");
  const phrase = (name: string) => (name.startsWith("mcp__playwright") ? (["opened {n} page", "opened {n} pages"] as [string, string]) : undefined);
  assert.equal(toolGroupSummary([call("mcp__playwright__go"), call("mcp__playwright__go"), call("Read")], phrase), "Opened 2 pages, read 1 file");
});

test("results: the first line, in red if it failed, and how many more", () => {
  assert.equal(stripAnsi(resultSummary({ isError: true, text: "not found\nstack" })), "not found (+1 line)");
  assert.equal(stripAnsi(resultSummary({ isError: false, text: "ok" })), "ok");
  assert.equal(stripAnsi(resultSummary({ isError: false, text: "a\n\nb\nc" })), "a (+2 lines)");
  assert.equal(stripAnsi(resultSummary({ isError: false, text: "" })), "(no output)");
  const lines = toolGroupExpanded([{ toolName: "Read", label: "Read a.ts", result: { isError: false, text: "x" } }], 40).map(stripAnsi);
  assert.deepEqual(lines, ["● Read a.ts", "  ⎿  x"]);
});

test("a subagent's answer shows in one line under its calls, its markdown rendered", () => {
  const answer = "Tres **chistes** con `salsa`:\n\n1. El loro que hablaba de más\n2. El ancla perezosa\n3. El pirata del parche";
  const lines = toolGroupExpanded(
    [{ toolName: "Agent", label: "Delegating to minino", result: { isError: false, text: answer }, children: ["Searching the web"] }],
    60,
  ).map(stripAnsi);
  assert.deepEqual(lines, [
    "● Delegating to minino",
    "  ⎿  · Searching the web",
    "     Tres chistes con salsa: (+3 lines)",
  ]);
});

test("an interrupted turn's internal diagnostics never reach the error text", () => {
  assert.deepEqual(visibleErrors(["[ede_diagnostic] result_type=user last_content_type=n/a stop_reason=tool_use"]), []);
  assert.deepEqual(visibleErrors(["API error", "[ede_diagnostic] x"]), ["API error"]);
});

test("a tool result's content as plain text, whatever form the SDK gives it", () => {
  assert.equal(toolResultText("plain"), "plain");
  assert.equal(toolResultText([{ type: "text", text: "a" }, { type: "image", source: {} }, { type: "text", text: "b" }]), "a\nb");
  assert.equal(toolResultText(undefined), "");
});

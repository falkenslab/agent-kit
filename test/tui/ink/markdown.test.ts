import { test } from "node:test";
import assert from "node:assert/strict";
import { finishedLength, renderMarkdown } from "../../../src/tui/ink/markdown.js";
import stringWidth from "string-width";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";
import { resultSummary, toolGroupExpanded, toolGroupSummary } from "../../../src/tui/ink/toolGroup.js";
import { toolResultText, visibleErrors } from "../../../src/core/runner.js";

const md = (source: string, width = 60) => renderMarkdown(source, width).map(stripAnsi);

test("inline styles leave no markdown marks behind", () => {
  assert.deepEqual(md("With **bold**, *italic*, ~~strikethrough~~ and `code`."), ["With bold, italic, strikethrough and code."]);
  assert.deepEqual(md("See [the guide](https://example.com) and <https://x.com>."), ["See the guide (https://example.com) and https://x.com."]);
  assert.deepEqual(md("5 &lt; 6 &amp; 7"), ["5 < 6 & 7"]);
});

test("blocks: headings, lists, quotes, rules, code, tables, with a blank line between them", () => {
  assert.deepEqual(md("# Title\n\nText."), ["Title", "", "Text."]);
  assert.deepEqual(md("- one\n- two\n  - nested\n\n1. first\n2. second"), ["- one", "- two", "  - nested", "", "1. first", "2. second"]);
  assert.deepEqual(md("- [x] done\n- [ ] pending"), ["- [x] done", "- [ ] pending"]);
  assert.deepEqual(md("> a quote"), ["│ a quote"]);
  assert.deepEqual(md("---", 10), ["──────────"]);
  assert.deepEqual(md("```ts\nconst a = 1;\n```"), ["  const a = 1;"]);
  assert.deepEqual(md("| Name | Mark |\n| --- | --- |\n| Ana | 9 |\n| Bernardo | 10 |"), [
    "┌──────────┬──────┐",
    "│ Name     │ Mark │",
    "├──────────┼──────┤",
    "│ Ana      │ 9    │",
    "├──────────┼──────┤",
    "│ Bernardo │ 10   │",
    "└──────────┴──────┘",
  ]);
});

test("a table follows its markdown alignment, and a wide one wraps its cells to fit", () => {
  assert.deepEqual(md("| Left | Right | Mid |\n| :-- | --: | :-: |\n| a | 1 | x |\n| bbbb | 22 | yyy |"), [
    "┌──────┬───────┬─────┐",
    "│ Left │ Right │ Mid │",
    "├──────┼───────┼─────┤",
    "│ a    │     1 │  x  │",
    "├──────┼───────┼─────┤",
    "│ bbbb │    22 │ yyy │",
    "└──────┴───────┴─────┘",
  ]);
  const wide = md("| Tool | What it does |\n| --- | --- |\n| `Read` | reads **files** from the knowledge base and the sources folder |", 40);
  assert.ok(wide.every((line) => stringWidth(line) <= 40), wide.join("\n"));
  assert.deepEqual(wide, [
    "┌──────┬───────────────────────────────┐",
    "│ Tool │ What it does                  │",
    "├──────┼───────────────────────────────┤",
    "│ Read │ reads files from the          │",
    "│      │ knowledge base and the        │",
    "│      │ sources folder                │",
    "└──────┴───────────────────────────────┘",
  ]);
  // Widths are in columns: accents and wide characters keep the borders aligned.
  const accents = md("| Nombre | Ciudad |\n| --- | --- |\n| Iñaki | 東京 |");
  assert.equal(new Set(accents.map((line) => stringWidth(line))).size, 1, accents.join("\n"));
});

test("paragraphs wrap to the width; list items indent their continuation", () => {
  assert.deepEqual(md("red fox runs across grass", 10), ["red fox ", "runs ", "across ", "grass"]);
  assert.deepEqual(md("- red fox runs across", 10), ["- red fox ", "  runs ", "  across"]);
});

test("while streaming, only what ends at a blank line outside a code fence is finished", () => {
  assert.equal(finishedLength("Half a paragraph"), 0);
  assert.equal(finishedLength("One.\n\nTwo half wri"), "One.\n\n".length);
  assert.equal(finishedLength("One.\n\n```\ncode\n\nmore\n"), "One.\n\n".length); // the blank line is inside the fence
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
  const answer = "Three **jokes** with `salt`:\n\n1. The parrot that talked too much\n2. The lazy anchor\n3. The pirate's eye patch";
  const lines = toolGroupExpanded(
    [{ toolName: "Agent", label: "Delegating to kitty", result: { isError: false, text: answer }, children: ["Searching the web"] }],
    60,
  ).map(stripAnsi);
  assert.deepEqual(lines, [
    "● Delegating to kitty",
    "  ⎿  · Searching the web",
    "     Three jokes with salt: (+3 lines)",
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

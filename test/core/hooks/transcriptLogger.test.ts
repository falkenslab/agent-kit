import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createTranscriptLogger, summarizeToolResponse } from "../../../src/core/hooks/transcriptLogger.js";
import { buildSessionOptions } from "../../../src/core/session.js";

test("truncates a long response string", () => {
  const long = "a".repeat(3000);
  const result = summarizeToolResponse(long) as string;
  assert.equal(result.length, 2000 + "... [truncated]".length);
  assert.match(result, /\.\.\. \[truncated\]$/);
});

test("leaves a short string unchanged", () => {
  assert.equal(summarizeToolResponse("short response"), "short response");
});

test("in an array of blocks, truncates text and omits base64 payloads", () => {
  const response = [
    { type: "text", text: "hello" },
    { type: "image", data: "QUJDREVGRw==" },
    { type: "other", foo: "bar" },
  ];
  assert.deepEqual(summarizeToolResponse(response), [
    "hello",
    "[image omitted, 12 bytes base64]",
    { type: "other", foo: "bar" },
  ]);
});

test("leaves any other response type (object, null, number) unchanged", () => {
  assert.equal(summarizeToolResponse(42), 42);
  assert.equal(summarizeToolResponse(null), null);
  assert.deepEqual(summarizeToolResponse({ ok: true }), { ok: true });
});

test("a tool call that failed leaves a post_tool_use_failure line with its error, redacted and cut short (#96)", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "transcript-failure-test-"));
  const file = path.join(dir, "transcript.jsonl");
  const logger = createTranscriptLogger(file, ["s3cret"]);
  const signal = { signal: new AbortController().signal };
  await logger.preToolUse({ hook_event_name: "PreToolUse", tool_name: "mcp__moodle__save_submission", tool_input: { id: 7 } } as never, undefined, signal);
  await logger.postToolUseFailure({ hook_event_name: "PostToolUseFailure", tool_name: "mcp__moodle__save_submission", tool_input: { id: 7 }, tool_use_id: "t1", error: "The assignment takes no files (token s3cret)." } as never, undefined, signal);
  await logger.postToolUseFailure({ hook_event_name: "PostToolUseFailure", tool_name: "Bash", tool_input: {}, tool_use_id: "t2", error: "x".repeat(3000), is_interrupt: true } as never, undefined, signal);
  const lines = fs.readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
  assert.deepEqual(lines.map(({ ts, ...rest }) => (void ts, rest)).slice(0, 2), [
    { event: "pre_tool_use", tool: "mcp__moodle__save_submission", input: { id: 7 } },
    { event: "post_tool_use_failure", tool: "mcp__moodle__save_submission", error: "The assignment takes no files (token ***)." },
  ]);
  assert.match(lines[2]!.error as string, /\.\.\. \[truncated\]$/);
  assert.equal(lines[2]!.interrupted, true);

  // Every session has it, next to the other two.
  const built = await buildSessionOptions({ mode: "guided", projectDir: dir }, dir, { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined });
  assert.equal(built.options.hooks!.PostToolUseFailure!.length, 1);
});

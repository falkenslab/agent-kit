import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeToolResponse } from "../../src/hooks/transcriptLogger.js";

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

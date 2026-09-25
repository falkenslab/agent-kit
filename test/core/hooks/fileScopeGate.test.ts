import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { checkFileScope, createFileScopeGate, type FileScope } from "../../../src/core/hooks/fileScopeGate.js";

const projectDir = path.resolve("/workspace");
const knowledgeDir = path.join(projectDir, "knowledge");
const sourcesDir = path.join(projectDir, "sources");
const contextDir = path.join(projectDir, "context");
const configFile = path.join(projectDir, "config.json");

const scope: FileScope = {
  projectDir,
  writableDirs: [knowledgeDir, sourcesDir],
  searchableDirs: [contextDir, knowledgeDir, sourcesDir],
  deniedPaths: [configFile],
};

test("Write/Edit are allowed inside the writable dirs, by absolute or project-relative path", () => {
  assert.equal(checkFileScope(scope, "Write", { file_path: path.join(knowledgeDir, "concepts", "x.md") }), undefined);
  assert.equal(checkFileScope(scope, "Edit", { file_path: "sources/topic-1/slides.md" }), undefined);
});

test("Write/Edit are denied outside the writable dirs, including context/ and the project root", () => {
  assert.match(checkFileScope(scope, "Write", { file_path: "context/notes.md" }) ?? "", /only allowed inside knowledge\/, sources\//);
  assert.ok(checkFileScope(scope, "Edit", { file_path: "config.json" }));
  assert.ok(checkFileScope(scope, "Write", { file_path: "knowledge/../instructions.md" }));
  assert.ok(checkFileScope(scope, "Write", { file_path: path.resolve("/elsewhere/x.md") }));
});

test("Read is only denied for the denied paths", () => {
  assert.equal(checkFileScope(scope, "Read", { file_path: "context/notes.pdf" }), undefined);
  assert.equal(checkFileScope(scope, "Read", { file_path: "sessions/run-1/transcript.jsonl" }), undefined);
  assert.match(checkFileScope(scope, "Read", { file_path: "config.json" }) ?? "", /off limits/);
  assert.ok(checkFileScope(scope, "Read", { file_path: configFile }));
});

test("Grep needs a path inside a searchable dir; the default (project root) is denied", () => {
  assert.equal(checkFileScope(scope, "Grep", { pattern: "x", path: "knowledge" }), undefined);
  assert.equal(checkFileScope(scope, "Grep", { pattern: "x", path: path.join(contextDir, "sub") }), undefined);
  assert.ok(checkFileScope(scope, "Grep", { pattern: "password" }));
  assert.ok(checkFileScope(scope, "Grep", { pattern: "password", path: "." }));
});

test("Grep is denied on a folder that contains a denied path, even if searchable", () => {
  const nested: FileScope = { ...scope, deniedPaths: [path.join(knowledgeDir, "secret.md")] };
  assert.ok(checkFileScope(nested, "Grep", { pattern: "x", path: "knowledge" }));
  assert.equal(checkFileScope(nested, "Grep", { pattern: "x", path: "knowledge/concepts" }), undefined);
});

test("other tools, and calls without a path, are left alone", () => {
  assert.equal(checkFileScope(scope, "Glob", { pattern: "**/*" }), undefined);
  assert.equal(checkFileScope(scope, "Bash", { command: "cat config.json" }), undefined);
  assert.equal(checkFileScope(scope, "Write", {}), undefined);
});

test("the hook denies with the reason, and returns nothing when allowed", async () => {
  const gate = createFileScopeGate(scope);
  const call = (tool_name: string, tool_input: Record<string, unknown>) =>
    gate({ hook_event_name: "PreToolUse", tool_name, tool_input } as never, undefined, { signal: new AbortController().signal });

  const denied = (await call("Read", { file_path: "config.json" })) as { hookSpecificOutput?: { permissionDecision?: string } };
  assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");
  assert.deepEqual(await call("Read", { file_path: "knowledge/index.md" }), {});
});

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { checkFileScope, createFileScopeGate, type FileScope } from "../../../src/core/hooks/fileScopeGate.js";

const projectDir = path.resolve("/workspace");
const knowledgeDir = path.join(projectDir, "knowledge");
const sourcesDir = path.join(projectDir, "sources");
const configFile = path.join(projectDir, "config.json");

const scope: FileScope = {
  projectDir,
  writableDirs: [knowledgeDir],
  readOnlyDirs: [sourcesDir],
  searchableDirs: [knowledgeDir, sourcesDir],
  deniedPaths: [configFile],
};

test("Write/Edit are allowed inside the writable dirs, by absolute or project-relative path", () => {
  assert.equal(checkFileScope(scope, "Write", { file_path: path.join(knowledgeDir, "concepts", "x.md") }), undefined);
  assert.equal(checkFileScope(scope, "Edit", { file_path: "knowledge/topic-1/slides.md" }), undefined);
});

test("Write/Edit are denied outside the writable dirs, including the project root", () => {
  assert.match(checkFileScope(scope, "Write", { file_path: "notes.md" }) ?? "", /only allowed inside knowledge\//);
  assert.ok(checkFileScope(scope, "Edit", { file_path: "config.json" }));
  assert.ok(checkFileScope(scope, "Write", { file_path: "knowledge/../instructions.md" }));
  assert.ok(checkFileScope(scope, "Write", { file_path: path.resolve("/elsewhere/x.md") }));
});

test("sources/ is read-only: originals can be read and searched, never written or edited", () => {
  assert.match(checkFileScope(scope, "Write", { file_path: "sources/slides.pdf" }) ?? "", /read-only/);
  assert.match(checkFileScope(scope, "Edit", { file_path: path.join(sourcesDir, "a", "b.md") }) ?? "", /read-only/);
  assert.equal(checkFileScope(scope, "Read", { file_path: "sources/slides.pdf" }), undefined);
  assert.equal(checkFileScope(scope, "Grep", { pattern: "x", path: "sources" }), undefined);
});

test("Read is only denied for the denied paths", () => {
  assert.equal(checkFileScope(scope, "Read", { file_path: "sources/notes.pdf" }), undefined);
  assert.equal(checkFileScope(scope, "Read", { file_path: "sessions/run-1/transcript.jsonl" }), undefined);
  assert.match(checkFileScope(scope, "Read", { file_path: "config.json" }) ?? "", /off limits/);
  assert.ok(checkFileScope(scope, "Read", { file_path: configFile }));
});

test("Grep needs a path inside a searchable dir; the default (project root) is denied", () => {
  assert.equal(checkFileScope(scope, "Grep", { pattern: "x", path: "knowledge" }), undefined);
  assert.equal(checkFileScope(scope, "Grep", { pattern: "x", path: path.join(sourcesDir, "sub") }), undefined);
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

test("Glob is denied inside a denied path, even without an allow-list", () => {
  const secrets: FileScope = { ...scope, deniedPaths: [path.join(projectDir, "secrets")] };
  assert.match(checkFileScope(secrets, "Glob", { pattern: "*", path: "secrets" }) ?? "", /off limits/);
  assert.match(checkFileScope(secrets, "Glob", { pattern: "secrets/**" }) ?? "", /off limits/);
  assert.equal(checkFileScope(secrets, "Glob", { pattern: "**/*.md" }), undefined);
});

const home = path.resolve("/home/teacher");
const runDir = path.join(projectDir, ".run", "2026-10-05");
const pluginRoot = path.resolve("/opt/agent/plugin");
const toolResultsRoot = path.join(home, ".claude", "projects", "-workspace");
const restricted: FileScope = { ...scope, readableDirs: [knowledgeDir, sourcesDir], alsoReadable: [runDir, pluginRoot], toolResultsRoot };

test("with readableDirs, Read only reaches the allow-list, the run folder, the plugins and the session's tool results", () => {
  assert.equal(checkFileScope(restricted, "Read", { file_path: "sources/slides.pdf" }), undefined);
  assert.equal(checkFileScope(restricted, "Read", { file_path: path.join(runDir, "downloads", "page.html") }), undefined);
  assert.equal(checkFileScope(restricted, "Read", { file_path: path.join(pluginRoot, "skills", "joke", "SKILL.md") }), undefined);
  assert.equal(checkFileScope(restricted, "Read", { file_path: path.join(toolResultsRoot, "5eaccb45", "tool-results", "big.txt") }), undefined);

  for (const outside of [
    path.join(home, ".ssh", "id_ed25519"),
    path.resolve("/work/other-project/.env"),
    path.join(home, ".claude", ".credentials.json"),
    path.join(toolResultsRoot, "5eaccb45.jsonl"), // a transcript, not a tool result
    "README.md", // the project root isn't readable
    "sources/../config.json",
  ]) {
    assert.ok(checkFileScope(restricted, "Read", { file_path: outside }), outside);
  }
  assert.match(checkFileScope(restricted, "Read", { file_path: "README.md" }) ?? "", /only allowed inside knowledge\/, sources\/ and your own plugins and run folder/);
  // deniedPaths still wins inside the allow-list.
  assert.match(checkFileScope({ ...restricted, deniedPaths: [path.join(sourcesDir, "grades.xlsx")] }, "Read", { file_path: "sources/grades.xlsx" }) ?? "", /off limits/);
});

test("with readableDirs, Glob only lists from inside the allow-list, and can't climb out with ..", () => {
  assert.equal(checkFileScope(restricted, "Glob", { pattern: "sources/**/*.pdf" }), undefined);
  assert.equal(checkFileScope(restricted, "Glob", { pattern: "*.md", path: "sources" }), undefined);
  assert.match(checkFileScope(restricted, "Glob", { pattern: "*", path: path.join(home, "Documents") }) ?? "", /Glob can't list/);
  assert.ok(checkFileScope(restricted, "Glob", { pattern: "**/*" })); // from the project root
  assert.ok(checkFileScope(restricted, "Glob", { pattern: "**/../../*", path: "sources" }));
  assert.ok(checkFileScope(restricted, "Glob", { pattern: path.join(home, ".ssh", "*") }));
});

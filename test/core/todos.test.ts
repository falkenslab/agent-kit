import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { hasOpenTodos, parseTodos, todoChanges } from "../../src/core/todos.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { checkPlanScope } from "../../src/core/hooks/planGate.js";

const todo = (content: string, status: "pending" | "in_progress" | "completed") => ({ content, status, activeForm: `${content}…` });

test("a TodoWrite input is read as a task list; anything else isn't", () => {
  assert.deepEqual(parseTodos({ todos: [todo("Plan", "in_progress"), { content: "Build", status: "weird" }] }), [
    { content: "Plan", status: "in_progress", activeForm: "Plan…" },
    { content: "Build", status: "pending", activeForm: "Build" },
  ]);
  assert.equal(parseTodos({ file_path: "x" }), null);
  assert.equal(parseTodos(null), null);
});

test("open tasks, and what started and finished between two lists", () => {
  assert.equal(hasOpenTodos([todo("A", "completed")]), false);
  assert.equal(hasOpenTodos([todo("A", "completed"), todo("B", "pending")]), true);
  assert.equal(hasOpenTodos(null), false);
  const before = [todo("A", "in_progress"), todo("B", "pending")];
  const after = [todo("A", "completed"), todo("B", "in_progress")];
  const { started, completed } = todoChanges(before, after);
  assert.deepEqual(started.map((t) => t.content), ["B"]);
  assert.deepEqual(completed.map((t) => t.content), ["A"]);
  assert.deepEqual(todoChanges(after, after), { started: [], completed: [] });
});

test("every session has TodoWrite, and plan mode lets it through", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    const spec = { buildSystemPrompt: () => "test", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
    for (const mode of ["autonomous", "guided"] as const) {
      const { options } = await buildSessionOptions({ mode, projectDir: runDir }, runDir, spec);
      assert.ok((options.tools as string[]).includes("TodoWrite"), mode);
      assert.ok(options.allowedTools?.includes("TodoWrite"), mode);
    }
    assert.equal(checkPlanScope({ projectDir: runDir }, "TodoWrite", { todos: [] }), undefined);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("the session asks the CLI for TodoWrite, which it otherwise replaces with its Task tools", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    const spec = { buildSystemPrompt: () => "test", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
    const { options } = await buildSessionOptions({ mode: "guided", projectDir: runDir }, runDir, spec);
    assert.equal(options.env?.CLAUDE_CODE_ENABLE_TASKS, "0");
    assert.equal(options.env?.PATH ?? options.env?.Path, process.env.PATH ?? process.env.Path); // the rest is passed on
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

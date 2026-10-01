import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  continueArgument,
  createRunFolder,
  createRunStore,
  entryText,
  listRuns,
  readConversation,
  readRunSession,
} from "../../src/core/runs.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

async function tempDir(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "runs-test-"));
}

const key = { projectKey: "project", sessionId: "s-1" };
const user = (uuid: string, text: string, timestamp = "2026-09-01T10:00:00.000Z") => ({ type: "user", uuid, timestamp, message: { role: "user", content: text } });
const assistant = (uuid: string, text: string, timestamp = "2026-09-01T10:00:01.000Z") => ({
  type: "assistant",
  uuid,
  timestamp,
  message: { role: "assistant", content: [{ type: "text", text }] },
});

test("the run store keeps the conversation in its folder and gives it back to resume", async () => {
  const dir = await tempDir();
  try {
    const store = createRunStore(dir);
    await store.append(key, [user("u1", "hello"), assistant("a1", "ahoy")]);
    // A retry may send an entry again: it isn't written twice.
    await store.append(key, [assistant("a1", "ahoy"), { type: "title", title: "no uuid" }]);
    assert.equal(await readRunSession(dir), "s-1");
    const reopened = createRunStore(dir);
    const loaded = await reopened.load(key);
    assert.equal(loaded?.length, 3);
    // What was loaded counts as written: resuming doesn't append it again.
    await reopened.append(key, [user("u1", "hello"), user("u2", "and now?")]);
    assert.equal((await reopened.load(key))?.length, 4);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("subagent transcripts go to their own files, listed for resuming", async () => {
  const dir = await tempDir();
  try {
    const store = createRunStore(dir);
    const sub = { ...key, subpath: "subagents/agent-abc" };
    await store.append(sub, [assistant("x1", "found it")]);
    await store.append(key, [user("u1", "go")]);
    assert.deepEqual(await store.listSubkeys?.({ projectKey: "project", sessionId: "s-1" }), ["subagents/agent-abc"]);
    assert.equal((await readFile(path.join(dir, "subagents", "agent-abc.jsonl"), "utf8")).trim().split("\n").length, 1);
    assert.equal((await createRunStore(dir).load(sub))?.length, 1);
    assert.equal(await createRunStore(dir).load({ ...key, subpath: "subagents/unknown" }), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a run folder never written to has nothing to load", async () => {
  const dir = await tempDir();
  try {
    assert.equal(await createRunStore(dir).load(key), null);
    assert.equal(await readRunSession(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the conversation keeps only what the human wrote and the agent replied", async () => {
  assert.deepEqual(entryText(user("u", "hi")), { role: "user", text: "hi" });
  assert.equal(entryText({ type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } }), null);
  assert.equal(entryText({ type: "user", isMeta: true, message: { content: "note" } }), null);
  assert.equal(entryText({ type: "user", message: { content: "<command-name>/chiste</command-name>" } }), null);
  assert.equal(entryText({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read" }] } }), null);
  assert.equal(entryText({ type: "system", message: { content: "x" } }), null);
  // The kit's plan-mode note goes, the human's words stay.
  assert.deepEqual(entryText(user("u", "<system-reminder>The user switched to plan mode.</system-reminder>\n\nfix it")), { role: "user", text: "fix it" });
});

test("runs are listed newest first with their last message; runs without a session are left out", async () => {
  const runsDir = await tempDir();
  try {
    const older = await createRunFolder(runsDir);
    await createRunStore(older.dir).append({ ...key, sessionId: "old" }, [user("u1", "first", "2026-09-01T10:00:00.000Z")]);
    const newer = path.join(runsDir, "newer");
    await createRunStore(newer).append({ ...key, sessionId: "new" }, [
      user("u1", "one", "2026-09-02T10:00:00.000Z"),
      user("u2", "two\nlines", "2026-09-02T10:05:00.000Z"),
      assistant("a1", "reply", "2026-09-02T10:05:01.000Z"),
    ]);
    await mkdir(path.join(runsDir, "legacy"));
    await writeFile(path.join(runsDir, "legacy", "session.log"), "old run\n");

    const runs = await listRuns(runsDir);
    assert.deepEqual(
      runs.map((run) => [path.basename(run.dir), run.sessionId, run.lastMessage]),
      [
        ["newer", "new", "two lines"],
        [path.basename(older.dir), "old", "first"],
      ],
    );
    assert.deepEqual(await readConversation(newer), [
      { role: "user", text: "one" },
      { role: "user", text: "two\nlines" },
      { role: "assistant", text: "reply" },
    ]);
    assert.deepEqual(await listRuns(path.join(runsDir, "missing")), []);
  } finally {
    await rm(runsDir, { recursive: true, force: true });
  }
});

test("--continue is read from the command line", () => {
  assert.equal(continueArgument(["--continue"]), true);
  assert.equal(continueArgument(["--language=es"]), false);
});

test("a run passed to buildSessionOptions keeps the session in its folder and resumes it", async () => {
  const dir = await tempDir();
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
  try {
    const config: BaseSessionConfig = { mode: "autonomous", projectDir: dir };
    const plain = await buildSessionOptions(config, dir, spec);
    assert.equal(plain.options.sessionStore, undefined);
    assert.equal(plain.options.resume, undefined);
    const fresh = await buildSessionOptions(config, dir, spec, { run: { dir, sessionId: null } });
    assert.ok(fresh.options.sessionStore);
    assert.equal(fresh.options.resume, undefined);
    const resumed = await buildSessionOptions(config, dir, spec, { run: { dir, sessionId: "s-1" } });
    assert.equal(resumed.options.resume, "s-1");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

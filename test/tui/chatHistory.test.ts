import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { capHistory, loadHistory, saveHistory } from "../../src/tui/chatTui.js";

test("capHistory keeps only the most recent `limit` entries, oldest dropped first", () => {
  const entries = Array.from({ length: 5 }, (_, i) => ({ text: `msg ${i}`, timestamp: `t${i}` }));
  const capped = capHistory(entries, 3);
  assert.deepEqual(
    capped.map((e) => e.text),
    ["msg 2", "msg 3", "msg 4"],
  );
});

test("capHistory returns all entries unchanged (as a copy) when under the limit", () => {
  const entries = [{ text: "a", timestamp: "t0" }];
  const capped = capHistory(entries, 100);
  assert.deepEqual(capped, entries);
  assert.notEqual(capped, entries); // a copy, not the same array reference
});

test("loadHistory on a missing file returns an empty array instead of throwing", async () => {
  const result = await loadHistory(path.join(tmpdir(), "agent-kit-history-does-not-exist.jsonl"));
  assert.deepEqual(result, []);
});

test("saveHistory then loadHistory round-trips entries, oldest-first, one JSON object per line", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "agent-kit-history-"));
  try {
    const filePath = path.join(dir, "sub", "history.jsonl"); // saveHistory must mkdir -p the parent
    const entries = [
      { text: "hola", timestamp: "2026-01-01T00:00:00.000Z" },
      { text: "/chiste", timestamp: "2026-01-01T00:00:01.000Z" },
    ];

    await saveHistory(filePath, entries);
    const raw = await readFile(filePath, "utf8");
    assert.equal(raw.split("\n").filter((l) => l.length > 0).length, 2);

    const loaded = await loadHistory(filePath);
    assert.deepEqual(loaded, entries);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("saveHistory overwrites (not appends) so a previous prune sticks on disk", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "agent-kit-history-"));
  try {
    const filePath = path.join(dir, "history.jsonl");
    await saveHistory(filePath, [
      { text: "one", timestamp: "t0" },
      { text: "two", timestamp: "t1" },
    ]);
    await saveHistory(filePath, [{ text: "two", timestamp: "t1" }]);

    const loaded = await loadHistory(filePath);
    assert.deepEqual(
      loaded.map((e) => e.text),
      ["two"],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

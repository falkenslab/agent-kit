/** @jsxRuntime automatic */
// tsx applies tsconfig.json (and its "jsx" setting) only to src/, so tests declare it.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { render, cleanup } from "ink-testing-library";
import { PromptInput } from "../../../src/tui/ink/PromptInput.js";
import { statusText } from "../../../src/tui/ink/SessionView.js";
import { listProjectFiles, matchingFiles, mentionAt } from "../../../src/tui/ink/fileMentions.js";
import { stripAnsi } from "../../../src/tui/ink/lineBuffer.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

afterEach(() => cleanup());

test("project files for @ mentions skip node_modules and dot folders", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    for (const file of ["README.md", "src/agent.ts", "node_modules/x/index.js", ".git/HEAD", ".run/log.txt"]) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), "");
    }
    assert.deepEqual(await listProjectFiles(root), ["README.md", "src/agent.ts"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the @mention before the cursor, and the files that match it", () => {
  assert.deepEqual(mentionAt("mira @src/ag", 12), { start: 5, query: "src/ag" });
  assert.deepEqual(mentionAt("@", 1), { start: 0, query: "" });
  assert.equal(mentionAt("correo@dominio", 14), null); // not after a space
  assert.equal(mentionAt("mira @src ", 10), null); // already closed
  const files = ["docs/agent-notes.md", "src/agent.ts", "src/tui/agentView.tsx", "README.md"];
  assert.deepEqual(matchingFiles(files, "agent"), ["src/agent.ts", "docs/agent-notes.md", "src/tui/agentView.tsx"]);
  assert.deepEqual(matchingFiles(files, "READ"), ["README.md"]);
});

test("@ lists matching files under the prompt and Tab completes the path", async () => {
  const submitted: string[] = [];
  const view = render(
    <PromptInput label="> " history={[]} commands={[]} files={["src/agent.ts", "README.md"]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />,
  );
  await settle();
  for (const chunk of ["lee @", "ag"]) {
    view.stdin.write(chunk);
    await settle();
  }
  assert.match(stripAnsi(view.lastFrame() ?? ""), /@src\/agent\.ts/);
  view.stdin.write("\t");
  await settle();
  view.stdin.write("y resume");
  await settle();
  view.stdin.write("\r");
  await settle();
  assert.deepEqual(submitted, ["lee @src/agent.ts y resume"]);
});

test("? on an empty prompt shows the shortcuts; any key closes them without typing", async () => {
  const submitted: string[] = [];
  const view = render(<PromptInput label="> " history={[]} commands={[]} onSubmit={(line) => submitted.push(line)} onExit={() => {}} />);
  await settle();
  view.stdin.write("?");
  await settle();
  assert.match(stripAnsi(view.lastFrame() ?? ""), /Ctrl\+R search history/);
  view.stdin.write("x");
  await settle();
  assert.doesNotMatch(stripAnsi(view.lastFrame() ?? ""), /Ctrl\+R search history/);
  view.stdin.write("ok");
  await settle();
  view.stdin.write("\r");
  await settle();
  assert.deepEqual(submitted, ["ok"]); // the key that closed the panel wasn't typed
});

test("the status bar shows the context in use and that the mode can be switched", () => {
  assert.equal(
    statusText("guided", 2, { inputTokens: 1500, outputTokens: 20, costUsd: 0 }, { contextPercent: 12.4, modeSwitchable: true }),
    "⏵⏵ guided (shift+tab) · 2 turns · 1.5k in / 20 out · context 12%",
  );
  assert.equal(statusText("autonomous", 1, null, { contextPercent: null }), "⏵⏵ autonomous · 1 turn");
});

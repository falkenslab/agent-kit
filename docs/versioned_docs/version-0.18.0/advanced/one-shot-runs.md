---
sidebar_position: 2
title: One-shot runs
description: Agents that do one task and end - scripts, scheduled jobs, CI - with or without a person watching.
---

# One-shot runs

Not every agent is a chat. A one-shot run gets a task, works on it and ends: a nightly job that updates a knowledge base, a CI step that reviews a change, a command-line tool.

## The shape

```ts title="update-notes.ts"
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  buildSessionOptions,
  createProgressView,
  ensureClaudeAuth,
  runQuery,
  type AgentSpec,
  type BaseSessionConfig,
} from "@falkenslab/agent-kit";

const workspace = path.resolve(process.argv[2] ?? ".");
const runDir = path.join(workspace, ".run", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(runDir, { recursive: true });

await ensureClaudeAuth();

const config: BaseSessionConfig = {
  mode: process.stdin.isTTY ? "guided" : "autonomous", // nobody to ask in a job
  projectDir: workspace,
  knowledgeDir: path.join(workspace, "knowledge"),
  sourcesDir: path.join(workspace, "sources"),
};

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You maintain this workspace's knowledge base.",
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};

const { options } = await buildSessionOptions(config, runDir, spec);
const view = createProgressView({ mode: config.mode });

const run = runQuery("/knowledge:ingest", options);
let failed = false;
for await (const event of run.events) {
  view.render(event);
  if (event.type === "turn-end") failed = event.failed;
}
await view.close();

process.exitCode = failed ? 1 : 0;
```

- A **string prompt** makes it one turn: the events end with its `turn-end`. A slash command (`/knowledge:ingest`) works as a prompt.
- The **progress view** shows it live on a terminal and prints plain lines otherwise (CI logs).
- **Exit codes** come from `turn-end.failed`.

## Unattended

- Use `autonomous` mode when nobody can answer, or keep `guided` and answer through the [response file](../human-in-the-loop/response-file.md) from a supervisor.
- Without a TTY, checkpoints never block on the keyboard: they wait for the file.
- Keep the run folders: `transcript.jsonl` tells what the agent did, tool by tool.

## Several steps

A multi-step job is a multi-turn session with a fixed script:

```ts
const queue = createInputQueue();
const run = runQuery(queue.iterable, options);
const events = run.events[Symbol.asyncIterator]();

async function turn(line: string): Promise<boolean> {
  queue.push(line);
  view.startTurn();
  while (true) {
    const { value, done } = await events.next();
    if (done) return false;
    view.render(value);
    if (value.type === "turn-end") return !value.failed;
  }
}

for (const step of ["/knowledge:ingest", "/knowledge:lint", "Write a short report of what changed to knowledge/syntheses/nightly.md"]) {
  if (!(await turn(step))) break;
}
queue.end();
run.close();
await view.close();
```

## Structured output

To use the result in code, ask for a format and parse the reply, or better, give the agent a tool to submit its result and read it from your tool's handler:

```ts
let verdict: { ok: boolean; reasons: string[] } | null = null;

const results = createSdkMcpServer({
  name: "results",
  version: "1.0.0",
  tools: [
    tool(
      "submit_verdict",
      "Submit your final verdict. Call it exactly once, at the end.",
      { ok: z.boolean(), reasons: z.array(z.string()) },
      async (args) => {
        verdict = args;
        return { content: [{ type: "text" as const, text: "Verdict received." }] };
      },
    ),
  ],
});
```

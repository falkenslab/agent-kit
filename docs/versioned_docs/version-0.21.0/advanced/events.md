---
sidebar_position: 1
title: Events
description: runQuery() and the AgentEvent stream, createInputQueue() for multi-turn sessions, and reading events correctly.
---

# Events

`runQuery()` wraps the SDK's `query()` and turns its raw message stream into a few normalized events. It's what the chats use, and what any other host (a desktop app, a server, a test) builds on.

```ts
function runQuery(prompt: string | AsyncIterable<SDKUserMessage>, options: Options): AgentRun;

interface AgentRun {
  events: AsyncIterable<AgentEvent>;
  interrupt(): Promise<unknown>; // stops the current turn, not the session
  close(): void; // ends the session
  supportedCommands(): Promise<SlashCommand[]>; // the session's slash commands
  contextUsage(): Promise<ContextUsage | null>; // { percentage, totalTokens, maxTokens }
}
```

- A **string** prompt is a one-shot run: one turn, then the events end.
- An **async iterable** of user messages is a multi-turn session: see [`createInputQueue()`](#multi-turn-sessions).

## The events

```ts
type AgentEvent =
  | { type: "text"; text: string }
  | { type: "action"; toolName: string; input: unknown; toolUseId?: string }
  | { type: "subagent-action"; toolName: string; input: unknown; toolUseId?: string; parentToolUseId?: string }
  | { type: "tool-result"; toolUseId: string; toolName: string; isError: boolean; text: string }
  | { type: "mcp-error"; failedServers: string[] }
  | { type: "info"; text: string; level: "info" | "notice" | "suggestion" | "warning" | "local-command" }
  | { type: "turn-end"; status: string; failed: boolean; resultText: string | null; errorText: string; usage?: SessionUsage }
  | { type: "prompt-suggestion"; suggestion: string };
```

| Event | When | Notes |
| --- | --- | --- |
| `text` | each streamed piece of the agent's reply | Concatenate them. There's no "block started" event: track whether the previous event was `text` to add a label. |
| `action` | the main agent calls a tool | `toolUseId` pairs it with its `tool-result`. |
| `subagent-action` | a subagent calls a tool | `parentToolUseId` is the `Agent` call that started the subagent. Kept apart so it never looks like the main agent acted. |
| `tool-result` | a main agent's tool call returns | The result as plain text (images and other parts left out); `isError` if it failed. Subagents' results aren't reported. |
| `mcp-error` | at startup, some MCP servers failed to connect | The session goes on without them. |
| `info` | the CLI's own output: a local command's output, a notice, an unknown command | Without it, an unknown slash command looked like silence. |
| `turn-end` | a turn finished | **Check `failed`, not `status`**: the SDK can report `status: "success"` for a turn that failed on an API error, with the message in `resultText`. `usage` is the session's cumulative total. |
| `prompt-suggestion` | the predicted next message (with `promptSuggestions: true`) | Arrives **after** its turn's `turn-end`. |

```ts
interface SessionUsage {
  inputTokens: number; // including cache reads and writes, all models
  cacheReadTokens?: number; // the part of inputTokens read from the cache: the context sent again on every call
  outputTokens: number;
  costUsd: number; // an estimate, not a bill
}
```

## A one-shot run

```ts
const run = runQuery("List the three most recent files in sources/ and summarize them.", options);

let reply = "";
for await (const event of run.events) {
  if (event.type === "text") reply += event.text;
  if (event.type === "action") console.log(`→ ${event.toolName}`);
  if (event.type === "turn-end" && event.failed) throw new Error(event.errorText || event.resultText || "The turn failed");
}
console.log(reply);
```

## Multi-turn sessions

For a conversation, the prompt is an async iterable that yields a message per turn and **must not finish** until the conversation does: the SDK closes the transport as soon as the iterable ends. `createInputQueue()` is a single long-lived generator you push lines into:

```ts
import { createInputQueue, runQuery } from "@falkenslab/agent-kit";

const queue = createInputQueue();
const run = runQuery(queue.iterable, options);
const events = run.events[Symbol.asyncIterator]();

async function ask(line: string): Promise<string> {
  queue.push(line);
  let reply = "";
  // Read up to this turn's turn-end with manual next() calls, never `for await … break`.
  while (true) {
    const { value, done } = await events.next();
    if (done) return reply;
    if (value.type === "text") reply += value.text;
    if (value.type === "turn-end") return reply;
  }
}

console.log(await ask("Hello!"));
console.log(await ask("What did I just say?"));

queue.end();
run.close();
```

:::danger Never `break` out of `for await` over `run.events`
`run.events` is one generator for the whole session. Breaking out of a `for await` loop calls its `return()`, which closes it for good: the next turn sees `done: true` immediately and the rest of the conversation is silently lost. Read turn by turn with `events.next()`, as above.
:::

With switchable modes, pass the session's mode control, `createInputQueue({ modeControl })`: when the person switches into or out of plan mode, the next message carries a `<system-reminder>` telling the model so (see [modes](../core-concepts/modes.md#plan)). Both chats do this for you.

`createDeferred()` is a small helper (`{ promise, resolve }`) to signal "this turn finished" between a reader loop and the code waiting for it.

## Reading events continuously

A UI usually runs one reader for the whole session and reacts to events as they come, because some arrive between turns (`prompt-suggestion` after `turn-end`, `mcp-error` before the first turn):

```ts
let turnDone: (() => void) | null = null;

void (async () => {
  while (true) {
    const { value, done } = await events.next();
    if (done) break;
    window.webContents.send("agent:event", value); // forward to a UI
    if (value.type === "turn-end") turnDone?.();
  }
})();

async function send(line: string): Promise<void> {
  const finished = new Promise<void>((resolve) => (turnDone = resolve));
  queue.push(line);
  await finished;
}
```

## Interrupting

`run.interrupt()` stops the current turn (the Esc key in the chats); the session stays open and a `turn-end` arrives. `run.close()` ends the session; safe to call from a signal handler while events are still being read.

```ts
process.on("SIGINT", () => void run.interrupt());
```

An interrupted turn's `errorText` never includes the CLI's internal `[ede_diagnostic]` lines: the kit filters them out.

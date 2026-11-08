---
sidebar_position: 1
title: Runs and resuming
description: Run folders, the session store that keeps each conversation in its folder, --continue, /resume and the API behind them.
---

# Runs and resuming

A **run** is one execution of an agent. With a runs folder, each run gets a folder of its own that keeps its session log, its tool transcript and the whole conversation, so the person can pick it up again later.

## Turning it on

Give the chat a runs folder and a **session opener** instead of fixed options:

```ts
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  historyPath: path.resolve(".run/history.jsonl"),
});
```

The opener is called with a `RunFolder` (`{ dir, sessionId }`) and returns the session's options. Passing `{ run }` to `buildSessionOptions()` is what keeps the conversation in `run.dir` and resumes `run.sessionId` when there is one.

## What a run folder holds

```text
.run/
├── history.jsonl                 ↑/↓ history (historyPath), shared by every run
└── 2026-09-29T10-15-00-000Z/     one run, named after its start time (UTC)
    ├── session.log               what the terminal showed, plain text
    ├── transcript.jsonl          tool calls and results, secrets redacted
    ├── conversation.jsonl        the SDK's transcript of the conversation
    ├── subagents/
    │   └── agent-a67….jsonl      each subagent's transcript
    └── session.json              { "sessionId": "…", "subagents": { … } }
```

A run with no conversation yet has only `session.log`. `session.json` appears with the first message and maps the SDK's session id and its subagents' transcripts to files.

## Resuming

| How | What happens |
| --- | --- |
| `--continue` on the command line | The chat starts with the latest run that has a conversation: it's redrawn and the session resumes. |
| `/resume` in the chat | A list of runs (date and the person's last message, newest first) in place of the prompt: ↑/↓ and Enter pick one, Esc cancels. The plain chat asks for a number. |

When a run is resumed:

- the agent remembers the whole conversation, subagents included;
- the conversation is redrawn: from the start in full screen, after what's already on screen inline (a terminal's scrollback can't be taken back), then a line `(resumed the conversation of <date>)`;
- the run's `session.log` and `transcript.jsonl` keep growing in the same folder;
- `initialPrompt` isn't sent again.

`/resume` builds the session anew through your opener, because MCP servers, the step gate and the transcript are bound to the run's folder. A line typed during a turn (`/resume` included) waits until the turn ends.

## How it works

The SDK can keep a session's transcript somewhere other than its default through a **`SessionStore`**, an adapter it calls as the transcript grows (`append`) and before resuming (`load`). `createRunStore(dir)` is one that keeps a session in a run folder:

- `append(key, entries)` writes the main transcript to `conversation.jsonl` and each subagent's to `subagents/<name>.jsonl`, in order, skipping entries it already has (by `uuid`);
- `load(key)` reads them back when the SDK resumes; `listSubkeys()` lists the subagents' transcripts so they come back too.

Resuming was checked against the real SDK: a resumed session remembers the conversation, subagents included, even with the CLI's own copy deleted, and keeps its session id.

:::note The CLI keeps its own copy
While a store is in use, the CLI still writes its own copy under `~/.claude/projects/`. It can't be turned off.
:::

## The API

Everything the chats use is exported, for a host that builds its own resume UI:

```ts
import { createRunFolder, createRunStore, listRuns, readConversation } from "@falkenslab/agent-kit";

// The runs with a conversation, newest first.
const runs = await listRuns(runsDir);
// [{ dir, sessionId, updatedAt: Date, lastMessage: "…" }, …]

// What was said, to redraw it: the person's messages and the agent's replies.
const messages = await readConversation(runs[0].dir);
// [{ role: "user", text: "…" }, { role: "assistant", text: "…" }, …]

// A new run folder.
const run = await createRunFolder(runsDir); // { dir, sessionId: null }

// Options that keep the conversation in the folder (and resume it).
const { options } = await buildSessionOptions(config, run.dir, spec, { run });
// …or by hand: { ...options, sessionStore: createRunStore(run.dir), resume: run.sessionId ?? undefined }
```

| Function | Returns |
| --- | --- |
| `createRunFolder(runsDir)` | a new `RunFolder` (`<runsDir>/<timestamp>/`) |
| `listRuns(runsDir)` | `RunSummary[]`: runs with a `session.json`, newest first |
| `readConversation(dir)` | `ConversationMessage[]`: the person's messages and the agent's text replies (tool calls, tool results and slash-command expansions left out) |
| `createRunStore(dir)` | a `SessionStore` bound to that folder |

## Things to know

- **Runs folders are sensitive.** The SDK's transcript isn't redacted. Keep them out of version control.
- **Older runs** without `session.json` (from before runs folders, or that never got a message) aren't listed.
- **A run folder is created on every start**, even if the person resumes another one right away.
- **`SessionStore` is an alpha API** of the SDK: it's re-checked on every SDK upgrade of the kit.

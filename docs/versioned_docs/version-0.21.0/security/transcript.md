---
sidebar_position: 5
title: Transcript and logs
description: What the kit writes to disk for each run, and how secrets are kept out of it.
---

# Transcript and logs

Each run leaves a trail in its folder:

| File | Written by | Content | Redacted |
| --- | --- | --- | --- |
| `transcript.jsonl` | the transcript logger hook | every tool call and result, as JSON lines | yes |
| `session.log` | the chat | what the terminal showed, as plain text | no |
| `conversation.jsonl`, `subagents/*.jsonl` | the [run store](../sessions/runs-and-resuming.md) | the SDK's full transcript | no |

## `transcript.jsonl`

A `PreToolUse` and a `PostToolUse` hook append one line per event:

```json
{"ts":"2026-09-29T10:15:02.114Z","event":"pre_tool_use","tool":"WebFetch","input":{"url":"https://example.com","prompt":"Summarize"}}
{"ts":"2026-09-29T10:15:04.870Z","event":"post_tool_use","tool":"WebFetch","result":"Example Domain. This domain is for use in illustrative examples…"}
```

- The file is created on the first tool call; a session without tool calls has none.
- Long results are cut at 2,000 characters, and base64 payloads (screenshots) are replaced by `[image omitted, N bytes base64]`, so a browser agent's transcript stays readable.
- Every line is redacted before it's written: each value in `config.secrets`, and `CLAUDE_CODE_OAUTH_TOKEN` always, become `***`.

```ts
const password = await readPasswordFromVault();

const config: Config = {
  mode: "guided",
  projectDir,
  password,
  secrets: [password, process.env.SHOP_API_KEY!],
};
```

Redaction replaces exact values. A secret the model reformats (splits, encodes, quotes differently) won't match; keep secrets out of the agent's reach with `deniedPaths` and by not putting them in prompts.

`createTranscriptLogger(path, secrets)` and `summarizeToolResponse()` are exported for sessions assembled by hand.

## `session.log`

The chats mirror what the terminal shows into the run's `session.log`: the welcome message, each line typed, the agent's replies, `[action]` lines for tool calls, notices and errors, without colors. It's the easiest way to read what happened in a run. It isn't redacted: it contains whatever was typed and replied.

## The SDK's transcript

With a runs folder, the SDK's own transcript (every message, tool input and tool result, in full) is kept in the run folder so the conversation can be resumed. The CLI also keeps its copy in `~/.claude/projects/`. Neither is redacted.

:::warning
Treat run folders as sensitive: keep them out of version control and backups you share.
:::

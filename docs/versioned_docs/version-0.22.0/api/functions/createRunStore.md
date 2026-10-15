# Function: createRunStore()

```ts
function createRunStore(dir): SessionStore;
```

Defined in: [core/runs.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L104)

A `SessionStore` (the SDK's adapter for keeping transcripts elsewhere) that keeps one
session in one run folder: `conversation.jsonl` for the main transcript,
`subagents/*.jsonl` for each subagent's, and `session.json` with the session's id and
which file is which subagent's. The SDK appends to it as the transcript grows and loads
from it before resuming (confirmed empirically: a resumed session remembers the
conversation, its subagents' transcripts included, even with the CLI's own copy deleted).
The CLI still writes that copy under `~/.claude/projects/`: it can't be turned off while a
store is in use.

Bound to one folder, so every key it receives is taken as this run's session: one run
folder is one conversation, resumed as many times as wanted (the session keeps its id).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `dir` | `string` |

## Returns

`SessionStore`

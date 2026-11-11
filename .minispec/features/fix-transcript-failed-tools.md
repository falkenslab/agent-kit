# The transcript keeps no trace of a tool call that failed

Issue: [#96](https://github.com/falkenslab/agent-kit/issues/96)

## Problem

- When a tool call fails, `transcript.jsonl` has its `pre_tool_use` line and nothing after it: no result, no error. The model saw the error and acted on it; the record doesn't have it.
- Seen in padawan (0.34.0): two `mcp__moodle__save_submission` calls failed (the assignment took no files). The agent explained it in its summary; the transcript showed only the two `pre_tool_use` lines, so the test report couldn't quote what the tool said.

## Cause

`createTranscriptLogger()` (`src/core/hooks/transcriptLogger.ts`) hooks only `PreToolUse` and `PostToolUse`. A failed call fires `PostToolUseFailure` instead, which the kit doesn't hook.

## Solution

- A `post_tool_use_failure` line for a failed call: the tool and its error message, redacted and cut short as results are.
- Hooked where the other two are, for the main session and subagents alike.
- Confirm empirically which failures fire it (an MCP result with `isError`, a thrown error, a denied call) and write it down in the SDK behaviors page and the `upgrade-sdk` skill.
- Docs (English and Spanish): the transcript (security), SDK behaviors.

## Verification

- A test: the logger's failure hook writes the line with the error, secrets redacted.
- Against the real SDK, a failing MCP call leaves its `post_tool_use_failure` line.
- `verify` passes.

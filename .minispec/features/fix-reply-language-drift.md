# The reply language drifts to English between tool calls

Issue: [#85](https://github.com/falkenslab/agent-kit/issues/85)

## Problem

- With `replyInLanguage` and a Spanish session, the agent still writes some of its narration between tool calls in English: in miyagi (0.30.1), after a `Grep` and a `Read` of a source, "I'll read the whole document in parts to get the context right."; before, after loading a skill ("All 10 topic pages created. Now creating…"). The rest of its narration and its answer were in Spanish.
- The drift follows whatever English the model just read: tool results, skills, the kit's own messages.

## Cause

The reply language is stated once, in the system prompt (`replyLanguageInstruction()`, `src/core/language.ts`, added in `session.ts`), far from where the model writes. The kit's per-turn notes (`UserPromptSubmit`) come once per message of the person; in a one-shot run there's only one, and the drift happens later, between tool calls.

## Solution

- When `replyInLanguage` is on and the language isn't English, a `PostToolUse` hook for the main agent adds a one-line reminder as `additionalContext` ("Reply language: Spanish, your narration between tool calls too."), next to the last thing the model read. A few tokens per call; measure how many on a real session, and, if too many, add it only after tools whose results are long or in English (a `Read`, a skill, an extension's result), or every few calls.
- The same line with the person's message (`UserPromptSubmit`).
- `replyInLanguage: "prompt-only"` keeps only the system prompt's line, for an agent that doesn't want the reminders.
- Docs (English and Spanish): Languages, AgentSpec (`replyInLanguage`).

## Verification

- Tests: the hook adds the reminder for a non-English session and not for English or `"prompt-only"`; not for subagents' calls.
- Tried on a real session that read an English document: the narration stays in Spanish; the token cost per call measured and noted.
- `verify` passes.

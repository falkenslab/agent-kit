# A cheaper task list

Issue: [#27](https://github.com/falkenslab/agent-kit/issues/27)

## Goal

The task list the kit gives every session costs a fraction of the 3.4k tokens `TodoWrite`'s definition takes on every call, and still shows in both chats.

## Context

- Since 0.16 every session gets the SDK's `TodoWrite` (todos.ts), with `CLAUDE_CODE_ENABLE_TASKS=0` so the CLI offers it. Its description is the CLI's, long and full of examples: about 3.4k input tokens per call (measured on Captain Whiskers), the largest single piece the kit adds.
- The kit can't shorten it, and an agent can only remove it whole (`disallowedTools`), losing the list.
- The chats draw the list from `TodoWrite`'s input (`parseTodos`), the plan gate lets it through as read-only, the tool labels and phrases name it; miyagi's user docs name `TodoWrite`. padawan and miyagi don't reference it in code.
- Risk: the model knows `TodoWrite` well; a tool of the kit's may be used less, or differently.

## Changes

- Measure first: a kit tool (e.g. `mcp__tasks__update_tasks`, the same `{ todos: [{ content, status, activeForm }] }` input) with a short description, against `TodoWrite`, on the same long jobs (Captain Whiskers' treasure hunt, a padawan and a miyagi task). Go on only if it's used as reliably.
- Replace `TodoWrite` with it: session tools, `env` (no `CLAUDE_CODE_ENABLE_TASKS` needed), plan gate, step gate (it never asks), labels, phrases, both chats; `parseTodos` accepts both names, for transcripts.
- Possibly `AgentSpec.taskList?: boolean` (default `true`) for an agent that wants no list; only if one needs it.
- Docs: the task list's pages, `sdk-behaviors.md`, `context-and-cost.md`; Captain Whiskers' README and guide.

## Acceptance

- The session's first call is about 3k tokens smaller.
- The list shows as before in the Ink chat and the plain one, and plan mode allows it.
- Tried in padawan and miyagi (linked to the local kit) before a release: their long jobs still keep a list.
- `verify` passes.

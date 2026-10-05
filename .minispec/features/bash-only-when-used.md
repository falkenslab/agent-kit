# Bash only when a subagent uses it

Issue: [#25](https://github.com/falkenslab/agent-kit/issues/25)

## Goal

A session gets the `Bash` tool only when one of its registered subagents can use it, so agents whose subagents don't use it stop paying for its definition.

## Context

- `buildSessionOptions()` adds `Agent` and `Bash` to the session's tools whenever `spec.buildSubagents()` returns something (ADR-003): the SDK refuses to spawn a subagent whose `tools` name a tool the session doesn't have, so `Bash` must be there for a subagent to use it.
- But it's added even when no subagent lists it. Its definition costs about 1.9k input tokens on every call (measured on Captain Whiskers: 23.7k → 21.8k without it), and the main agent can't use it anyway (`subagentBashGate`).
- Captain Whiskers' three subagents don't use it; miyagi's `researcher` and `pedagogy-reviewer` don't either (only its opt-in `practice-runner` does); padawan registers subagents only with its opt-in Bash features, all of which list `Bash`.
- A subagent without `tools` inherits every session tool, `Bash` included: it must keep getting it.

## Changes

- `Bash` in the session's `tools`/`allowedTools` only when some registered subagent lists `"Bash"` in its `tools`, or has no `tools` (inherits them all). `Agent` and the three gates stay as they are whenever there are subagents.
- The comments in `session.ts` and `subagentBashGate.ts` say so; ADR-003's consequences mention it.
- Docs: `capabilities/subagents.md`, `security/subagent-gates.md`, `sessions/context-and-cost.md` (the measured saving).

## Acceptance

- Subagents that don't list `Bash`: the session has `Agent` but not `Bash`, and the three gates are still registered.
- A subagent listing `Bash`, or one without `tools`: the session has `Bash`, as before.
- Captain Whiskers' first call is about 1.9k tokens smaller, and his crew still works.
- padawan and miyagi: same tools as before when their Bash features are on; without `Bash` otherwise (miyagi's researcher and reviewer keep working).
- `verify` passes.

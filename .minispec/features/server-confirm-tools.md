# One question, not two: no guided-mode question for a tool whose server asks the person itself

Issue: [#77](https://github.com/falkenslab/agent-kit/issues/77)

## Goal

An extension's tool whose server asks the person itself before acting (MCP elicitation) is asked about once, by the server, not also by the kit's guided gate.

## Context

- Since 0.27 (#74, #76), guided mode asks before an extension's tool that isn't read-only, and always before a `confirmTools` or `destructiveHint` one.
- moodle-mcp 0.5.0 asks the person itself, through elicitation, before what can't be undone (deleting, unenrolling, resetting or restoring a course: falkenslab/moodle-mcp#50), and marks those tools `destructiveHint`; docker-mcp will too (falkenslab/docker-mcp#8). So deleting an activity in miyagi's guided chat asks twice for the same yes.
- The server's question is the stronger one: its answer never reaches the model, and it holds in Claude Code and Codex too.
- Elicitation reaches the person through `onElicitation` (`elicitation.ts`, #58) in every mode but autonomous, where it's declined.

## Changes

- **`metadata["agent-kit"].serverConfirmTools`** (short names): tools whose server asks the person itself. The guided gate lets them through without its own question while elicitation reaches the person (not autonomous); otherwise it asks as now.
- Plan mode still stops them (they aren't read-only); autonomous still denies them unless `extensionGate.autonomous` allows them (the server, with no one to answer, refuses anyway).
- In the schema, the reference (how it differs from `confirmTools`) and agent-kit-catalog's known fields.
- Docs (English and Spanish): Writing an extension, the manifest reference, Approvals.
- Left for later: a server saying it itself (a tool annotation or `_meta`), read like `readOnlyHint`, the manifest's list winning.

## Acceptance

- With moodle-teacher listing `serverConfirmTools`, `delete_activity` in a guided chat asks once, with moodle-mcp's form; a no there leaves the activity and the model is told.
- Its other destructive tools without a server question still get the kit's panel.
- In plan mode they're stopped; in autonomous, denied by default.
- Tests for each; `verify` passes.

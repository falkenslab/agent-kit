# Glossary

## AgentSpec

What a concrete agent implements: everything domain-specific about its sessions.

## Consumer

A concrete agent built on the kit (`teacher-agent`, `student-agent`, `captain-whiskers`, a desktop app).

## Mode

`interactive`, `guided` or `autonomous`: how much a human is in the loop. Not the same as chat vs one-shot run.

## Run directory (`runDir`)

Per-session folder: `transcript.jsonl`, `approval-response.txt`, files to save to sources.

## Response file

`<runDir>/approval-response.txt`: how a non-terminal host answers approvals and step gates.

## Knowledge base

`knowledgeDir`: the agent's own notes (wiki layer), with `index.md` and `log.md`.

## Sources

`sourcesDir`: originals as obtained (raw layer); readable, never edited.

## Subagent

An `AgentDefinition` a consumer registers via `buildSubagents()`; the only place Bash can run.

## Host

Whatever runs the session: a terminal CLI, an Electron main process, a sidecar.

## Confirmed empirically

SDK behavior verified by hand against the real SDK, not taken from its docs.

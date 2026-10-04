# Glossary

## AgentSpec

What a concrete agent implements: everything domain-specific about its sessions.

## Consumer

A concrete agent built on the kit (`miyagi`, `padawan`, `captain-whiskers`, a desktop app).

## Mode

`interactive`, `guided`, `autonomous` or `plan`: how much a human is in the loop. Not the same as chat vs one-shot run.

## Run directory (`runDir`)

Per-run folder: `transcript.jsonl`, `approval-response.txt`, files to save to sources; with a runs folder also `session.log`, `conversation.jsonl`, `subagents/` and `session.json` (ADR-020).

## Runs folder (`runsDir`)

Where a chat creates each run's folder and finds the runs to resume (`--continue`, `/resume`).

## Response file

`<runDir>/approval-response.txt`: how a non-terminal host answers approvals and step gates.

## Knowledge base

`knowledgeDir`: the agent's own notes (wiki layer), reached through the `knowledge_*` tools over a `KnowledgeStore`; on disk, `index.md`, `log.md`, `overview.md` and a folder per page type.

Page id: `type/slug` (`concept/spring-tides`), how the tools name a page and how pages link to each other.

## Sources

`sourcesDir`: originals as obtained (raw layer); readable, never edited.

## Subagent

An `AgentDefinition` a consumer registers via `buildSubagents()`; the only place Bash can run.

## Host

Whatever runs the session: a terminal CLI, an Electron main process, a sidecar.

## Kit language

The language of the kit's texts and the agent's replies, one per process: `--language`, the agent's option, the system's, English (ADR-019).

## Confirmed empirically

SDK behavior verified by hand against the real SDK, not taken from its docs.

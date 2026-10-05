# ADR-007: File access is bounded by a hook, sources are append-only

## Decision

`createFileScopeGate()` is the real boundary for `Read`/`Write`/`Edit`/`Grep`, for the main agent and subagents: writes only in `knowledgeDir` and `extraWritableDirs`, `Grep` only there plus `sourcesDir`, `deniedPaths` never. `sourcesDir` is not writable; the agent adds to it only through `save_to_sources`, which copies with `COPYFILE_EXCL`.

## Motivation

`cwd` is the project, so the SDK's own scope includes whatever lives there (a config file with a password). Keeping the agent out of it can't rest on the system prompt. Originals must never be overwritten by the agent's notes.

## Consequences

Bash is not covered, so Bash stays with opt-in subagents (ADR-003). The pure decision `checkFileScope()` is unit-tested.

`Read` and `Glob` were left open with a deny-list, which never names every secret: an agent could read `~/.ssh`, other projects' `.env` or the SDK's credentials (#28). With `AgentSpec.restrictReads` they become an allow-list (`readableDirs`): the searchable folders plus what only the kit knows (the run folder, the plugin roots, the project's `.claude/`, the SDK's `tool-results/` for the project). `Glob` follows `Read`'s rules from where it really starts, and the SDK's credentials are always denied. Opt-in so existing agents don't change; the default in the next breaking release.

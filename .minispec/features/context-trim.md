# Trim what every turn sends to the model

## Goal

Let an agent keep out of its context the skills and memory files it doesn't use, so each turn sends only what the agent needs.

## Context

- Measured with `Query.getContextUsage()` on a session set up like captain-whiskers, before any message: 11.4k tokens. System tools 6.2k, skills 3.5k, memory files 0.8k, system prompt 0.8k, custom agents 0.1k. A "hola" turn shows ~15k in the status bar.
- Skills: `buildSessionOptions()` sets `skills: "all"`, so the listing includes every discovered skill (the SDK's built-ins such as pdf/docx/xlsx, the user's personal ones, the plugins'). The SDK takes a list instead (`skills: string[]`, names or `plugin:skill`), a context filter, not a sandbox.
- Memory files and settings: `settingSources` isn't set, so the SDK loads all sources: the user's `~/.claude/` (settings, CLAUDE.md, skills), the project's `.claude/` and CLAUDE.md files found up the directory tree. captain-whiskers picks up agent-kit's own CLAUDE.md (instructions for developing the kit) that way. Beyond tokens, an agent built on the kit inherits the Claude Code configuration of whoever runs it.
- System tools: little room. `Agent` and `Bash` must be in the session's tools whenever there are subagents (ADR-003, confirmed empirically).

## Changes

- `AgentSpec.skills?: string[] | "all"`: the skills the agent offers. Default `"all"` (current behavior). With a list, the kit adds the knowledge plugin's own skills when the knowledge base is on, so a spec lists only its own.
- `AgentSpec.settingSources?: SettingSource[]`: which filesystem settings (and CLAUDE.md files) the session loads. Default: omitted (current behavior, all of them). `[]` isolates the agent from the machine's Claude Code configuration; `["project"]` keeps the project's `.claude/` and CLAUDE.md. Document that project skills under `<projectDir>/.claude/skills` need `"project"`.
- captain-whiskers: `skills` limited to its plugin's skills and `settingSources: []` (its skills come from its plugin).
- Measure again with `getContextUsage()` and record the figures here, then in the ADR.
- An ADR for the defaults: keep current behavior by default (no consumer changes), and say when an agent should restrict each one.

## Acceptance

- captain-whiskers' context before any message drops by the skills and memory files it doesn't use (expected ~4k fewer tokens), and it still tells jokes with its skills and commands.
- A spec that sets neither option gets exactly the options it gets today (test on `buildSessionOptions()`).
- With the knowledge base on and a `skills` list, the knowledge skills are still offered (test).
- `verify` passes.

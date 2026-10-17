# Red teaming agents built on the kit

Issue: [#68](https://github.com/falkenslab/agent-kit/issues/68)

## Goal

An agent on the kit can be attacked on purpose, as it really runs (its spec, its extensions, the kit's gates), to find what it falls for before someone else does: first Captain Whiskers, then miyagi and padawan in their own repositories.

## Context

- An agent's defences are the kit's (the file scope gate and denied paths, plan mode, the subagent gates, workspace trust, extension secrets) and the agent's own (miyagi asks before publishing or grading; moodle-teacher pseudonymizes students). Unit tests check the gates' mechanics, not what the model does when someone tries to trick it.
- The biggest risk is indirect prompt injection: instructions hidden in what the agent reads (a document in `sources/`, a downloaded page, a student's submission or forum post, an MCP server's output).
- Promptfoo (MIT, Node, OpenAI's since March 2026) generates attacks with plugins for agents (`indirect-prompt-injection`, `excessive-agency`, `agentic:memory-poisoning`, `hijacking`, `data-exfil`, `pii:*`, `rbac`, `prompt-extraction`, `mcp`), multi-turn strategies and reports. Its own `anthropic:claude-agent-sdk` provider starts the SDK from YAML options, not from `buildSessionOptions()`: it would test a generic Claude Code, without the kit's gates. A custom provider (any object with `id()` and `callApi(prompt)`, nothing to import) runs the real agent.
- The alternatives were weighed (PyRIT, garak, DeepTeam, AgentDojo, Inspect): all Python, and garak tests models, not agents. AgentDojo's idea is kept: score by the state left behind (a grade changed, a file written outside the agent's folders, something published), not by another model's opinion.
- Serving the agent over MCP (#51) would let Promptfoo connect too, but its MCP provider takes JSON tool calls one at a time, with no session and only autonomous mode: it can't test approvals. Later, as one more entry point.
- The end-to-end bench (#35) needs the same thing: running an agent on a scripted conversation and seeing what it did.

## Changes

- **In `src/`, nothing about Promptfoo**: a function that runs an agent on a copy of a workspace (its spec and config, a temporary folder), sends it one or more messages, answers for the person by a script (approve, deny, choose), and returns what happened: its replies, the tools called with their inputs, what the gates denied, the files written. Built on `buildSessionOptions()`, `runQuery()`'s events and the `InteractionPort` (ADR-013). Exported, documented, shared with #35.
- **`redteam/` at the root**, outside the package (its own `package.json`, Promptfoo a dependency there only, as `docs/` has Docusaurus): the Promptfoo adapter (about 15 lines over that function, one session per attack so multi-turn strategies work), and the captain's pilot config.
- **The pilot, against Captain Whiskers**, with five plugins: `indirect-prompt-injection` (a document in his chest, a downloaded page), `agentic:memory-poisoning` (his memory and logbook), `excessive-agency`, `prompt-extraction` and `data-exfil`; plus the kit's own cases scored by state: never reading an extension's `.secrets/` or the CLI's credentials, never writing outside his folders, nothing written in plan mode, the main agent never running Bash through a subagent, a hostile MCP server in an installed extension (Promptfoo's `evil-mcp-server`).
- **Safe and private by default**: every run on a temporary copy; Claude as the attacker and the grader; Promptfoo's remote generation and telemetry off (its environment variables, set in the scripts); on demand (`npm run redteam` in `redteam/`), never in CI, with what it costs written down.
- **For miyagi and padawan**: the same adapter in their repositories, against moodle-sandbox only (students' injections in submissions and forum posts, grading or publishing without the teacher's yes, students' names getting through, acting as the other role). Their own features, after the pilot.
- Docs: a guide (red teaming an agent: the function, the adapter, the pilot, privacy and cost) and `architecture.md`; an ADR if the function's design decides something lasting.

## Acceptance

- The function runs the captain on a scripted two-turn conversation with an approval denied, and returns the replies, the tools called, the denial and the files written; a unit test covers it with `runQuery` replaced.
- `npm run redteam` in `redteam/` runs the pilot against the real captain on a temporary copy, with nothing sent to Promptfoo's servers, and writes a report.
- At least one state-scored case fails on purpose when a gate is switched off in a test build (the attack is real), and passes with it on.
- `@falkenslab/agent-kit` gains no dependency.
- `verify` passes.

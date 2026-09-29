# Project

## What

`@falkenslab/agent-kit` is generic, domain-agnostic scaffolding for building an agent on top of `@anthropic-ai/claude-agent-sdk`.

## What it does

- Wires SDK session options from a small `AgentSpec` contract and a `mode` (interactive / guided / autonomous).
- Human-in-the-loop: step gate, approval tool, manual-intervention tool, answered from a terminal or a response file.
- Security hooks: file scope, subagent gates, MCP permissions, transcript logging with secret redaction.
- A built-in knowledge base (LLM-wiki pattern) with its own plugin of skills and commands.
- A normalized event stream (`runQuery()`), tool-label formatting, a terminal UI (Ink, with a readline fallback) and Claude auth.
- The kit's texts and the agent's replies in English, Spanish, French or German (ADR-019).
- Each run's conversation kept in its run folder, resumed with `--continue` or `/resume` (ADR-020).
- A color theme by roles an agent overrides in part (ADR-021).
- A versioned documentation site on GitHub Pages, with a generated API reference (ADR-022).

## For whom

- Developers of concrete agents: `teacher-agent`, `student-agent` (sibling repos), desktop apps (Electron) and sidecars that drive the core without a terminal.

## Goal

Keep every agent's generic plumbing and guardrails in one versioned place, so each agent only writes its domain.

## Origin and consumers

Extracted from a concrete agent (moodle-agent). Design decisions were validated against real consuming agents; source comments marked "confirmed empirically" encode real SDK behavior or production bugs.

- `examples/captain-whiskers/` — standalone toy agent (`file:../..`, imports only from the package root, needs `npm run build` here first), autonomous by default (`CAPTAIN_MODE` switches it); exercises the kit end to end, Ink chat and subagents included.
- `student-agent`, `teacher-agent` — real-size consumers, where gaps in the kit are discovered.

Version 0.x: the API is not yet stable.

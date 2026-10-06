---
sidebar_position: 1
title: Overview
description: Every guardrail the kit sets up, what it protects against and where it's enforced.
---

# Security overview

An agent acts through tools, so the kit's guardrails sit on the tools: which exist, which are approved, and what each call may touch. They're enforced in the SDK's options and in `PreToolUse` hooks, which run before every tool call, the main agent's and its subagents'. A hook's denial can't be talked around by the model; a line in the prompt can.

| Guardrail | Protects against | Where | Page |
| --- | --- | --- | --- |
| Minimal tool set | the model using tools the agent has no business with (the CLI has dozens) | `tools` / `allowedTools` | [Session options](../core-concepts/session-options.md#tools) |
| `disallowedTools` | a specific tool, including an MCP server's dangerous one | SDK, before anything else | [AgentSpec](../core-concepts/agent-spec.md#disallowedtools) |
| File scope | writes outside the agent's folders, edits to originals, searches over the whole project, reading protected files | `PreToolUse` hook | [File scope](file-scope.md) |
| Subagent type gate | the SDK's built-in `general-purpose` subagent, which inherits every tool | `PreToolUse` hook | [Subagent gates](subagent-gates.md) |
| Subagent Bash gate | the main agent running shell commands | `PreToolUse` hook | [Subagent gates](subagent-gates.md) |
| Subagent foreground gate | subagents launched in the background and silently lost | `PreToolUse` hook | [Subagent gates](subagent-gates.md) |
| MCP approval | nothing: it approves every `mcp__*` call so project servers work | `canUseTool` | [Permissions and isolation](permissions-and-isolation.md) |
| Setting sources, auto-memory, git context | the runner's personal Claude Code configuration leaking into the agent | SDK options | [Permissions and isolation](permissions-and-isolation.md) |
| Step gate, approvals | actions a person should see first | hook and tool | [Human in the loop](../human-in-the-loop/overview.md) |
| Plan gate | changes while the agent is only meant to plan | `PreToolUse` hook | [Modes](../core-concepts/modes.md#plan) |
| Transcript redaction | secrets written to logs | `PreToolUse`/`PostToolUse` hook | [Transcript](transcript.md) |

## What the kit does not protect

- **Bash.** A subagent with `Bash` can reach any path and run any command the user can. The file scope doesn't apply to it. Keep Bash opt-in and prefer [a dedicated tool](../capabilities/tools-and-mcp.md#in-process-tools-tool-and-createsdkmcpserver).
- **Your MCP tools.** A tool you register runs with your process's permissions. Validate its inputs, and put destructive ones behind an [approval](../human-in-the-loop/overview.md#asking-from-your-own-code) or in `disallowedTools`.
- **Web content.** `WebFetch` and `WebSearch` bring untrusted text into the context (prompt injection). The guardrails above limit what an injected instruction can make the agent do; they don't stop the agent from reading it.
- **The run folders.** They hold whole conversations and tool results, unredacted. Keep them out of version control and out of shared folders.
- **Prompts.** "Never do X" in a prompt is a request. Anything that must never happen belongs in `disallowedTools` or a hook.

## A checklist for a new agent

1. Give it the narrowest folders: `knowledgeDir` for notes, `sourcesDir` for originals, nothing more unless needed.
2. Give it only the folders it must read (`sourcesDir`, `extraReadableDirs`): it [reads nothing else](file-scope.md#what-the-agent-can-read). Put every secret file inside them in `deniedPaths` and every secret value in `secrets`.
3. Disallow every tool you don't want, especially from third-party MCP servers.
4. Prefer small tools to Bash; if a subagent really needs Bash, make it opt-in.
5. Start new agents in `interactive` or `guided` mode.
6. Keep `settingSources` at its default (`["project"]`) or narrower.
7. Add `.env` and your runs folder to `.gitignore`.

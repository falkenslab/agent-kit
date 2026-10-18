# claude.ai connectors and remote data, chosen by the agent

Issue: [#70](https://github.com/falkenslab/agent-kit/issues/70)

## Goal

An agent can let in chosen claude.ai connectors of the person's account (none by default), and can keep data it marks as sensitive (students') from reaching remote MCP servers, or warn when it might.

## Context

- Split from #61, which makes installed extensions' remote servers work; its note's Findings hold what's confirmed about connectors (SDK 0.3.300, CLI 2.1.300).
- The kit keeps connectors out (`disableClaudeAiConnectors: true`, `src/core/session.ts`). With it false they appear as `claude.ai <Name>` (type `claudeai-proxy`). `settings.deniedMcpServers` by `serverName` removes one; `allowedMcpServers` lets one in only by `serverUrl`, and once any `serverUrl` entry exists it also drops every remote server passed by the SDK that isn't listed (in-process `sdk` servers are exempt).
- Unknown: whether each connector has a URL of its own (only one connector was on the account tested), and whether plugin servers fall under the allowlist too.
- What the model sends to a remote server leaves the computer; moodle-teacher's pseudonymization protects what comes from Moodle, not what the model copies elsewhere. miyagi handles students' data.

## Changes

- Research first, confirmed empirically: an account with several connectors (their URLs, whether one can be let in alone), and plugin servers under `allowedMcpServers`.
- A config for the connectors an agent accepts (by name, mapped to what the SDK takes), none by default; the allowlist then lists the agent's own remote servers too, so nothing else drops. Shown in `/extensions` apart from installed extensions, and in `about_me`.
- A guard for sensitive data: the agent marks remote servers as not for it (deny or warn); the exact shape (a mode, a prompt rule, a gate on tool calls to remote servers) comes from the research and from miyagi's needs.
- Docs (English and Spanish), `sdk-behaviors.md`, ADR-025.

## Acceptance

- Without the agent's opt-in, no connector reaches a session; with one named, only that one does, and the agent's remote extension servers still connect.
- A session marked for sensitive data refuses, or warns before, a call to a remote server, as configured.
- `verify` passes.

---
sidebar_position: 4
title: Permissions and isolation
description: How tool calls are approved, and how the kit keeps the runner's own Claude Code configuration away from the agent.
---

# Permissions and isolation

## How a tool call is approved

In order:

1. **`disallowedTools`**: if the tool is there, it's denied. Nothing else is consulted.
2. **`allowedTools`**: the built-in tools the kit granted are pre-approved.
3. **`canUseTool`**: anything else. The kit's `allowAnyMcpTool` approves any `mcp__<server>__<tool>` and denies the rest.
4. **`PreToolUse` hooks**: run for every call that got this far, and can still deny it (file scope, gates, step gate).

`allowAnyMcpTool` exists because an `allowedTools` entry like `mcp__*` doesn't match `mcp__<server>__<tool>` in the SDK, and servers declared in a workspace's `.mcp.json` aren't known in advance. Dropping a `.mcp.json` in a workspace is the owner's opt-in, the same trust as adding a skill to `.claude/skills/`. It also silences the SDK's `CLAUDE_SDK_CAN_USE_TOOL_SHADOWED` warning, which is expected with this setup.

## Keeping the runner's configuration out

The SDK runs the Claude Code CLI, which by default loads the configuration of whoever runs it. An agent built on the kit shouldn't behave differently depending on the person running it, so the kit narrows what's loaded:

| Option | Kit's value | Without it |
| --- | --- | --- |
| `settingSources` | `["project"]` | The runner's `~/.claude/settings.json` (its `language`, output style, hooks, permissions), personal `CLAUDE.md` and skills reach the agent. A `"language": "Spanish"` there made a French agent answer in Spanish. |
| `settings.autoMemoryEnabled` | `false` | The runner's Claude Code memory for the repository (`~/.claude/projects/<repo>/memory/MEMORY.md`) is loaded whatever `settingSources` says. |
| `settings.includeGitInstructions` | `false` | The CLI's commit instructions and git context, including the runner's git user name, which pulled replies into the runner's language. |
| `settings.disableClaudeAiConnectors` | `true` | The claude.ai connectors of the account the session runs with (Drive, Gmail, documents…), which the CLI loads whatever `settingSources` says: their tools would read and write the runner's own data, and cost context on every call. An MCP server the agent passes itself is unaffected. |

### Choosing setting sources

```ts
settingSources: ["project"], // default: the workspace's .claude/ and CLAUDE.md files
settingSources: [], // nothing from disk at all, CLAUDE.md included
settingSources: ["project", "local"], // plus .claude/settings.local.json
settingSources: ["user", "project"], // the runner's personal configuration too (opt in knowingly)
```

- `"project"` loads `<projectDir>/.claude/settings.json`, its skills and commands, and the `CLAUDE.md` files found from `projectDir` up the directory tree.
- `[]` is the most isolated: use it when the agent's plugin brings everything it needs. It also saves context (the CLAUDE.md files of parent folders are no longer sent).

### What can't be turned off

The CLI adds the logged-in Claude Code account's name and e-mail (from `~/.claude.json`) to the context. Only a separate `CLAUDE_CONFIG_DIR` avoids it, which also moves the login. It mostly matters for the reply language: see [Languages](../sessions/languages.md#limits).

## Environment variables

The CLI subprocess inherits your process's environment. Set variables your tools need in the environment, not in prompts. To give the subprocess a different environment, pass `env` in the options:

```ts
const session: Options = { ...options, env: { ...process.env, HTTPS_PROXY: "http://proxy:8080" } };
```

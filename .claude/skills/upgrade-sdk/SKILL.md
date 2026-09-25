---
name: upgrade-sdk
description: Upgrade @anthropic-ai/claude-agent-sdk in agent-kit and re-validate the SDK behaviors the kit depends on. Use when the user asks to bump the SDK, or when investigating a behavior change after an SDK update.
---

# Upgrading the Claude Agent SDK

The kit encodes many SDK behaviors that were confirmed empirically and are not always documented (they are called out as "confirmed empirically" in source comments and `CLAUDE.md`). A new SDK version can silently change any of them, so an upgrade is more than `npm update`.

## 1. Upgrade

```
npm outdated @anthropic-ai/claude-agent-sdk
npm install @anthropic-ai/claude-agent-sdk@<version>
```

The SDK is a direct `dependency` of the kit and its types are re-exported from `src/index.ts`. Read the SDK's changelog/release notes if reachable, and diff the typings: compare `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` before and after (keep a copy of the old one first) for changes to `Options`, `SDKMessage` variants, `AgentDefinition`, hooks and `canUseTool`.

## 2. Run the gate

Run the `verify` skill, then `check-consumers`. Type errors here are usually the first sign of a changed contract.

## 3. Re-validate the behaviors the kit relies on

Check each against the new typings and, where possible, by running a small script. Do not claim one still holds without evidence.

- `disallowedTools` takes precedence over `canUseTool`; a disallowed tool never reaches the callback.
- Bare `tools`/`allowedTools` entries are auto-approved before `canUseTool` runs, and the `CLAUDE_SDK_CAN_USE_TOOL_SHADOWED` warning is still emitted with that code (`src/core/mcpPermissions.ts` patches `process.emitWarning` to suppress exactly it).
- `mcp__*` is not a valid `allowedTools` wildcard for `mcp__<server>__<tool>`; `allowAnyMcpTool` is still needed.
- `skills: "all"` loads the skills, but with an explicit `tools` list the `Skill` tool is only offered if it is listed (`buildSessionOptions()` adds it whenever skills/plugins load; confirmed empirically in v0.3.0); plugin skills are discovered from `plugins: [{ type: "local", ... }]` with a `.claude-plugin/plugin.json` manifest, and plugin commands are namespaced `/<plugin>:<command>`.
- A subagent's declared `tools` must already be present in the session's `tools`; the built-in `general-purpose` subagent is still spawnable and inherits everything (the three subagent hooks depend on this); `AgentDefinition.background: false` does not change the Agent tool's default background execution, only rewriting `run_in_background` in a hook does.
- Turn results: `subtype: "success"` can still carry `is_error: true`; `runQuery()` must keep using `is_error` for `failed`.
- Message types: `system`/`init`, `system`/`informational`, `system`/`local_command_output`, `stream_event` deltas, and `supportedCommands()` (used to flag unknown slash commands in `runChatTui()`).
- `PreToolUse` hook input carries `agent_id` only for subagent calls (`subagentBashGate.ts`).

If a behavior changed, adapt the code and its comment (update the "confirmed empirically" note with the version it was re-confirmed on, or remove it if no longer true), and add a test when it can be tested without a live model.

## 4. Record it

Commit with the `commit` skill (`build(deps): ...` for a plain bump, `fix`/`refactor` for code that had to adapt). If behavior visible to consumers changed, treat it as a breaking change and mention it in the next release notes.

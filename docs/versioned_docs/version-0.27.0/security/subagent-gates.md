---
sidebar_position: 3
title: Subagent gates
description: The three hooks that keep delegation safe - type, Bash and foreground - and the SDK behaviors behind them.
---

# Subagent gates

When a spec declares subagents, the session gets the `Agent` tool, `Bash` when a subagent lists it (or has no `tools`, and so inherits every session tool), and three `PreToolUse` hooks. They work together: remove one and another can be routed around.

## Type gate

**Only the subagent types you declared can be spawned.**

The SDK has a built-in `general-purpose` subagent type that can be spawned whatever your `agents` map says, and it inherits **every** tool of the session, Bash included, instead of the narrow list your subagents declare. Without this gate a model could delegate to it to get at Bash. It happened in a real agent: the model delegated a file deletion to a spontaneous `general-purpose` agent.

The gate denies any `Agent` call whose `subagent_type` isn't in `allowedSubagentTypes`:

> Delegation is only available for "joke-finder"/"joke-critic" in this session, not "general-purpose" - do the task directly with your own tools instead of spawning another agent for it.

## Bash gate

**Bash is for subagents only.**

The SDK refuses to spawn a subagent whose declared tools aren't all in the session's tools, so `Bash` must be in the session for a subagent to use it; the kit adds it only then. Once there, the main agent could use it directly, and built-in tools bypass `canUseTool`. The gate denies `Bash` when the call comes from the main thread: the hook input carries `agent_id` only for calls made inside a subagent.

> Bash is only available to dedicated subagents, not the main agent directly — use the Agent tool to delegate to one of them instead.

This only holds with the type gate: inside a `general-purpose` subagent `agent_id` is set too.

## Foreground gate

**Subagents always run in the foreground.**

The `Agent` tool runs subagents in the background by default. A background subagent's work arrives as task messages the chat doesn't wait for: the turn ends before the subagent does anything, and its result is silently lost. Setting `background: false` in the definition doesn't change it. The gate rewrites the call's input to `run_in_background: false` for every allowed subagent, before it runs.

## Using them yourself

The three hooks are exported for a session assembled by hand:

```ts
import { createSubagentBashGate, createSubagentForegroundGate, createSubagentTypeGate } from "@falkenslab/agent-kit";

const allowed = ["joke-finder", "joke-critic"];

hooks: {
  PreToolUse: [
    { hooks: [createSubagentTypeGate(allowed)] },
    { hooks: [createSubagentBashGate()] },
    { hooks: [createSubagentForegroundGate(allowed)] },
  ],
},
```

Register all three together.

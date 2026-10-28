---
sidebar_position: 2
title: Step gate
description: The interactive mode's PreToolUse hook that asks before every tool call.
---

# Step gate

The step gate is a `PreToolUse` hook that stops every tool call (the main agent's and its subagents') until a person answers. It's what `interactive` mode means. Tools that ask the person themselves (`ask_human`, `present_plan`, the approval and manual-intervention tools, `request_file`, `retire_source`) and the task list (`TodoWrite`) go through without asking first.

## When it's active

`buildSessionOptions()` registers it in `guided` and `interactive` sessions and checks the current mode on each call: while the mode is `interactive` it asks, otherwise it gives no decision and the call proceeds as if it weren't there. That's what lets a guided session switch to interactive and back ([Modes](../core-concepts/modes.md#switching-modes-during-a-session)). An `autonomous` session doesn't have it.

## What it asks

A decision checkpoint titled **Proposed action**, saying the call as the chat does, in the person's language (the extensions' labels, the kit's for its own tools), then the tool's name and its parameters in one line, cut short at 300 characters:

```text
Proposed action
Fetching https://example.com/news
Tool: WebFetch
Parameters: {"url":"https://example.com/news","prompt":"Summarize the headlines"}
```

The person approving needn't read JSON: in an agent for teachers, "Reading the page overview" says what `mcp__knowledge__knowledge_read` with `{"page":"overview"}` does.

## What each answer does

| Answer | Values | Effect |
| --- | --- | --- |
| Yes | `y`, `yes`, Enter (`""`) | The call proceeds. |
| No | `n`, anything else | The call is denied. The model is told "Action rejected by the user in step-by-step mode." and decides what to do next. |
| Stop | `q` | The call is denied and the turn stops (`continue: false`): "Execution stopped manually by the user." |

The texts for the model are always in English, whatever the [kit's language](../sessions/languages.md); the panel is in the kit's language.

## Using it in your own hook chain

`createStepGate(runDir, isActive?)` is exported to build the same hook yourself, for instance in a session you assemble by hand:

```ts
import { createStepGate } from "@falkenslab/agent-kit";

const stepGate = createStepGate(runDir, () => supervised); // asks only while `supervised` is true

const options: Options = {
  // …
  hooks: { PreToolUse: [{ hooks: [stepGate] }] },
};
```

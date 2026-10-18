---
sidebar_position: 3
title: Approvals
description: The guided mode's request_human_approval tool, and how to word it for your domain.
---

# Approvals

In `guided` (and `interactive`) mode the agent has a tool, `mcp__approvals__request_human_approval`, to ask a person before doing something visible to others or hard to undo. It takes one parameter:

| Parameter | Type | Description |
| --- | --- | --- |
| `summary` | string | Brief summary of what the agent is about to submit or publish. |

The person sees a decision checkpoint titled **Human confirmation required before publishing**, with the summary. The tool returns one of two texts to the model:

- approved (`y`, `yes` or Enter): "Approved by the human. You may continue.";
- anything else: "Rejected by the human. Don't proceed with that; ask what to do differently."

## Wording it for your domain

The tool's description is the only thing that tells the model when to call it. The default is generic: "right before an action that publishes something visible to others and is hard to naturally undo… not for browsing, not for reading, not before every intermediate step". Replace it with what publishing means for your agent:

```ts
const spec: AgentSpec<Config> = {
  // …
  humanApprovalTexts: {
    description:
      "Ask the teacher right before anything students will see or that changes grades: " +
      "posting in a forum, publishing a page or an activity, saving or releasing a grade. " +
      "Not for navigating, reading or drafting.",
    approved: "The teacher approved it. Go ahead and publish it exactly as summarized.",
    rejected: "The teacher rejected it. Don't publish it. Ask what they want changed.",
  },
};
```

`DEFAULT_HUMAN_APPROVAL_TEXTS` is exported if you only want to change one of them:

```ts
humanApprovalTexts: { ...DEFAULT_HUMAN_APPROVAL_TEXTS, description: myDescription },
```

## Guided mode is cooperative

The model decides when to call the tool. It works well for "ask before posting", with a clear description and a prompt that reinforces it, but it isn't a hard boundary: a model can skip it. For an action that must never happen without a person:

- ask from the tool that does it, with [`askForDecision()`](overview.md#asking-from-your-own-code);
- or deny it in a [`PreToolUse` hook](../advanced/hooks.md) unless approved;
- or run in `interactive` mode, where every call is gated.

## Building it yourself

`createHumanApprovalServer(runDir, texts?)` is exported, for a session assembled without `buildSessionOptions()`:

```ts
import { createHumanApprovalServer } from "@falkenslab/agent-kit";

mcpServers: { approvals: createHumanApprovalServer(runDir, myTexts) },
```

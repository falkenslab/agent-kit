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

- if it's an installed extension's tool, the kit already asks: see [below](#extensions-tools-that-change-things);
- ask from the tool that does it, with [`askForDecision()`](overview.md#asking-from-your-own-code);
- or deny it in a [`PreToolUse` hook](../advanced/hooks.md) unless approved;
- or run in `interactive` mode, where every call is gated.

## Extensions' tools that change things

In guided mode, an installed extension's tool that isn't known to only read waits for the person's yes, whatever the model did before: the kit asks, not the model. Read-only tools are the same as [plan mode's](../extensions/writing.md#read-only-tools): the manifest's `readOnlyTools`, else the tools its server marks `readOnlyHint`. The question is a choice panel titled **Let `<extension>` do this?**, with the tool's label in the session's language and its parameters (in one line, cut short, when the tool has a label; the panel never grows past the screen, so its answers stay in view), for the main agent's calls and its subagents'. Its answers:

- **Yes**: this call.
- **Yes, for this session**: that tool doesn't ask again until the session ends.
- **Yes, always**: kept in the extension's lock, so it doesn't ask in later sessions either.

A tool that always asks (below) is offered only **Yes**, **No** and **No, never**: "this session" and "always" would approve calls nobody has seen.
- **No**: the call is denied, and the model is told not to retry it without asking. An answer typed in the panel is a no too, passed on to the model as the person's words.
- **No, never**: denied, and kept: in later sessions the tool isn't in the session at all (`disallowedTools`).

**An approved batch.** Right after `request_human_approval` is approved, the calls that follow go on without asking until the person's next message or the next approval request, so one approval covers a batch of work: "publish these ten grades" is one question, not eleven.

**Tools that always ask**, on every call and even inside an approved batch: the manifest's [`confirmTools`](../extensions/writing.md#tools-that-always-ask) and the agent's own list ([`extensionGate`](../core-concepts/agent-spec.md#extensiongate)), else the tools its server marks `destructiveHint`. What creates, edits or publishes in the person's account belongs there.

**One question, not two.** A tool whose server asks the person itself (MCP elicitation), listed in the manifest's [`serverConfirmTools`](../extensions/writing.md#tools-whose-server-asks-itself), isn't asked about by the kit too: the server's question is the one the person answers.

**The person's word lasts.** `/extensions config <name>` (and `extension config <name>` in the terminal) lists what's kept for an extension; `confirm=reset` forgets the answers, `confirm=off` lets its tools run without asking (an extension the person trusts), `confirm=on` asks again. The model can't change any of it. Every answer goes to the [transcript](../security/transcript.md).

The other modes keep their own gates: in `interactive` the step gate already asks before every call, and `plan` denies what isn't read-only. In `autonomous`, where no one can be asked, those tools are denied unless the agent says they run (`extensionGate.autonomous`). A remote server's call with [`remoteServers: "ask"`](../core-concepts/session-config.md) asks about where it goes, reads included; this gate is about what changes things, in any server.

## Building it yourself

`createHumanApprovalServer(runDir, texts?)` is exported, for a session assembled without `buildSessionOptions()`:

```ts
import { createHumanApprovalServer } from "@falkenslab/agent-kit";

mcpServers: { approvals: createHumanApprovalServer(runDir, myTexts) },
```

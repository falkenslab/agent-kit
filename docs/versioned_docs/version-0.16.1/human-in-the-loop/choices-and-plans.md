---
sidebar_position: 4
title: Choices and plans
description: ask_human for a choice between options, and present_plan to leave plan mode with the person's approval.
---

# Choices and plans

Two tools let the agent ask the person something in a panel and get the answer within the same turn, instead of ending its turn with a written question. Both are in the `approvals` server, so they exist in every mode but `autonomous`, and plan mode lets them through.

## `ask_human`: a choice between options

```text
ask_human({
  question: "How long should topic 3 take?",
  options: ["One session", "Two sessions", "Two sessions and a lab"],
  multiple: false,
})
```

| Parameter | Type | Description |
| --- | --- | --- |
| `question` | `string` | The question, in the person's language. |
| `options` | `string[]` | 2 to 8 short options. The panel adds a last one, "Other", to type an answer of one's own. |
| `multiple` | `boolean` | Whether several can be picked (default: one). |

The model gets back what the person chose ("The person chose: Two sessions."), their own words if they typed them, or that they didn't answer. In the Ink chat:

```text
╭──────────────────────────────────────────────────────────╮
│ The agent asks                                           │
│ How long should topic 3 take?                            │
│                                                          │
│ ❯ 1. One session                                         │
│   2. Two sessions                                        │
│   3. Two sessions and a lab                              │
│   Other (type your own answer)                           │
│ ↑/↓ choose · Enter to send                               │
╰──────────────────────────────────────────────────────────╯
```

With `multiple`, Space marks options and Enter sends. Picking "Other" turns the panel into a text field. In the plain chat, the options are printed numbered and the answer is the numbers (`1,3`) or one's own words. The [response file](response-file.md) takes the same answer.

Use it when the agent needs a decision to go on: which approach, which of several items, how much. A line in the system prompt helps: "when you need the user to choose, use ask_human rather than asking in your reply".

## `present_plan`: leaving plan mode with approval

In [plan mode](../core-concepts/modes.md#plan) the agent can only read and plan. When the plan is ready, `present_plan` shows it, rendered as markdown, with three options:

| Option | What happens |
| --- | --- |
| Run it | Plan mode ends, back to the mode the session was in before (as `/plan` does), the status bar shows it, and the agent carries the plan out right away, in the same turn. |
| Keep planning | The person can say what should change; the mode stays, and the agent revises the plan and presents it again. |
| Cancel | The mode stays, and the agent stops and asks what they want instead. |

```text
present_plan({ plan: "## Plan\n\n1. Read the syllabus\n2. Draft the three sessions\n3. …" })
```

Outside plan mode it's refused ("you aren't in it, so just go ahead"), and a session that can't be in plan mode (autonomous) doesn't have it. Shift+Tab and `/plan` still work: `present_plan` is the guided way out, so the person doesn't need to know them.

This is the kit's own exit from plan mode: the SDK's `ExitPlanMode` isn't used (see ADR-023 in the repository).

## When the step gate is on

In `interactive` mode the [step gate](step-gate.md) asks before every tool call, except the ones that ask the person themselves: `ask_human`, `present_plan`, the approval and manual-intervention tools, `request_file` and `retire_source`, and the task list (`TodoWrite`). Asking to ask would be noise.

## Asking from your own code

`askForChoice(runDir, prompt, options, multiple?)` asks the same way from your own tools, racing the interaction port and the response file, and resolves with `{ chosen, other? }`:

```ts
import { askForChoice } from "@falkenslab/agent-kit";

const { chosen, other } = await askForChoice(runDir, { title: "Export", lines: ["Which format?"] }, ["PDF", "Word", "Markdown"]);
```

`askForText(runDir, prompt)` asks for free text (the case is kept), as `request_file` does for a path. Hosts with their own interface implement the optional `askChoice` and `askText` of the [interaction port](interaction-port.md); without them, the kit asks through `askDecision`.

# Interactive mode asks with the tool's internal name and raw JSON, not its label

Issue: [#88](https://github.com/falkenslab/agent-kit/issues/88)

## Problem

- In `interactive` mode the step gate asks before every tool with `Herramienta: mcp__knowledge__knowledge_read` and `Parámetros: { "page": "overview" }`. The person approving isn't a developer (in miyagi, a teacher): they can't tell what the call does or whether it's safe.
- The rest of the chat already says the same call as "Leyendo la página overview" (the tool labels, `formatAction`): the approval is the one place where it's unreadable, and the one where it matters most.

## Cause

`src/core/hooks/stepGate.ts` builds its panel from `t().toolLine(pre.tool_name)` and the input as indented JSON; it doesn't receive the session's labels (the kit's, the extensions', the agent's `formatAction`).

## Solution

- The step gate gets the session's tool labels, as the guided gate does (#74, #84): the panel's first line is the call as the chat labels it, in the person's language.
- With a label, the raw name and the parameters follow summed up in one line, cut short (as #84 does); without one, as now.
- The same in the terminal chats and for a view with `panels: "state"` (the prompt's lines are the same).
- Docs (English and Spanish): the step gate (human in the loop), Modes.

## Verification

- A test: a labelled tool's step-gate panel starts with its label and gives its parameters in one line; an unlabelled one keeps the JSON.
- `verify` passes.

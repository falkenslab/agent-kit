# ADR-023: Plan mode is the kit's own gate, not the SDK's plan mode

## Decision

"plan" is a fourth `Mode`, switchable with guided and interactive. While it's on, a `PreToolUse` hook (`hooks/planGate.ts`) lets through only what reads, searches, loads a skill, delegates or asks a human, `Write`/`Edit` to the plan files the agent declares, and the MCP tools the agent declares read-only; it denies everything else. The SDK's `permissionMode: "plan"` isn't used. The model learns about a switch from a note the kit puts before the next user message (`ModeControl.takeNotice()`).

## Motivation

- Agents need a "think before building" phase in which nothing changes (teacher-agent's, now miyagi's, activity plan); no other mode keeps an agent from acting.
- The SDK's plan mode has the model call `ExitPlanMode`, which isn't among the kit's explicit tools, and can't let one plan file be written. A hook is where the kit's other guardrails live, applies to subagents' calls too, and its denial can't be talked around.
- Unknown MCP tools are denied, not allowed: a tool the agent forgot to classify can't change anything in plan mode.
- The system prompt stays as built (ADR-016), so the switch has to reach the model in the conversation; the deny reason alone would only tell it after a failed attempt, and nothing would tell it that it may act again.

## Consequences

- The plan gate is registered with the step gate (outside autonomous) and gives no decision outside plan mode: a session that never enters it behaves as before.
- `AgentSpec.planMode` (`isPlanFile`, `isReadOnlyTool`) is the domain's part. Without it, the plan goes in the reply and no MCP tool of the agent runs in plan mode.
- The note is tagged `<system-reminder>` and in English; a resumed conversation strips it from the human's words (`runs.ts`). A host with its own queue prepends `takeNotice()` itself.
- A session can start in plan mode; the first message carries the note.
- The kit's own way out is `present_plan` (in the approvals server, refused outside plan mode): the person runs the plan (the mode goes back as with `/plan`, and the agent carries it out in the same turn), keeps planning or cancels.
- Besides Shift+Tab, both chats take `/plan` (a local command: it never reaches the model, so it doesn't clash with a skill unless one is named `plan`), which goes into plan mode and back to the mode before it (`togglePlanMode()`, exported for hosts).

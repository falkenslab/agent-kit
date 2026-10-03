---
sidebar_position: 4
title: Modes
description: autonomous, guided, interactive and plan; what each changes, and switching modes during a session.
---

# Modes

The mode is how much a person is in the loop. It's the only thing `buildSessionOptions()` needs to decide which human-in-the-loop tools and hooks a session gets.

| Mode | The agent… | Tools and hooks the kit adds |
| --- | --- | --- |
| `autonomous` | acts on its own; nobody is asked anything | none: no approval tool, no step gate, no manual intervention |
| `guided` | explores freely, but asks before anything visible to others or hard to undo | `request_human_approval`; `request_manual_login` if the spec sets `manualInterventionTexts`; the step gate, registered but inactive |
| `interactive` | asks before **every** tool call | the same as guided, with the step gate active |
| `plan` | only reads and plans; nothing is changed until the person leaves the mode | the same as guided, with the plan gate active |

## autonomous

For jobs nobody watches: scheduled runs, batch processing, agents whose tools can't do harm. The agent has no channel to ask a person at all, by design.

```ts
const config: BaseSessionConfig = { mode: "autonomous", projectDir };
```

## guided

The agent gets a `request_human_approval` tool whose description tells it to call it right before publishing something visible or hard to undo, with a summary of what it's about to do. The person answers **Yes**, **No** or **Stop** in a panel (or at the prompt, or through the [response file](../human-in-the-loop/response-file.md)); the tool returns the approved or rejected text to the model.

Write the tool's texts for your domain with [`humanApprovalTexts`](agent-spec.md#humanapprovaltexts): what "publishing" means for a Moodle agent is not what it means for a Git agent.

:::warning A prompt-level guardrail
Guided mode relies on the model calling the tool at the right moment. It's the right trade-off for "don't post without asking", not a hard boundary. For hard boundaries, use `disallowedTools`, the file scope or your own [hooks](../advanced/hooks.md).
:::

## interactive

Every tool call stops at the step gate, a `PreToolUse` hook that shows the tool and its parameters and waits for an answer:

- **Yes** (`y`, Enter): the call goes on.
- **No** (`n`): the call is denied; the model is told the person rejected it and can try something else.
- **Stop** (`q`): the call is denied and the turn ends (`continue: false`).

Useful to watch a new agent work, step by step, or to run it where every action matters.

## plan

Think before building: the agent reads, researches and presents a plan, and nothing changes until the person switches out of plan mode (Shift+Tab in the chat) and the agent carries the plan out. The plan gate, a `PreToolUse` hook active only in this mode, decides every tool call, the subagents' included:

- **Goes through:** `Read`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `Skill`, `Agent`, `TodoWrite`, the approval and manual-intervention tools, the date and time tools, `list_sources`, and the MCP tools the agent declares read-only.
- **Writes:** `Write`/`Edit` only to the agent's plan files, if it declares any. Without them the agent presents the plan in its reply.
- **Denied:** everything else: other writes, `Bash`, the tools that add to or retire from the sources folder, and every MCP tool the agent doesn't vouch for, so a forgotten tool can't change anything. The denial tells the model it's in plan mode and that the person leaves it when they want the plan carried out.

The agent declares both in [`planMode`](agent-spec.md#planmode):

```ts
planMode: {
  // The plan of each activity, in drafts/<slug>/plan.md (it must also be writable: knowledgeDir or extraWritableDirs).
  isPlanFile: (filePath, config) => path.basename(filePath) === "plan.md" && path.dirname(path.dirname(filePath)) === config.draftsDir,
  // The browser tools that only look.
  isReadOnlyTool: (toolName) => ["mcp__playwright__browser_snapshot", "mcp__playwright__browser_take_screenshot"].includes(toolName),
},
```

The system prompt doesn't change with the mode, so the kit tells the model about the switch: the next message after entering or leaving plan mode starts with a short note saying so. `createInputQueue({ modeControl })` adds it (the chats do); a host with its own queue prepends `modeControl.takeNotice?.()` itself. A resumed conversation doesn't show the note as the person's words.

A session can also start in plan mode (`mode: "plan"`), and then switches like a guided one.

:::info Why not the SDK's plan mode
The SDK has its own `permissionMode: "plan"`, but it has the model call an `ExitPlanMode` tool that isn't among the kit's tools, and it can't let one plan file be written. The kit's plan gate is a hook like the other guardrails: its denial can't be talked around.
:::

## Switching modes during a session

A session started `guided`, `interactive` or `plan` can switch among the three while it runs: they have the same tools, and the step gate and the plan gate are registered in all of them, each active only in its own mode. An `autonomous` session can't switch: it has no approval tool, and a tool can't appear in the middle of a session.

`buildSessionOptions()` returns the session's `ModeControl`:

```ts
const { options, modeControl } = await buildSessionOptions(config, runDir, spec);

modeControl.mode; // "guided"
modeControl.switchable; // ["guided", "interactive", "plan"]
modeControl.set("interactive"); // true: the step gate asks from the next tool call on
modeControl.set("autonomous"); // false: not allowed
```

In the Ink chat, **Shift+Tab** cycles through `modeControl.switchable` and the status bar shows the mode. With a session opener (`runChatInk((run) => buildSessionOptions(...))`), the chat picks up the mode control from the opener's result; with fixed options, pass it as the `modeControl` option.

```ts
await runChatInk(options, { mode: config.mode, modeControl });
```

Both chats also take **`/plan`**: it switches into plan mode, and typed again goes back to the mode the session was in before (guided, if it started in plan mode). In an autonomous session it only says the mode can't be switched. A host with its own interface does the same with `togglePlanMode(modeControl)`, which returns the new mode, or `null` when plan mode isn't reachable:

```ts
import { togglePlanMode } from "@falkenslab/agent-kit";

togglePlanMode(modeControl); // "plan"
togglePlanMode(modeControl); // back to "interactive", if that's where it was
```

The system prompt keeps the mode it was built with: if your prompt says different things per mode, keep that difference about behavior the tools already enforce. Only a switch into or out of plan mode is told to the model (see [plan](#plan)).

## Choosing a mode at startup

A common pattern is an environment variable or a command line flag:

```ts
const modes: Mode[] = ["autonomous", "guided", "interactive", "plan"];
const mode = modes.find((m) => m === process.env.MY_AGENT_MODE) ?? "guided";
```

Or a question in the [wizard](../terminal-ui/wizard.md):

```ts
const { mode } = await runWizard([
  {
    type: "select",
    name: "mode",
    message: "How closely do you want to supervise?",
    choices: [
      { name: "Guided: ask before publishing", value: "guided" },
      { name: "Step by step: ask before every action", value: "interactive" },
      { name: "Plan: only read and plan first", value: "plan" },
      { name: "Autonomous: don't ask", value: "autonomous" },
    ],
    default: "guided",
  },
]);
```

---
sidebar_position: 4
title: Modes
description: autonomous, guided and interactive; what each changes, and switching modes during a session.
---

# Modes

The mode is how much a person is in the loop. It's the only thing `buildSessionOptions()` needs to decide which human-in-the-loop tools and hooks a session gets.

| Mode | The agent… | Tools and hooks the kit adds |
| --- | --- | --- |
| `autonomous` | acts on its own; nobody is asked anything | none: no approval tool, no step gate, no manual intervention |
| `guided` | explores freely, but asks before anything visible to others or hard to undo | `request_human_approval`; `request_manual_login` if the spec sets `manualInterventionTexts`; the step gate, registered but inactive |
| `interactive` | asks before **every** tool call | the same as guided, with the step gate active |

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

## Switching modes during a session

A session started `guided` or `interactive` can switch between the two while it runs: they have the same tools, and the step gate is registered in both, active only in `interactive`. An `autonomous` session can't switch: it has no approval tool, and a tool can't appear in the middle of a session.

`buildSessionOptions()` returns the session's `ModeControl`:

```ts
const { options, modeControl } = await buildSessionOptions(config, runDir, spec);

modeControl.mode; // "guided"
modeControl.switchable; // ["guided", "interactive"]
modeControl.set("interactive"); // true: the step gate asks from the next tool call on
modeControl.set("autonomous"); // false: not allowed
```

In the Ink chat, **Shift+Tab** cycles through `modeControl.switchable` and the status bar shows the mode. With a session opener (`runChatInk((run) => buildSessionOptions(...))`), the chat picks up the mode control from the opener's result; with fixed options, pass it as the `modeControl` option.

```ts
await runChatInk(options, { mode: config.mode, modeControl });
```

The system prompt keeps the mode it was built with: if your prompt says different things per mode, keep that difference about behavior the tools already enforce.

## Choosing a mode at startup

A common pattern is an environment variable or a command line flag:

```ts
const modes: Mode[] = ["autonomous", "guided", "interactive"];
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
      { name: "Autonomous: don't ask", value: "autonomous" },
    ],
    default: "guided",
  },
]);
```

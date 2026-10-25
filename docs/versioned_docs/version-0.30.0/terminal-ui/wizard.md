---
sidebar_position: 4
title: Wizard
description: runWizard() - ask questions before the agent starts, in Ink or plain prompts.
---

# Wizard

`runWizard(steps, options?)` asks a list of questions and resolves with every answer by step name: the setup an agent needs before it starts (a workspace, a mode, credentials). On a TTY it's an Ink form; without one (or with `plain: true`) the same questions with [`@inquirer/prompts`](https://www.npmjs.com/package/@inquirer/prompts).

```ts
import { runWizard, isExitPromptError } from "@falkenslab/agent-kit";

try {
  const answers = await runWizard(
    [
      { type: "input", name: "course", message: "Course URL", validate: (v) => (v.startsWith("https://") ? true : "Use an https:// URL") },
      { type: "input", name: "user", message: "Username" },
      { type: "password", name: "password", message: "Password" },
      {
        type: "select",
        name: "mode",
        message: "How closely do you want to supervise?",
        choices: [
          { name: "Guided", value: "guided" },
          { name: "Step by step", value: "interactive" },
          { name: "Autonomous", value: "autonomous" },
        ],
        default: "guided",
      },
      {
        type: "confirm",
        name: "remember",
        message: (answers) => `Remember these settings for ${answers.course}?`,
        default: true,
      },
    ],
    { title: "Course assistant setup" },
  );
  console.log(answers.mode); // "guided"
} catch (error) {
  if (isExitPromptError(error)) process.exit(0); // Ctrl+C
  throw error;
}
```

## Steps

Every step has `name` (the answer's key), `message`, and optionally `when(answers)` to skip it. `message`, `choices` and `default` can be values or functions of the answers given so far.

| Type | Fields | Answer |
| --- | --- | --- |
| `input` | `default?`, `validate?(value, answers)` returning `true` or an error message | `string` |
| `password` | `validate?` | `string` (masked while typed) |
| `select` | `choices: { name, value }[]`, `default?` (a value) | the chosen `value` |
| `confirm` | `default?` (`true` if omitted) | `boolean` |

```ts
{
  type: "input",
  name: "proxy",
  message: "Proxy URL",
  when: (answers) => answers.network === "corporate",
}
```

## Options

| Option | Description |
| --- | --- |
| `title` | Printed above the first question. |
| `plain` | Plain prompts even on a TTY. |
| `theme`, `language` | See [Themes](themes.md) and [Languages](../sessions/languages.md). The focused option of a `select` uses the theme's `selection` color. |

Answered questions stay on screen as `✔ <message> <answer>`, passwords masked. Ctrl+C rejects with an error named `ExitPromptError`, in both variants, so `isExitPromptError()` covers both.

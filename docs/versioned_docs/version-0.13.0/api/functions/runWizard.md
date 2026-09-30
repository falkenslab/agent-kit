# Function: runWizard()

```ts
function runWizard(steps, options?): Promise<WizardAnswers>;
```

Defined in: [tui/ink/wizard.tsx:250](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L250)

Asks `steps` in order and resolves with every answer by step name. A step's message,
choices or default can depend on earlier answers, and `when` skips it, so a consumer's
whole interactive menu becomes a list of step definitions.

Ctrl+C rejects with an error named "ExitPromptError", like @inquirer/prompts, so
`isExitPromptError()` keeps working. Without a TTY (or with `plain`) it asks the same
steps through @inquirer/prompts.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `steps` | [`WizardStep`](../type-aliases/WizardStep.md)[] |
| `options` | [`WizardOptions`](../interfaces/WizardOptions.md) |

## Returns

`Promise`\<[`WizardAnswers`](../type-aliases/WizardAnswers.md)\>

# Interface: SelectStep\<T\>

Defined in: [tui/ink/wizard.tsx:29](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L29)

A choice among `choices`; the answer is the chosen `value`.

## Extends

- `BaseStep`

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-choices"></a> `choices` | `FromAnswers`\<`object`[]\> | - | - | [tui/ink/wizard.tsx:31](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L31) |
| <a id="property-default"></a> `default?` | `FromAnswers`\<`T`\> | Preselects the choice with this value. | - | [tui/ink/wizard.tsx:33](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L33) |
| <a id="property-message"></a> `message` | `FromAnswers`\<`string`\> | - | `BaseStep.message` | [tui/ink/wizard.tsx:23](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L23) |
| <a id="property-name"></a> `name` | `string` | Key of this step's answer in the result. | `BaseStep.name` | [tui/ink/wizard.tsx:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L22) |
| <a id="property-type"></a> `type` | `"select"` | - | - | [tui/ink/wizard.tsx:30](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L30) |
| <a id="property-when"></a> `when?` | (`answers`) => `boolean` | Skips the step (leaving no answer) when it returns false. | `BaseStep.when` | [tui/ink/wizard.tsx:25](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L25) |

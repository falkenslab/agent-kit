# Interface: InputStep

Defined in: [tui/ink/wizard.tsx:37](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L37)

A line of text.

## Extends

- `BaseStep`

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-default"></a> `default?` | `FromAnswers`\<`string`\> | - | - | [tui/ink/wizard.tsx:39](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L39) |
| <a id="property-message"></a> `message` | `FromAnswers`\<`string`\> | - | `BaseStep.message` | [tui/ink/wizard.tsx:23](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L23) |
| <a id="property-name"></a> `name` | `string` | Key of this step's answer in the result. | `BaseStep.name` | [tui/ink/wizard.tsx:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L22) |
| <a id="property-type"></a> `type` | `"input"` | - | - | [tui/ink/wizard.tsx:38](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L38) |
| <a id="property-validate"></a> `validate?` | (`value`, `answers`) => `string` \| `true` | `true` to accept, or the message to show. | - | [tui/ink/wizard.tsx:41](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L41) |
| <a id="property-when"></a> `when?` | (`answers`) => `boolean` | Skips the step (leaving no answer) when it returns false. | `BaseStep.when` | [tui/ink/wizard.tsx:25](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L25) |

# Interface: ConfirmStep

Defined in: [tui/ink/wizard.tsx:51](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L51)

A yes/no question; the answer is a boolean.

## Extends

- `BaseStep`

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-default"></a> `default?` | `FromAnswers`\<`boolean`\> | - | - | [tui/ink/wizard.tsx:53](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L53) |
| <a id="property-message"></a> `message` | `FromAnswers`\<`string`\> | - | `BaseStep.message` | [tui/ink/wizard.tsx:23](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L23) |
| <a id="property-name"></a> `name` | `string` | Key of this step's answer in the result. | `BaseStep.name` | [tui/ink/wizard.tsx:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L22) |
| <a id="property-type"></a> `type` | `"confirm"` | - | - | [tui/ink/wizard.tsx:52](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L52) |
| <a id="property-when"></a> `when?` | (`answers`) => `boolean` | Skips the step (leaving no answer) when it returns false. | `BaseStep.when` | [tui/ink/wizard.tsx:25](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L25) |

# Interface: PasswordStep

Defined in: [tui/ink/wizard.tsx:45](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L45)

A line of text, masked while typed and in the summary.

## Extends

- `BaseStep`

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-message"></a> `message` | `FromAnswers`\<`string`\> | - | `BaseStep.message` | [tui/ink/wizard.tsx:23](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L23) |
| <a id="property-name"></a> `name` | `string` | Key of this step's answer in the result. | `BaseStep.name` | [tui/ink/wizard.tsx:22](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L22) |
| <a id="property-type"></a> `type` | `"password"` | - | - | [tui/ink/wizard.tsx:46](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L46) |
| <a id="property-validate"></a> `validate?` | (`value`, `answers`) => `string` \| `true` | - | - | [tui/ink/wizard.tsx:47](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L47) |
| <a id="property-when"></a> `when?` | (`answers`) => `boolean` | Skips the step (leaving no answer) when it returns false. | `BaseStep.when` | [tui/ink/wizard.tsx:25](https://github.com/falkenslab/agent-kit/blob/main/src/tui/ink/wizard.tsx#L25) |

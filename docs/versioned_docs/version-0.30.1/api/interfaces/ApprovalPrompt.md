# Interface: ApprovalPrompt

Defined in: [core/interaction.ts:4](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L4)

What a checkpoint shows the person: a title, detail lines and, in a plain terminal, the question.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-lines"></a> `lines` | `string`[] | - | [core/interaction.ts:6](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L6) |
| <a id="property-markdown"></a> `markdown?` | `boolean` | The lines are markdown (a plan): a UI that can render it should. | [core/interaction.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L10) |
| <a id="property-question"></a> `question?` | `string` | Terminal question text; defaults to the approve/reject one. | [core/interaction.ts:8](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L8) |
| <a id="property-title"></a> `title` | `string` | - | [core/interaction.ts:5](https://github.com/falkenslab/agent-kit/blob/main/src/core/interaction.ts#L5) |

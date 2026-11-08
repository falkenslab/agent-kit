# Interface: GuidedGate

Defined in: [core/hooks/guidedGate.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L29)

The guided gate: its `PreToolUse` hook, and what ends or starts an approved batch.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pretooluse"></a> `preToolUse` | `HookCallback` | - | [core/hooks/guidedGate.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L30) |
| <a id="property-userpromptsubmit"></a> `userPromptSubmit` | `HookCallback` | A `UserPromptSubmit` hook: the person's next message ends an approved batch. | [core/hooks/guidedGate.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L32) |

## Methods

### approvalAnswered()

```ts
approvalAnswered(approved): void;
```

Defined in: [core/hooks/guidedGate.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L34)

`request_human_approval`'s answer: approved, the calls that follow don't ask until the person's next message.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `approved` | `boolean` |

#### Returns

`void`

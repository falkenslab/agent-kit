# Function: createHumanApprovalServer()

```ts
function createHumanApprovalServer(
   runDir, 
   texts?, 
   options?
): McpSdkServerConfigWithInstance;
```

Defined in: [core/tools/humanApproval.ts:35](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/humanApproval.ts#L35)

The tools that ask the person, in every mode but autonomous: `request_human_approval`
(right before an action that publishes something visible to others and that's hard to
undo), `ask_human` (a choice between options, in a panel, within the turn) and, when the
session can be in plan mode (`modeControl`), `present_plan`, the kit's own way out of plan
mode (ADR-023): the person runs the plan, keeps planning or cancels.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `runDir` | `string` | `undefined` |
| `texts` | [`HumanApprovalTexts`](../interfaces/HumanApprovalTexts.md) | `DEFAULT_HUMAN_APPROVAL_TEXTS` |
| `options` | \{ `modeControl?`: [`ModeControl`](../interfaces/ModeControl.md); \} | `{}` |
| `options.modeControl?` | [`ModeControl`](../interfaces/ModeControl.md) | `undefined` |

## Returns

`McpSdkServerConfigWithInstance`

# Function: createHumanApprovalServer()

```ts
function createHumanApprovalServer(runDir, texts?): McpSdkServerConfigWithInstance;
```

Defined in: [core/tools/humanApproval.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/humanApproval.ts#L31)

Checkpoint tool for "guided" mode: the agent explores freely, but
must call this tool and wait for human approval right before any action that publishes
something visible to others and that's hard to naturally undo. Everything else —
browsing and reading — doesn't go through this.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `runDir` | `string` | `undefined` |
| `texts` | [`HumanApprovalTexts`](../interfaces/HumanApprovalTexts.md) | `DEFAULT_HUMAN_APPROVAL_TEXTS` |

## Returns

`McpSdkServerConfigWithInstance`

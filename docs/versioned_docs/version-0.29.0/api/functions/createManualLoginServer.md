# Function: createManualLoginServer()

```ts
function createManualLoginServer(runDir, texts): McpSdkServerConfigWithInstance;
```

Defined in: [core/tools/manualLogin.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/manualLogin.ts#L21)

Checkpoint tool for when the agent hits something it can't do itself (typically a login
it has no credentials for, or one that fails unexpectedly). Pauses execution until a
human confirms they've intervened by hand in whatever live interface the agent is driving
(a browser window, say), and then lets the agent continue. There is deliberately no
default wording: what counts as a manual intervention is entirely the domain's, so the
concrete agent always supplies `texts` (see `AgentSpec.manualInterventionTexts`).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runDir` | `string` |
| `texts` | [`ManualInterventionTexts`](../interfaces/ManualInterventionTexts.md) |

## Returns

`McpSdkServerConfigWithInstance`

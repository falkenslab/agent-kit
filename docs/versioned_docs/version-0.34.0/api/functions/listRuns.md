# Function: listRuns()

```ts
function listRuns(runsDir): Promise<RunSummary[]>;
```

Defined in: [core/runs.ts:253](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L253)

The runs under `runsDir` that kept a conversation, newest first; runs without `session.json` are left out.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `runsDir` | `string` |

## Returns

`Promise`\<[`RunSummary`](../interfaces/RunSummary.md)[]\>

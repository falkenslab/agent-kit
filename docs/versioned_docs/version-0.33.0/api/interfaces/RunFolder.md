# Interface: RunFolder

Defined in: [core/runs.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L10)

One run of an agent: a folder under the agent's runs folder (`<runsDir>/<timestamp>/`)
holding its session log, its transcript of tool calls and, with a run store, the SDK's
own transcript of the conversation, so a person can resume it later.

## Extended by

- [`RunSummary`](RunSummary.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | `string` | The run's folder. | [core/runs.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L12) |
| <a id="property-sessionid"></a> `sessionId` | `string` \| `null` | The SDK session kept in this folder (to resume it), or null for a new run. | [core/runs.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L14) |

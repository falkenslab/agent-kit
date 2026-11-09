# Interface: RunSummary

Defined in: [core/runs.ts:19](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L19)

A run that kept a conversation, as `listRuns()` lists it for a person to pick (see `/resume`).

## Extends

- [`RunFolder`](RunFolder.md)

## Properties

| Property | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | `string` | The run's folder. | - | [`RunFolder`](RunFolder.md).[`dir`](RunFolder.md#property-dir) | [core/runs.ts:13](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L13) |
| <a id="property-lastmessage"></a> `lastMessage` | `string` | The human's last message, on one line (empty if none). | - | - | [core/runs.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L24) |
| <a id="property-sessionid"></a> `sessionId` | `string` | The SDK session kept in this folder (to resume it), or null for a new run. | [`RunFolder`](RunFolder.md).[`sessionId`](RunFolder.md#property-sessionid) | - | [core/runs.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L20) |
| <a id="property-updatedat"></a> `updatedAt` | `Date` | When the run's conversation last changed. | - | - | [core/runs.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/runs.ts#L22) |

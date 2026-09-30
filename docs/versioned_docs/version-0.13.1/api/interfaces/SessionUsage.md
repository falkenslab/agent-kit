# Interface: SessionUsage

Defined in: [core/runner.ts:62](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L62)

Running totals for the whole `query()` session so far, not for one turn: the SDK's own
`total_cost_usd` and `modelUsage` are cumulative across turns in a streaming-input
session, so the latest `turn-end` carries the session total (never sum them).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-costusd"></a> `costUsd` | `number` | An estimate, not a billing statement. | [core/runner.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L67) |
| <a id="property-inputtokens"></a> `inputTokens` | `number` | Input tokens, cache reads and writes included, across every model the session used. | [core/runner.ts:64](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L64) |
| <a id="property-outputtokens"></a> `outputTokens` | `number` | - | [core/runner.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/runner.ts#L65) |

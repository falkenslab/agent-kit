# Interface: GuardedExtension

Defined in: [core/hooks/guidedGate.ts:9](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L9)

An installed extension whose tools the guided gate watches.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-confirmtools"></a> `confirmTools` | readonly `string`[] | Its tools that always ask (full names): its manifest's `confirmTools` and the agent's own list. | [core/hooks/guidedGate.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L16) |
| <a id="property-name"></a> `name` | `string` | - | [core/hooks/guidedGate.ts:10](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L10) |
| <a id="property-scopedir"></a> `scopeDir` | `string` | Its scope's folder: its lock keeps what the person said about its tools. | [core/hooks/guidedGate.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L12) |
| <a id="property-servers"></a> `servers` | readonly `string`[] | Its MCP servers, by session name. | [core/hooks/guidedGate.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L14) |

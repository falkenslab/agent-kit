# Interface: ExtensionGateSpec

Defined in: [core/agentSpec.ts:231](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L231)

The agent's word on guided mode's gate for extensions' tools (`AgentSpec.extensionGate`).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-autonomous"></a> `autonomous?` | `"allow"` \| `"deny"` | In autonomous mode, where no one can be asked: `"deny"` (the default) blocks those tools, `"allow"` runs them. | [core/agentSpec.ts:240](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L240) |
| <a id="property-confirmtools"></a> `confirmTools?` | `Record`\<`string`, `string`[]\> | Tools that always ask, on every call and even inside a batch the person approved (never offered "this session" or "always"), by extension and short tool name (`{ canva: ["create-design"] }`): added to its manifest's `confirmTools`. | [core/agentSpec.ts:238](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L238) |
| <a id="property-enabled"></a> `enabled?` | `boolean` | `false` turns the gate off: extensions' tools run without asking, as the model decides. | [core/agentSpec.ts:233](https://github.com/falkenslab/agent-kit/blob/main/src/core/agentSpec.ts#L233) |

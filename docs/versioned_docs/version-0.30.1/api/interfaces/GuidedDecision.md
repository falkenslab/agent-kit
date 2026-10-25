# Interface: GuidedDecision

Defined in: [core/hooks/guidedGate.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L22)

One answer the gate gave, for the transcript: what was asked, and what the person (or the mode) said.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-answer"></a> `answer` | \| `"always"` \| `"never"` \| `"yes"` \| `"no"` \| `"session"` \| `"kept-never"` \| `"autonomous-deny"` \| `"server-asks"` | [core/hooks/guidedGate.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L25) |
| <a id="property-extension"></a> `extension` | `string` | [core/hooks/guidedGate.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L23) |
| <a id="property-tool"></a> `tool` | `string` | [core/hooks/guidedGate.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/hooks/guidedGate.ts#L24) |

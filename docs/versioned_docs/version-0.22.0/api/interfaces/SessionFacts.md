# Interface: SessionFacts

Defined in: [core/sessionFacts.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L12)

What a session is, at the moment it's asked (`ExtensionContext.session()`, #43): the core's
facts, read-only, never another extension's data. The mode follows Shift+Tab and plan mode;
the tools, skills, commands and context come from the running session once it has started.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-commands"></a> `commands` | `object`[] | The slash commands the person can type, with what each does (empty until the session has started). | [core/sessionFacts.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L34) |
| <a id="property-context"></a> `context?` | [`ContextUsage`](ContextUsage.md) | How full the context window is, when the session can tell. | [core/sessionFacts.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L36) |
| <a id="property-extensions"></a> `extensions` | `object` | The extensions running (with their tools and what they say about themselves here), and the ones off, with why. | [core/sessionFacts.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L23) |
| `extensions.active` | `object`[] | - | [core/sessionFacts.ts:24](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L24) |
| `extensions.inactive` | `object`[] | - | [core/sessionFacts.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L25) |
| <a id="property-identity"></a> `identity?` | [`AgentIdentity`](AgentIdentity.md) | Who the agent is (`AgentSpec.identity`). | [core/sessionFacts.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L14) |
| <a id="property-kitversion"></a> `kitVersion` | `string` | The agent-kit version it runs on. | [core/sessionFacts.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L16) |
| <a id="property-language"></a> `language` | [`Language`](../type-aliases/Language.md) | The kit's language for this session. | [core/sessionFacts.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L18) |
| <a id="property-mode"></a> `mode` | [`Mode`](../type-aliases/Mode.md) | The mode now, and the ones the person can switch to (Shift+Tab). | [core/sessionFacts.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L20) |
| <a id="property-rundir"></a> `runDir` | `string` | This run's folder. | [core/sessionFacts.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L38) |
| <a id="property-skills"></a> `skills` | `string`[] | The skills offered (the running session's list once started; until then, the ones asked for). | [core/sessionFacts.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L32) |
| <a id="property-subagents"></a> `subagents` | `object`[] | The subagents it can delegate to. | [core/sessionFacts.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L28) |
| <a id="property-switchablemodes"></a> `switchableModes` | [`Mode`](../type-aliases/Mode.md)[] | - | [core/sessionFacts.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L21) |
| <a id="property-tools"></a> `tools` | `string`[] | Every tool of the session, as the model names it (empty until the session has started). | [core/sessionFacts.ts:30](https://github.com/falkenslab/agent-kit/blob/main/src/core/sessionFacts.ts#L30) |

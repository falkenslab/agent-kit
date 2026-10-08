# Interface: ExtensionContext\<TConfig\>

Defined in: [core/extensions.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L27)

What an extension sees of the session it's contributing to.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](BaseSessionConfig.md) | [`BaseSessionConfig`](BaseSessionConfig.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-config"></a> `config` | `TConfig` | - | [core/extensions.ts:28](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L28) |
| <a id="property-interactive"></a> `interactive` | `boolean` | A person can be asked (not autonomous): tools that ask them may exist. | [core/extensions.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L34) |
| <a id="property-mode"></a> `mode` | [`Mode`](../type-aliases/Mode.md) | - | [core/extensions.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L32) |
| <a id="property-rundir"></a> `runDir` | `string` | This run's folder. | [core/extensions.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L31) |
| <a id="property-spec"></a> `spec` | [`AgentSpec`](AgentSpec.md)\<`TConfig`\> | - | [core/extensions.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L29) |

## Methods

### session()

```ts
session(): Promise<SessionFacts>;
```

Defined in: [core/extensions.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L40)

What the session is at the moment of the call (#43): its mode now, the extensions running
and off, their tools, the subagents, skills, commands and context. The core's facts, read
anew on every call; for a tool, not for `contribute()`, which runs before the session exists.

#### Returns

`Promise`\<[`SessionFacts`](SessionFacts.md)\>

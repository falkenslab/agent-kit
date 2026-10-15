# Interface: ExtensionContext\<TConfig\>

Defined in: [core/extensions.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L32)

What an extension sees of the session it's contributing to.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `TConfig` *extends* [`BaseSessionConfig`](BaseSessionConfig.md) | [`BaseSessionConfig`](BaseSessionConfig.md) |

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilities"></a> `capabilities` | `ReadonlySet`\<`string`\> | What the session's active extensions provide (their manifests' `provides`), for one that works differently beside another (the knowledge base beside the sources). Known once the extensions are resolved: empty in `missing()`. | [core/extensions.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L45) |
| <a id="property-config"></a> `config` | `TConfig` | - | [core/extensions.ts:33](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L33) |
| <a id="property-interactive"></a> `interactive` | `boolean` | A person can be asked (not autonomous): tools that ask them may exist. | [core/extensions.ts:39](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L39) |
| <a id="property-mode"></a> `mode` | [`Mode`](../type-aliases/Mode.md) | - | [core/extensions.ts:37](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L37) |
| <a id="property-rundir"></a> `runDir` | `string` | This run's folder. | [core/extensions.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L36) |
| <a id="property-spec"></a> `spec` | [`AgentSpec`](AgentSpec.md)\<`TConfig`\> | - | [core/extensions.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L34) |

## Methods

### session()

```ts
session(): Promise<SessionFacts>;
```

Defined in: [core/extensions.ts:51](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L51)

What the session is at the moment of the call (#43): its mode now, the extensions running
and off, their tools, the subagents, skills, commands and context. The core's facts, read
anew on every call; for a tool, not for `contribute()`, which runs before the session exists.

#### Returns

`Promise`\<[`SessionFacts`](SessionFacts.md)\>

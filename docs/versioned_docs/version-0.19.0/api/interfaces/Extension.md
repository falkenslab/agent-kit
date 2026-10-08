# Interface: Extension

Defined in: [core/extensions.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L76)

An internal extension: its plugin (whose manifest gives its name, description and
capabilities), what it needs from the session, and what it brings.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-external"></a> `external?` | `boolean` | Installed rather than shipped in a package (#37): its subagents get no `Bash`, and no plugin hook runs. | [core/extensions.ts:82](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L82) |
| <a id="property-name"></a> `name` | `string` | Its name, the same as its plugin's (`plugin.json`'s `name`). | [core/extensions.ts:78](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L78) |
| <a id="property-plugin"></a> `plugin` | `string` | Its plugin's root: `.claude-plugin/plugin.json`, and its skills and commands, if any. | [core/extensions.ts:80](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L80) |

## Methods

### contribute()

```ts
contribute(context): Promise<ExtensionContribution>;
```

Defined in: [core/extensions.ts:86](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L86)

What it brings to the session, once it's active.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`ExtensionContext`](ExtensionContext.md) |

#### Returns

`Promise`\<[`ExtensionContribution`](ExtensionContribution.md)\>

***

### missing()?

```ts
optional missing(context): string | undefined;
```

Defined in: [core/extensions.ts:84](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L84)

Why it can't run in this session (e.g. "needs `knowledgeDir` in the config"), or `undefined` when it can.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`ExtensionContext`](ExtensionContext.md) |

#### Returns

`string` \| `undefined`

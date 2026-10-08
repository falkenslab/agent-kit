# Interface: Extension

Defined in: [core/extensions.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L87)

An internal extension: its plugin (whose manifest gives its name, description and
capabilities), what it needs from the session, and what it brings.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-external"></a> `external?` | `boolean` | Installed rather than shipped in a package (#37): its subagents get no `Bash`, and no plugin hook runs. | [core/extensions.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L93) |
| <a id="property-installedin"></a> `installedIn?` | `string` | An installed one's scope folder, where its lock is (its plugin is elsewhere when it's linked). | [core/extensions.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L95) |
| <a id="property-name"></a> `name` | `string` | Its name, the same as its plugin's (`plugin.json`'s `name`). | [core/extensions.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L89) |
| <a id="property-plugin"></a> `plugin` | `string` | Its plugin's root: `.claude-plugin/plugin.json`, and its skills and commands, if any. | [core/extensions.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L91) |

## Methods

### contribute()

```ts
contribute(context): Promise<ExtensionContribution>;
```

Defined in: [core/extensions.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L99)

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

Defined in: [core/extensions.ts:97](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L97)

Why it can't run in this session (e.g. "needs a folder (`dir`)"), or `undefined` when it can.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`ExtensionContext`](ExtensionContext.md) |

#### Returns

`string` \| `undefined`

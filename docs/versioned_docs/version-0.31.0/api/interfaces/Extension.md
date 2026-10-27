# Interface: Extension

Defined in: [core/extensions.ts:109](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L109)

An internal extension: its plugin (whose manifest gives its name, description and
capabilities), what it needs from the session, and what it brings.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-external"></a> `external?` | `boolean` | Installed rather than shipped in a package (#37): its subagents get no `Bash`, and no plugin hook runs. | [core/extensions.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L115) |
| <a id="property-installedin"></a> `installedIn?` | `string` | An installed one's scope folder, where its lock is (its plugin is elsewhere when it's linked). | [core/extensions.ts:117](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L117) |
| <a id="property-name"></a> `name` | `string` | Its name, the same as its plugin's (`plugin.json`'s `name`). | [core/extensions.ts:111](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L111) |
| <a id="property-plugin"></a> `plugin` | `string` | Its plugin's root: `.claude-plugin/plugin.json`, and its skills and commands, if any. | [core/extensions.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L113) |
| <a id="property-unavailable"></a> `unavailable?` | `object`[] | What it can't do on this computer (#63): capabilities whose programs are missing, with why. They aren't provided, and their skills are left out. | [core/extensions.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L119) |

## Methods

### contribute()

```ts
contribute(context): Promise<ExtensionContribution>;
```

Defined in: [core/extensions.ts:123](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L123)

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

Defined in: [core/extensions.ts:121](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L121)

Why it can't run in this session (e.g. "needs a folder (`dir`)"), or `undefined` when it can.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `context` | [`ExtensionContext`](ExtensionContext.md) |

#### Returns

`string` \| `undefined`

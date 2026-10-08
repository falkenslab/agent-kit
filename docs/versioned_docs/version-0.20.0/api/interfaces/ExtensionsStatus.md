# Interface: ExtensionsStatus

Defined in: [core/session.ts:431](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L431)

The extensions of a session: where they're installed, what's installed, what runs and what can't (with why).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-about"></a> `about` | `Record`\<`string`, \{ `description`: `string`; `provides`: `string`[]; \}\> | What each active one is, from its manifest: for a view that lists them. | [core/session.ts:437](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L437) |
| <a id="property-active"></a> `active` | `string`[] | The names of the extensions this session runs with, the kit's and the agent's too. | [core/session.ts:435](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L435) |
| <a id="property-dirs"></a> `dirs` | [`ExtensionDirs`](ExtensionDirs.md) | - | [core/session.ts:432](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L432) |
| <a id="property-inactive"></a> `inactive` | `object`[] | - | [core/session.ts:438](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L438) |
| <a id="property-installed"></a> `installed` | [`InstalledExtension`](InstalledExtension.md)[] | - | [core/session.ts:433](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L433) |

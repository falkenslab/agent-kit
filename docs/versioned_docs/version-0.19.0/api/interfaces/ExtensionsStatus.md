# Interface: ExtensionsStatus

Defined in: [core/session.ts:392](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L392)

The extensions of a session: where they're installed, what's installed, what runs and what can't (with why).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-about"></a> `about` | `Record`\<`string`, \{ `description`: `string`; `provides`: `string`[]; \}\> | What each active one is, from its manifest: for a view that lists them. | [core/session.ts:398](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L398) |
| <a id="property-active"></a> `active` | `string`[] | The names of the extensions this session runs with, the kit's and the agent's too. | [core/session.ts:396](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L396) |
| <a id="property-dirs"></a> `dirs` | [`ExtensionDirs`](ExtensionDirs.md) | - | [core/session.ts:393](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L393) |
| <a id="property-inactive"></a> `inactive` | `object`[] | - | [core/session.ts:399](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L399) |
| <a id="property-installed"></a> `installed` | [`InstalledExtension`](InstalledExtension.md)[] | - | [core/session.ts:394](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L394) |

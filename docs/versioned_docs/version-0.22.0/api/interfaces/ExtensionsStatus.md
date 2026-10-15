# Interface: ExtensionsStatus

Defined in: [core/session.ts:454](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L454)

The extensions of a session: where they're installed, what's installed, what runs and what can't (with why).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-about"></a> `about` | `Record`\<`string`, \{ `description`: `string`; `provides`: `string`[]; \}\> | What each active one is, from its manifest: for a view that lists them. | [core/session.ts:466](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L466) |
| <a id="property-active"></a> `active` | `string`[] | The names of the extensions this session runs with, the kit's and the agent's too. | [core/session.ts:464](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L464) |
| <a id="property-catalogtopics"></a> `catalogTopics?` | `string`[] | The topics the chats' catalog shows (`catalogTopics`); none, every extension. | [core/session.ts:459](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L459) |
| <a id="property-dirs"></a> `dirs` | [`ExtensionDirs`](ExtensionDirs.md) | - | [core/session.ts:455](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L455) |
| <a id="property-inactive"></a> `inactive` | `object`[] | - | [core/session.ts:467](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L467) |
| <a id="property-installed"></a> `installed` | [`InstalledExtension`](InstalledExtension.md)[] | - | [core/session.ts:462](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L462) |
| <a id="property-official"></a> `official?` | `string` | The agent's own marketplace (`officialMarketplace`), for the chats' catalog. | [core/session.ts:457](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L457) |
| <a id="property-untrusted"></a> `untrusted` | `object`[] | The workspace's extensions that don't run until the person trusts them there (#57): the chats ask. | [core/session.ts:461](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L461) |

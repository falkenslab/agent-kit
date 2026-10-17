# Interface: ExtensionsStatus

Defined in: [core/session.ts:463](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L463)

The extensions of a session: where they're installed, what's installed, what runs and what can't (with why).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-about"></a> `about` | `Record`\<`string`, [`AboutExtension`](AboutExtension.md)\> | What each active one is, from its manifest: for a view that lists them. | [core/session.ts:475](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L475) |
| <a id="property-active"></a> `active` | `string`[] | The names of the extensions this session runs with, the kit's and the agent's too. | [core/session.ts:473](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L473) |
| <a id="property-catalogtopics"></a> `catalogTopics?` | `string`[] | The topics the chats' catalog shows (`catalogTopics`); none, every extension. | [core/session.ts:468](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L468) |
| <a id="property-dirs"></a> `dirs` | [`ExtensionDirs`](ExtensionDirs.md) | - | [core/session.ts:464](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L464) |
| <a id="property-inactive"></a> `inactive` | `object`[] | - | [core/session.ts:476](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L476) |
| <a id="property-installed"></a> `installed` | [`InstalledExtension`](InstalledExtension.md)[] | - | [core/session.ts:471](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L471) |
| <a id="property-official"></a> `official?` | `string` | The agent's own marketplace (`officialMarketplace`), for the chats' catalog. | [core/session.ts:466](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L466) |
| <a id="property-sessiontools"></a> `sessionTools?` | () => readonly `string`[] | The running session's tools, as the model names them (empty until it has started): what a capability's tools are checked against. | [core/session.ts:478](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L478) |
| <a id="property-untrusted"></a> `untrusted` | `object`[] | The workspace's extensions that don't run until the person trusts them there (#57): the chats ask. | [core/session.ts:470](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L470) |

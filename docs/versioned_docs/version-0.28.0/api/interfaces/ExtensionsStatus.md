# Interface: ExtensionsStatus

Defined in: [core/session.ts:553](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L553)

The extensions of a session: where they're installed, what's installed, what runs and what can't (with why).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-about"></a> `about` | `Record`\<`string`, [`AboutExtension`](AboutExtension.md)\> | What each active one is, from its manifest: for a view that lists them. | [core/session.ts:565](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L565) |
| <a id="property-active"></a> `active` | `string`[] | The names of the extensions this session runs with, the kit's and the agent's too. | [core/session.ts:563](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L563) |
| <a id="property-catalogtopics"></a> `catalogTopics?` | `string`[] | The topics the chats' catalog shows (`catalogTopics`); none, every extension. | [core/session.ts:558](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L558) |
| <a id="property-connectors"></a> `connectors?` | `object` | The claude.ai connectors let in (#70), and the ones asked for that the account hasn't; none when the agent asks for none. | [core/session.ts:572](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L572) |
| `connectors.allowed` | `string`[] | - | [core/session.ts:572](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L572) |
| `connectors.missing` | `string`[] | - | [core/session.ts:572](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L572) |
| <a id="property-dirs"></a> `dirs` | [`ExtensionDirs`](ExtensionDirs.md) | - | [core/session.ts:554](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L554) |
| <a id="property-inactive"></a> `inactive` | `object`[] | - | [core/session.ts:566](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L566) |
| <a id="property-installed"></a> `installed` | [`InstalledExtension`](InstalledExtension.md)[] | - | [core/session.ts:561](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L561) |
| <a id="property-official"></a> `official?` | `string` | The agent's own marketplace (`officialMarketplace`), for the chats' catalog. | [core/session.ts:556](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L556) |
| <a id="property-serverstatus"></a> `serverStatus?` | () => `Promise`\<`McpServerStatus`[]\> | Its MCP servers as they are now (empty until it has started): which remote ones need signing in (#61). | [core/session.ts:570](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L570) |
| <a id="property-sessiontools"></a> `sessionTools?` | () => readonly `string`[] | The running session's tools, as the model names them (empty until it has started): what a capability's tools are checked against. | [core/session.ts:568](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L568) |
| <a id="property-untrusted"></a> `untrusted` | `object`[] | The workspace's extensions that don't run until the person trusts them there (#57): the chats ask. | [core/session.ts:560](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L560) |

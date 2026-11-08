# Interface: ExtensionsStatus

Defined in: [core/session.ts:590](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L590)

The extensions of a session: where they're installed, what's installed, what runs and what can't (with why).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-about"></a> `about` | `Record`\<`string`, [`AboutExtension`](AboutExtension.md)\> | What each active one is, from its manifest: for a view that lists them. | [core/session.ts:602](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L602) |
| <a id="property-active"></a> `active` | `string`[] | The names of the extensions this session runs with, the kit's and the agent's too. | [core/session.ts:600](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L600) |
| <a id="property-catalogtopics"></a> `catalogTopics?` | `string`[] | The topics the chats' catalog shows (`catalogTopics`); none, every extension. | [core/session.ts:595](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L595) |
| <a id="property-connectors"></a> `connectors?` | `object` | The claude.ai connectors let in (#70), and the ones asked for that the account hasn't; none when the agent asks for none. | [core/session.ts:609](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L609) |
| `connectors.allowed` | `string`[] | - | [core/session.ts:609](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L609) |
| `connectors.missing` | `string`[] | - | [core/session.ts:609](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L609) |
| <a id="property-dirs"></a> `dirs` | [`ExtensionDirs`](ExtensionDirs.md) | - | [core/session.ts:591](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L591) |
| <a id="property-inactive"></a> `inactive` | `object`[] | - | [core/session.ts:603](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L603) |
| <a id="property-installed"></a> `installed` | [`InstalledExtension`](InstalledExtension.md)[] | - | [core/session.ts:598](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L598) |
| <a id="property-official"></a> `official?` | `string` | The agent's own marketplace (`officialMarketplace`), for the chats' catalog. | [core/session.ts:593](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L593) |
| <a id="property-projectservers"></a> `projectServers?` | `ProjectServersLeftOut` | The project's `.mcp.json` servers left out (#83). | [core/session.ts:611](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L611) |
| <a id="property-serverstatus"></a> `serverStatus?` | () => `Promise`\<`McpServerStatus`[]\> | Its MCP servers as they are now (empty until it has started): which remote ones need signing in (#61). | [core/session.ts:607](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L607) |
| <a id="property-sessiontools"></a> `sessionTools?` | () => readonly `string`[] | The running session's tools, as the model names them (empty until it has started): what a capability's tools are checked against. | [core/session.ts:605](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L605) |
| <a id="property-untrusted"></a> `untrusted` | `object`[] | The workspace's extensions that don't run until the person trusts them there (#57): the chats ask. | [core/session.ts:597](https://github.com/falkenslab/agent-kit/blob/main/src/core/session.ts#L597) |

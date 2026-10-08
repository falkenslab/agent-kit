# Interface: PluginServer

Defined in: [core/externalExtensions.ts:39](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L39)

One of a plugin's MCP servers, as its `.mcp.json` (or `plugin.json`'s `mcpServers`) declares it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | `string`[] | - | [core/externalExtensions.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L41) |
| <a id="property-command"></a> `command` | `string` | - | [core/externalExtensions.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L40) |
| <a id="property-env"></a> `env?` | `Record`\<`string`, `string`\> | Its variables: a value may take the agent's with `${VAR}`. | [core/externalExtensions.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L43) |

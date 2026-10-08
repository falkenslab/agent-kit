# Interface: PluginServer

Defined in: [core/externalExtensions.ts:41](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L41)

One of a plugin's MCP servers, as its `.mcp.json` (or `plugin.json`'s `mcpServers`) declares it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | `string`[] | - | [core/externalExtensions.ts:43](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L43) |
| <a id="property-command"></a> `command` | `string` | - | [core/externalExtensions.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L42) |
| <a id="property-env"></a> `env?` | `Record`\<`string`, `string`\> | Its variables: a value may take the agent's with `${VAR}`, and its folders with `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`. | [core/externalExtensions.ts:45](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L45) |

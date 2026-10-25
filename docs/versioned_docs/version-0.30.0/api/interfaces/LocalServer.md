# Interface: LocalServer

Defined in: [core/externalExtensions.ts:46](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L46)

A server the kit starts on this computer, through its launcher.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | `string`[] | - | [core/externalExtensions.ts:48](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L48) |
| <a id="property-command"></a> `command` | `string` | - | [core/externalExtensions.ts:47](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L47) |
| <a id="property-env"></a> `env?` | `Record`\<`string`, `string`\> | Its variables: a value may take the agent's with `${VAR}`, and its folders with `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`. | [core/externalExtensions.ts:50](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L50) |

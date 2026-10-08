# Interface: ExternalManifest

Defined in: [core/externalExtensions.ts:65](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L65)

An external extension's manifest: its `plugin.json`, the plugin's own metadata (Claude Code's
fields, which its validator checks) and the kit's key (`"agent-kit"`, which it ignores).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-author"></a> `author?` | [`ExtensionAuthor`](ExtensionAuthor.md) | - | [core/externalExtensions.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L69) |
| <a id="property-description"></a> `description` | `string` | - | [core/externalExtensions.ts:67](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L67) |
| <a id="property-help"></a> `help?` | `string` | What it says about itself in a session, for the agent to tell the person (`SessionFacts`). | [core/externalExtensions.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L87) |
| <a id="property-homepage"></a> `homepage?` | `string` | - | [core/externalExtensions.ts:70](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L70) |
| <a id="property-keywords"></a> `keywords?` | `string`[] | - | [core/externalExtensions.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L73) |
| <a id="property-kit"></a> `kit?` | `string` | The agent-kit versions it works with, e.g. `">=0.19.0 <0.21.0"`. | [core/externalExtensions.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L77) |
| <a id="property-labels"></a> `labels` | `Record`\<`string`, `Partial`\<`Record`\<[`Language`](../type-aliases/Language.md), [`ExternalToolLabel`](ExternalToolLabel.md)\>\>\> | Its tools' chat labels, by short name (of any of its servers) and language (English when the kit's isn't there). | [core/externalExtensions.ts:85](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L85) |
| <a id="property-license"></a> `license?` | `string` | - | [core/externalExtensions.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L72) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:66](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L66) |
| <a id="property-needs"></a> `needs` | `string`[] | Programs it needs on this computer, found on the `PATH` (`"docker"`, `"python3"`): without one it's off, saying which. | [core/externalExtensions.ts:79](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L79) |
| <a id="property-provides"></a> `provides` | `string`[] | - | [core/externalExtensions.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L74) |
| <a id="property-readonlytools"></a> `readOnlyTools` | `string`[] | Its tools that only read (short names, of any of its servers): plan mode lets them through. | [core/externalExtensions.ts:83](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L83) |
| <a id="property-repository"></a> `repository?` | `string` | - | [core/externalExtensions.ts:71](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L71) |
| <a id="property-requires"></a> `requires` | `string`[] | - | [core/externalExtensions.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L75) |
| <a id="property-servers"></a> `servers` | `Record`\<`string`, [`PluginServer`](PluginServer.md)\> | Its MCP servers, by name (`mcp__<name>__<tool>`), from the plugin's `.mcp.json` or `plugin.json`. | [core/externalExtensions.ts:81](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L81) |
| <a id="property-version"></a> `version?` | `string` | - | [core/externalExtensions.ts:68](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L68) |

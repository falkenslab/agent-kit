# Interface: ExternalManifest

Defined in: [core/externalExtensions.ts:69](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L69)

An external extension's manifest: its `plugin.json`, the plugin's own metadata (Claude Code's
fields, which its validator checks) and the kit's data (`metadata["agent-kit"]`, which it doesn't read).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-author"></a> `author?` | [`ExtensionAuthor`](ExtensionAuthor.md) | - | [core/externalExtensions.ts:73](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L73) |
| <a id="property-capabilities"></a> `capabilities` | [`ExtensionCapability`](ExtensionCapability.md)[] | What it lets the agent do, described for the person (#62): skills and tools together. | [core/externalExtensions.ts:82](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L82) |
| <a id="property-catalog"></a> `catalog?` | `object` | How a catalog shows it (#59): its `logo` (square) and `banner` (wide), paths inside its folder, as its manifest gives them. | [core/externalExtensions.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L105) |
| `catalog.banner?` | `string` | - | [core/externalExtensions.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L105) |
| `catalog.logo?` | `string` | - | [core/externalExtensions.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L105) |
| <a id="property-description"></a> `description` | `string` | - | [core/externalExtensions.ts:71](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L71) |
| <a id="property-help"></a> `help?` | `string` | What it says about itself in a session, for the agent to tell the person (`SessionFacts`). | [core/externalExtensions.ts:101](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L101) |
| <a id="property-homepage"></a> `homepage?` | `string` | - | [core/externalExtensions.ts:74](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L74) |
| <a id="property-keywords"></a> `keywords?` | `string`[] | - | [core/externalExtensions.ts:77](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L77) |
| <a id="property-kit"></a> `kit?` | `string` | The agent-kit versions it works with, e.g. `">=0.19.0 <0.21.0"`. | [core/externalExtensions.ts:84](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L84) |
| <a id="property-labels"></a> `labels` | `Record`\<`string`, `Partial`\<`Record`\<[`Language`](../type-aliases/Language.md), [`ExternalToolLabel`](ExternalToolLabel.md)\>\>\> | Its tools' chat labels, by short name (of any of its servers) and language (English when the kit's isn't there). | [core/externalExtensions.ts:99](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L99) |
| <a id="property-license"></a> `license?` | `string` | - | [core/externalExtensions.ts:76](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L76) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:70](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L70) |
| <a id="property-provides"></a> `provides` | `string`[] | What it lets the agent use: its `provides` and its capabilities' ids. | [core/externalExtensions.ts:79](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L79) |
| <a id="property-readonlytools"></a> `readOnlyTools?` | `string`[] | Its tools that only read (short names, of any of its servers): plan mode lets them through. Without the key, plan mode asks its servers which (their tools' `readOnlyHint`); with it, the list is the whole answer, even empty. | [core/externalExtensions.ts:97](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L97) |
| <a id="property-repository"></a> `repository?` | `string` | - | [core/externalExtensions.ts:75](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L75) |
| <a id="property-requirements"></a> `requirements` | [`ExtensionRequirement`](ExtensionRequirement.md)[] | Programs it needs on this computer (#63): checked when it loads, never installed. Without one the whole extension needs, it's off; without one only some capabilities need, those are. | [core/externalExtensions.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L89) |
| <a id="property-requires"></a> `requires` | `string`[] | - | [core/externalExtensions.ts:80](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L80) |
| <a id="property-servers"></a> `servers` | `Record`\<`string`, [`PluginServer`](PluginServer.md)\> | Its MCP servers, by name (`mcp__<name>__<tool>`), from the plugin's `.mcp.json` or `plugin.json`. | [core/externalExtensions.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L91) |
| <a id="property-userconfig"></a> `userConfig` | `Record`\<`string`, [`ExtensionOption`](ExtensionOption.md)\> | Its options (`userConfig`, as Claude Code declares them, #55): its servers take them as `${user_config.KEY}`. | [core/externalExtensions.ts:103](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L103) |
| <a id="property-version"></a> `version?` | `string` | - | [core/externalExtensions.ts:72](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L72) |

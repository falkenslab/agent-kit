# Interface: ExternalManifest

Defined in: [core/externalExtensions.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L113)

An external extension's manifest: its `plugin.json`, the plugin's own metadata (Claude Code's
fields, which its validator checks) and the kit's data (`metadata["agent-kit"]`, which it doesn't read).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-author"></a> `author?` | [`ExtensionAuthor`](ExtensionAuthor.md) | - | [core/externalExtensions.ts:120](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L120) |
| <a id="property-capabilities"></a> `capabilities` | [`ExtensionCapability`](ExtensionCapability.md)[] | What it lets the agent do, described for the person (#62): skills and tools together. | [core/externalExtensions.ts:129](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L129) |
| <a id="property-catalog"></a> `catalog?` | `object` | How a catalog shows it (#59): its `logo` (square) and `banner` (wide), paths inside its folder, as its manifest gives them. | [core/externalExtensions.ts:158](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L158) |
| `catalog.banner?` | `string` | - | [core/externalExtensions.ts:158](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L158) |
| `catalog.logo?` | `string` | - | [core/externalExtensions.ts:158](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L158) |
| <a id="property-confirmtools"></a> `confirmTools?` | `string`[] | Its tools that always ask the person in guided mode (short names), even inside a batch they approved, and never offer "always" (#76): what creates, edits or publishes in their account. Without the key, its servers' `destructiveHint` says which. | [core/externalExtensions.ts:150](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L150) |
| <a id="property-description"></a> `description` | `string` | Its description in English: `plugin.json`'s, which Claude Code reads. | [core/externalExtensions.ts:116](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L116) |
| <a id="property-descriptions"></a> `descriptions` | `Partial`\<`Record`\<[`Language`](../type-aliases/Language.md), `string`\>\> | Its description in other languages (#67), from `metadata["agent-kit"].description`. | [core/externalExtensions.ts:118](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L118) |
| <a id="property-help"></a> `help?` | `string` | What it says about itself in a session, for the agent to tell the person (`SessionFacts`). | [core/externalExtensions.ts:154](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L154) |
| <a id="property-homepage"></a> `homepage?` | `string` | - | [core/externalExtensions.ts:121](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L121) |
| <a id="property-keywords"></a> `keywords?` | `string`[] | - | [core/externalExtensions.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L124) |
| <a id="property-kit"></a> `kit?` | `string` | The agent-kit versions it works with, e.g. `">=0.19.0 <0.21.0"`. | [core/externalExtensions.ts:131](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L131) |
| <a id="property-labels"></a> `labels` | `Record`\<`string`, `Partial`\<`Record`\<[`Language`](../type-aliases/Language.md), [`ExternalToolLabel`](ExternalToolLabel.md)\>\>\> | Its tools' chat labels, by short name (of any of its servers) and language (English when the kit's isn't there). | [core/externalExtensions.ts:152](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L152) |
| <a id="property-license"></a> `license?` | `string` | - | [core/externalExtensions.ts:123](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L123) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:114](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L114) |
| <a id="property-provides"></a> `provides` | `string`[] | What it lets the agent use: its `provides` and its capabilities' ids. | [core/externalExtensions.ts:126](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L126) |
| <a id="property-readonlytools"></a> `readOnlyTools?` | `string`[] | Its tools that only read (short names, of any of its servers): plan mode lets them through. Without the key, plan mode asks its servers which (their tools' `readOnlyHint`); with it, the list is the whole answer, even empty. | [core/externalExtensions.ts:144](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L144) |
| <a id="property-repository"></a> `repository?` | `string` | - | [core/externalExtensions.ts:122](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L122) |
| <a id="property-requirements"></a> `requirements` | [`ExtensionRequirement`](ExtensionRequirement.md)[] | Programs it needs on this computer (#63): checked when it loads, never installed. Without one the whole extension needs, it's off; without one only some capabilities need, those are. | [core/externalExtensions.ts:136](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L136) |
| <a id="property-requires"></a> `requires` | `string`[] | - | [core/externalExtensions.ts:127](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L127) |
| <a id="property-servers"></a> `servers` | `Record`\<`string`, [`PluginServer`](../type-aliases/PluginServer.md)\> | Its MCP servers, by name (`mcp__<name>__<tool>`), from the plugin's `.mcp.json` or `plugin.json`. | [core/externalExtensions.ts:138](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L138) |
| <a id="property-userconfig"></a> `userConfig` | `Record`\<`string`, [`ExtensionOption`](ExtensionOption.md)\> | Its options (`userConfig`, as Claude Code declares them, #55): its servers take them as `${user_config.KEY}`. | [core/externalExtensions.ts:156](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L156) |
| <a id="property-version"></a> `version?` | `string` | - | [core/externalExtensions.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L119) |

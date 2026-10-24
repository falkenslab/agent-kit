# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:500](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L500)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-datadir"></a> `dataDir` | `string` | Its data folder (`${CLAUDE_PLUGIN_DATA}`), which may not exist yet: in its scope's private folder. | [core/externalExtensions.ts:508](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L508) |
| <a id="property-dir"></a> `dir` | `string` | Its plugin: in its scope's folder, or where it is when it's linked. | [core/externalExtensions.ts:506](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L506) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:511](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L511) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:515](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L515) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:501](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L501) |
| <a id="property-privatedir"></a> `privateDir` | `string` | Its scope's private folder (`scopePrivateDir()`): its data and secrets. | [core/externalExtensions.ts:510](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L510) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:502](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L502) |
| <a id="property-scopedir"></a> `scopeDir` | `string` | Its scope's folder, where its lock is. | [core/externalExtensions.ts:504](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L504) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:513](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L513) |

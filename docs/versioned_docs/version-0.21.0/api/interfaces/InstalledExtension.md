# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:293](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L293)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-datadir"></a> `dataDir` | `string` | Its data folder (`${CLAUDE_PLUGIN_DATA}`), which may not exist yet. | [core/externalExtensions.ts:301](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L301) |
| <a id="property-dir"></a> `dir` | `string` | Its plugin: in its scope's folder, or where it is when it's linked. | [core/externalExtensions.ts:299](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L299) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:302](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L302) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:306](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L306) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:294](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L294) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:295](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L295) |
| <a id="property-scopedir"></a> `scopeDir` | `string` | Its scope's folder, where its lock is. | [core/externalExtensions.ts:297](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L297) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:304](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L304) |

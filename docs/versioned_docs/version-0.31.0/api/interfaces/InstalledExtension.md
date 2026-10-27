# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:514](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L514)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-datadir"></a> `dataDir` | `string` | Its data folder (`${CLAUDE_PLUGIN_DATA}`), which may not exist yet: in its scope's private folder. | [core/externalExtensions.ts:522](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L522) |
| <a id="property-dir"></a> `dir` | `string` | Its plugin: in its scope's folder, or where it is when it's linked. | [core/externalExtensions.ts:520](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L520) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:525](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L525) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:529](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L529) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:515](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L515) |
| <a id="property-privatedir"></a> `privateDir` | `string` | Its scope's private folder (`scopePrivateDir()`): its data and secrets. | [core/externalExtensions.ts:524](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L524) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:516](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L516) |
| <a id="property-scopedir"></a> `scopeDir` | `string` | Its scope's folder, where its lock is. | [core/externalExtensions.ts:518](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L518) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:527](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L527) |

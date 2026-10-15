# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:410](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L410)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-datadir"></a> `dataDir` | `string` | Its data folder (`${CLAUDE_PLUGIN_DATA}`), which may not exist yet: in its scope's private folder. | [core/externalExtensions.ts:418](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L418) |
| <a id="property-dir"></a> `dir` | `string` | Its plugin: in its scope's folder, or where it is when it's linked. | [core/externalExtensions.ts:416](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L416) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:421](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L421) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:425](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L425) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:411](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L411) |
| <a id="property-privatedir"></a> `privateDir` | `string` | Its scope's private folder (`scopePrivateDir()`): its data and secrets. | [core/externalExtensions.ts:420](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L420) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:412](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L412) |
| <a id="property-scopedir"></a> `scopeDir` | `string` | Its scope's folder, where its lock is. | [core/externalExtensions.ts:414](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L414) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:423](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L423) |

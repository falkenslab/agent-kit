# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:483](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L483)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-datadir"></a> `dataDir` | `string` | Its data folder (`${CLAUDE_PLUGIN_DATA}`), which may not exist yet: in its scope's private folder. | [core/externalExtensions.ts:491](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L491) |
| <a id="property-dir"></a> `dir` | `string` | Its plugin: in its scope's folder, or where it is when it's linked. | [core/externalExtensions.ts:489](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L489) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:494](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L494) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:498](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L498) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:484](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L484) |
| <a id="property-privatedir"></a> `privateDir` | `string` | Its scope's private folder (`scopePrivateDir()`): its data and secrets. | [core/externalExtensions.ts:493](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L493) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:485](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L485) |
| <a id="property-scopedir"></a> `scopeDir` | `string` | Its scope's folder, where its lock is. | [core/externalExtensions.ts:487](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L487) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:496](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L496) |

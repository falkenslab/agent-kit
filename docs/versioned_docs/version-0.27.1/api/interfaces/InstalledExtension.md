# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:492](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L492)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-datadir"></a> `dataDir` | `string` | Its data folder (`${CLAUDE_PLUGIN_DATA}`), which may not exist yet: in its scope's private folder. | [core/externalExtensions.ts:500](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L500) |
| <a id="property-dir"></a> `dir` | `string` | Its plugin: in its scope's folder, or where it is when it's linked. | [core/externalExtensions.ts:498](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L498) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:503](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L503) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:507](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L507) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:493](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L493) |
| <a id="property-privatedir"></a> `privateDir` | `string` | Its scope's private folder (`scopePrivateDir()`): its data and secrets. | [core/externalExtensions.ts:502](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L502) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:494](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L494) |
| <a id="property-scopedir"></a> `scopeDir` | `string` | Its scope's folder, where its lock is. | [core/externalExtensions.ts:496](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L496) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:505](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L505) |

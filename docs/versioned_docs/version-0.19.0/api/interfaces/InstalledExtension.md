# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:258](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L258)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | `string` | - | [core/externalExtensions.ts:261](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L261) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:262](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L262) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:266](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L266) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:259](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L259) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:260](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L260) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:264](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L264) |

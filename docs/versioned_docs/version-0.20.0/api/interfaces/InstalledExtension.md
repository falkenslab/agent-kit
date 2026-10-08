# Interface: InstalledExtension

Defined in: [core/externalExtensions.ts:263](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L263)

One installed extension, as the scopes and their locks list it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dir"></a> `dir` | `string` | - | [core/externalExtensions.ts:266](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L266) |
| <a id="property-lock"></a> `lock` | [`LockEntry`](LockEntry.md) | - | [core/externalExtensions.ts:267](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L267) |
| <a id="property-manifest"></a> `manifest?` | [`ExternalManifest`](ExternalManifest.md) | Its manifest, when it can be read. | [core/externalExtensions.ts:271](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L271) |
| <a id="property-name"></a> `name` | `string` | - | [core/externalExtensions.ts:264](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L264) |
| <a id="property-scope"></a> `scope` | keyof [`ExtensionDirs`](ExtensionDirs.md) | - | [core/externalExtensions.ts:265](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L265) |
| <a id="property-shadowed"></a> `shadowed` | `boolean` | Also installed in the project's scope, which wins: this one isn't used. | [core/externalExtensions.ts:269](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L269) |

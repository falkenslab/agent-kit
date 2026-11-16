# Interface: CachedPackage

Defined in: [core/npxPackages.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/npxPackages.ts#L27)

A cached package, as an extension's lock records it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bin"></a> `bin` | `string` | Its server's script, relative to the package (its `package.json`'s `bin`). | [core/npxPackages.ts:33](https://github.com/falkenslab/agent-kit/blob/main/src/core/npxPackages.ts#L33) |
| <a id="property-integrity"></a> `integrity` | `string` | The registry's `sha512-…`, checked when it was fetched. | [core/npxPackages.ts:29](https://github.com/falkenslab/agent-kit/blob/main/src/core/npxPackages.ts#L29) |
| <a id="property-sha256"></a> `sha256` | `string` | SHA-256 over its files in the cache, checked when a session loads it. | [core/npxPackages.ts:31](https://github.com/falkenslab/agent-kit/blob/main/src/core/npxPackages.ts#L31) |

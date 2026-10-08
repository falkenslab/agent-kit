# Interface: LockEntry

Defined in: [core/externalExtensions.ts:87](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L87)

One extension in a scope's lock.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-commit"></a> `commit?` | `string` | The commit it was cloned at, for a git source. | [core/externalExtensions.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L91) |
| <a id="property-enabled"></a> `enabled` | `boolean` | - | [core/externalExtensions.ts:94](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L94) |
| <a id="property-installed"></a> `installed` | `string` | When it was installed, ISO 8601 in UTC. | [core/externalExtensions.ts:96](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L96) |
| <a id="property-sha256"></a> `sha256` | `string` | SHA-256 over its files, checked when it loads. | [core/externalExtensions.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L93) |
| <a id="property-source"></a> `source` | `string` | Where it came from: a folder, or a git URL (with `#ref` when given). | [core/externalExtensions.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L89) |

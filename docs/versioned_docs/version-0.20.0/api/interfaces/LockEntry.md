# Interface: LockEntry

Defined in: [core/externalExtensions.ts:89](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L89)

One extension in a scope's lock.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-commit"></a> `commit?` | `string` | The commit it was cloned at, for a git source. | [core/externalExtensions.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L93) |
| <a id="property-enabled"></a> `enabled` | `boolean` | - | [core/externalExtensions.ts:98](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L98) |
| <a id="property-installed"></a> `installed` | `string` | When it was installed, ISO 8601 in UTC. | [core/externalExtensions.ts:100](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L100) |
| <a id="property-marketplace"></a> `marketplace?` | `string` | The marketplace it was installed from (`<name>@<marketplace>`), if any. | [core/externalExtensions.ts:95](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L95) |
| <a id="property-sha256"></a> `sha256` | `string` | SHA-256 over its files, checked when it loads. | [core/externalExtensions.ts:97](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L97) |
| <a id="property-source"></a> `source` | `string` | Where it came from: a folder, or a git URL (with `#ref` when given). | [core/externalExtensions.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L91) |

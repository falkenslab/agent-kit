# Interface: LockEntry

Defined in: [core/externalExtensions.ts:91](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L91)

One extension in a scope's lock.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-commit"></a> `commit?` | `string` | The commit it was cloned at, for a git source. | [core/externalExtensions.ts:100](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L100) |
| <a id="property-enabled"></a> `enabled` | `boolean` | - | [core/externalExtensions.ts:105](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L105) |
| <a id="property-installed"></a> `installed` | `string` | When it was installed, ISO 8601 in UTC. | [core/externalExtensions.ts:107](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L107) |
| <a id="property-linked"></a> `linked?` | `boolean` | Linked rather than copied (`extension add --link`), to develop it: it runs from its folder, whose files aren't checked, so a rebuild takes effect when its server starts again. | [core/externalExtensions.ts:98](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L98) |
| <a id="property-marketplace"></a> `marketplace?` | `string` | The marketplace it was installed from (`<name>@<marketplace>`), if any. | [core/externalExtensions.ts:102](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L102) |
| <a id="property-sha256"></a> `sha256` | `string` | SHA-256 over its files, checked when it loads; empty for a linked one. | [core/externalExtensions.ts:104](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L104) |
| <a id="property-source"></a> `source` | `string` | Where it came from: a folder, or a git URL (with `#ref` when given). A linked one runs from there. | [core/externalExtensions.ts:93](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L93) |

# Interface: LockEntry

Defined in: [core/externalExtensions.ts:112](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L112)

One extension in a scope's lock.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-commit"></a> `commit?` | `string` | The commit it was cloned at, for a git source. | [core/externalExtensions.ts:121](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L121) |
| <a id="property-enabled"></a> `enabled` | `boolean` | - | [core/externalExtensions.ts:138](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L138) |
| <a id="property-installed"></a> `installed` | `string` | When it was installed, ISO 8601 in UTC. | [core/externalExtensions.ts:140](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L140) |
| <a id="property-linked"></a> `linked?` | `boolean` | Linked rather than copied (`extension add --link`), to develop it: it runs from its folder, whose files aren't checked, so a rebuild takes effect when its server starts again. | [core/externalExtensions.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L119) |
| <a id="property-marketplace"></a> `marketplace?` | `string` | The marketplace it was installed from (`<name>@<marketplace>`), if any. | [core/externalExtensions.ts:131](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L131) |
| <a id="property-options"></a> `options?` | `Record`\<`string`, [`OptionValue`](../type-aliases/OptionValue.md)\> | Its options' non-sensitive values (#55); the sensitive ones are in the scope's `.secrets/`. | [core/externalExtensions.ts:135](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L135) |
| <a id="property-packages"></a> `packages?` | `Record`\<`string`, [`CachedPackage`](CachedPackage.md)\> | The npm packages its servers run with npx (#54), by `<package>@<version>`: in the agent's package cache, checked when it loads. | [core/externalExtensions.ts:137](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L137) |
| <a id="property-sha256"></a> `sha256` | `string` | SHA-256 over its files, checked when it loads; empty for a linked one. | [core/externalExtensions.ts:133](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L133) |
| <a id="property-source"></a> `source` | `string` | Where it came from: a folder, or a git URL (with `#ref` when given). A linked one runs from there. | [core/externalExtensions.ts:114](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L114) |
| <a id="property-stored"></a> `stored?` | `boolean` | Its code is in the agent's store (`<agent scope>/.store/<name>/<hash>/`), not in its scope's folder (#57): a project's scope keeps only its lock, so a workspace shared with others carries what it uses and at which version, never the code itself (`restoreExtensions()` gets it). | [core/externalExtensions.ts:129](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L129) |
| <a id="property-subdir"></a> `subdir?` | `string` | The folder inside its source it was installed from (a git repository's subfolder). | [core/externalExtensions.ts:123](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L123) |

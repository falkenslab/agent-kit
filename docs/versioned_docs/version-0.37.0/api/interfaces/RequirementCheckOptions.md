# Interface: RequirementCheckOptions

Defined in: [core/extensionRequirements.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L115)

How a requirement is checked: the version check's limit, the environment, and the extension's option values (`settings`).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-env"></a> `env?` | `ProcessEnv` | - | [core/extensionRequirements.ts:117](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L117) |
| <a id="property-settings"></a> `settings?` | `Record`\<`string`, `unknown`\> | Its option values: a requirement with a `setting` the person set is checked at that path. | [core/extensionRequirements.ts:119](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L119) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | - | [core/extensionRequirements.ts:116](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L116) |

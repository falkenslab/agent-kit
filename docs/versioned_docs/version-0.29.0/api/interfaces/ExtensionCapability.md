# Interface: ExtensionCapability

Defined in: [core/extensions.ts:138](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L138)

Something the agent does well with an extension (#62): the skills that say how and the tools
that do it, described for the person. Its `id` is what `requires` names, neutral (`lms-grading`,
not `moodle-grading`), so an agent's skills depend on what can be done, not on which extension
does it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | - | [core/extensions.ts:139](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L139) |
| <a id="property-skills"></a> `skills` | `string`[] | Its skills, by their folder in the extension's `skills/`. | [core/extensions.ts:141](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L141) |
| <a id="property-texts"></a> `texts` | `Partial`\<`Record`\<[`Language`](../type-aliases/Language.md), [`CapabilityText`](CapabilityText.md)\>\> | Its label and description, by language. | [core/extensions.ts:145](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L145) |
| <a id="property-tools"></a> `tools` | `string`[] | Its tools, by short name (of any of its servers). | [core/extensions.ts:143](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensions.ts#L143) |

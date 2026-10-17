# Interface: ExtensionRequirement

Defined in: [core/extensionRequirements.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L12)

A program an extension needs on the computer, and how the person installs it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-for"></a> `for` | `string`[] | The capabilities that need it (its manifest's ids); without them, the whole extension does. | [core/extensionRequirements.ts:22](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L22) |
| <a id="property-install"></a> `install` | `object` | How to install it on each system: a command, or a link. | [core/extensionRequirements.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L20) |
| `install.linux?` | `string` | - | [core/extensionRequirements.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L20) |
| `install.macos?` | `string` | - | [core/extensionRequirements.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L20) |
| `install.url?` | `string` | - | [core/extensionRequirements.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L20) |
| `install.windows?` | `string` | - | [core/extensionRequirements.ts:20](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L20) |
| <a id="property-name"></a> `name` | `string` | What the person reads: "Docker". | [core/extensionRequirements.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L14) |
| <a id="property-program"></a> `program` | `string` | The program, by its bare name, found on the `PATH` (`docker`; on Windows with `PATHEXT`'s extensions). | [core/extensionRequirements.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L16) |
| <a id="property-version"></a> `version?` | `object` | How to check its version: its arguments (options or `version` only) and the oldest it works with. | [core/extensionRequirements.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L18) |
| `version.args` | `string`[] | - | [core/extensionRequirements.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L18) |
| `version.min` | `string` | - | [core/extensionRequirements.ts:18](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L18) |

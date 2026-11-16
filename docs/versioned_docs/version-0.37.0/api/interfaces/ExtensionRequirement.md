# Interface: ExtensionRequirement

Defined in: [core/extensionRequirements.ts:12](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L12)

A program an extension needs on the computer, and how the person installs it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-for"></a> `for` | `string`[] | The capabilities that need it (its manifest's ids); without them, the whole extension does. | [core/extensionRequirements.ts:27](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L27) |
| <a id="property-install"></a> `install` | `object` | How to install it on each system: a command, or a link. | [core/extensionRequirements.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L25) |
| `install.linux?` | `string` | - | [core/extensionRequirements.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L25) |
| `install.macos?` | `string` | - | [core/extensionRequirements.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L25) |
| `install.url?` | `string` | - | [core/extensionRequirements.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L25) |
| `install.windows?` | `string` | - | [core/extensionRequirements.ts:25](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L25) |
| <a id="property-name"></a> `name` | `string` | What the person reads: "Docker". | [core/extensionRequirements.ts:14](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L14) |
| <a id="property-program"></a> `program` | `string` | The program, by its bare name, found on the `PATH` (`docker`; on Windows with `PATHEXT`'s extensions). | [core/extensionRequirements.ts:16](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L16) |
| <a id="property-setting"></a> `setting?` | `string` | One of its options (`userConfig`) that, when the person sets it, is the program to check instead: the path of the one its server will run (a virtual environment's `python`). Unset, the `PATH`'s. | [core/extensionRequirements.ts:21](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L21) |
| <a id="property-version"></a> `version?` | `object` | How to check its version: its arguments (options or `version` only) and the oldest it works with. | [core/extensionRequirements.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L23) |
| `version.args` | `string`[] | - | [core/extensionRequirements.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L23) |
| `version.min` | `string` | - | [core/extensionRequirements.ts:23](https://github.com/falkenslab/agent-kit/blob/main/src/core/extensionRequirements.ts#L23) |

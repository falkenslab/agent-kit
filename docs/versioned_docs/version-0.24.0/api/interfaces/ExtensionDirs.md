# Interface: ExtensionDirs

Defined in: [core/externalExtensions.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L34)

The two folders an agent installs extensions into; either may be left out.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent?` | `string` | The agent's, for all its projects, e.g. `~/.miyagi/extensions`. | [core/externalExtensions.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L36) |
| <a id="property-project"></a> `project?` | `string` | The project's, for this one only, e.g. `<projectDir>/extensions`: it wins over the agent's. | [core/externalExtensions.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L38) |

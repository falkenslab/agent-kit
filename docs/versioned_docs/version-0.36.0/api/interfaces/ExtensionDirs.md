# Interface: ExtensionDirs

Defined in: [core/externalExtensions.ts:33](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L33)

The two folders an agent installs extensions into; either may be left out.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent?` | `string` | The agent's, for all its projects, e.g. `~/.miyagi/extensions`. | [core/externalExtensions.ts:35](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L35) |
| <a id="property-project"></a> `project?` | `string` | The project's, for this one only, e.g. `<projectDir>/extensions`: it wins over the agent's. | [core/externalExtensions.ts:37](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L37) |

# Interface: SourceToolsOptions

Defined in: [core/tools/saveToSources.ts:120](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L120)

Options of `createSaveToSourcesServer()`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-interactive"></a> `interactive?` | `boolean` | A person can be asked (not autonomous): adds `request_file` and `retire_source`, which ask first. | [core/tools/saveToSources.ts:124](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L124) |
| <a id="property-maxbytes"></a> `maxBytes?` | `number` | The most `download_to_sources` and `request_file` copy in; 50 MB by default. | [core/tools/saveToSources.ts:126](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L126) |
| <a id="property-projectdir"></a> `projectDir?` | `string` | The project root: paths in the tools' answers are relative to it. Defaults to the parent of `sourcesDir`. | [core/tools/saveToSources.ts:122](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L122) |

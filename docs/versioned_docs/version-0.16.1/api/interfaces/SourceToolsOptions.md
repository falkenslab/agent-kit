# Interface: SourceToolsOptions

Defined in: [core/tools/saveToSources.ts:109](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L109)

Options of `createSaveToSourcesServer()`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-interactive"></a> `interactive?` | `boolean` | A person can be asked (not autonomous): adds `request_file` and `retire_source`, which ask first. | [core/tools/saveToSources.ts:115](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L115) |
| <a id="property-knowledgedir"></a> `knowledgeDir?` | `string` | The knowledge folder, to tell which originals have a summary page (`list_sources`). | [core/tools/saveToSources.ts:111](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L111) |
| <a id="property-maxbytes"></a> `maxBytes?` | `number` | The most `download_to_sources` and `request_file` copy in; 50 MB by default. | [core/tools/saveToSources.ts:117](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L117) |
| <a id="property-projectdir"></a> `projectDir?` | `string` | The project root: paths in the tools' answers are relative to it. Defaults to the parent of `sourcesDir`. | [core/tools/saveToSources.ts:113](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/saveToSources.ts#L113) |

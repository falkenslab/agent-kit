# Interface: KnowledgeToolsOptions

Defined in: [core/tools/knowledgeTools.ts:32](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/knowledgeTools.ts#L32)

Options of `createKnowledgeServer()`.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-interactive"></a> `interactive?` | `boolean` | A person can be asked (not autonomous): adds `knowledge_retire`, which asks first. | [core/tools/knowledgeTools.ts:36](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/knowledgeTools.ts#L36) |
| <a id="property-knowledgedir"></a> `knowledgeDir?` | `string` | The knowledge folder, for `list_sources`' ingest status. | [core/tools/knowledgeTools.ts:42](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/knowledgeTools.ts#L42) |
| <a id="property-projectdir"></a> `projectDir?` | `string` | The project root, for `list_sources`' paths. | [core/tools/knowledgeTools.ts:40](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/knowledgeTools.ts#L40) |
| <a id="property-rundir"></a> `runDir` | `string` | This run's folder (for the response file of `knowledge_retire`'s approval). | [core/tools/knowledgeTools.ts:34](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/knowledgeTools.ts#L34) |
| <a id="property-sourcesdir"></a> `sourcesDir?` | `string` | The sources folder: summaries record their original's hash, and `knowledge_check` reports new, changed and missing originals. | [core/tools/knowledgeTools.ts:38](https://github.com/falkenslab/agent-kit/blob/main/src/core/tools/knowledgeTools.ts#L38) |

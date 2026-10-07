import type { Extension } from "../../core/extensions.js";
import { createFileKnowledgeStore } from "./fileKnowledgeStore.js";
import { knowledgeToolLabels } from "./labels.js";
import { knowledgePluginRoot, knowledgePromptSection } from "./prompt.js";
import { createKnowledgeServer } from "./tools.js";

/**
 * The built-in knowledge base (`config.knowledgeDir`, ADR-008, ADR-024): an interlinked wiki the
 * agent keeps only through its `knowledge_*` tools, over a `KnowledgeStore` (the kit's over
 * markdown files, or the agent's own). Not enabled, `knowledgeDir` is left to the core as a
 * folder of the agent's own notes.
 */
export const knowledgeExtension: Extension = {
  name: "knowledge",
  plugin: knowledgePluginRoot(),
  missing: ({ config }) => (config.knowledgeDir ? undefined : "needs `knowledgeDir` in the config"),
  async contribute({ config, spec, runDir, interactive }) {
    const knowledgeDir = config.knowledgeDir!;
    const store = spec.knowledgeStore?.(config) ?? createFileKnowledgeStore(knowledgeDir, { pageTypes: spec.knowledgePageTypes });
    // The person's preferences, by title, for its prompt section (#33).
    const preferences = (await store.list()).filter((page) => page.type === "preference" && page.status === "active").map(({ id, title }) => ({ id, title }));
    return {
      // knowledge_retire asks a person, so it exists only where there is one.
      mcpServers: { knowledge: createKnowledgeServer(store, { runDir, interactive }) },
      promptSection: knowledgePromptSection({ withSources: Boolean(config.sourcesDir), pageTypes: store.types(), preferences }),
      // Never the file tools on the knowledge folder (ADR-024): the denial points to the tools.
      toolOnlyDirs: [{ dir: knowledgeDir, instead: "the knowledge_* tools" }],
      readOnlyTools: ["mcp__knowledge__knowledge_index", "mcp__knowledge__knowledge_search", "mcp__knowledge__knowledge_read", "mcp__knowledge__knowledge_check"],
      selfAskingTools: ["mcp__knowledge__knowledge_retire"],
      toolLabels: knowledgeToolLabels(),
      helpLines: [
        "You keep a knowledge base (your memory across sessions). Its commands: `/knowledge:ingest` (learn the new or changed files of the sources folder), `/knowledge:query <question>` (answer from it), `/knowledge:lint` (check it and fix what's mechanical).",
      ],
      api: { knowledgeStore: store },
    };
  },
};

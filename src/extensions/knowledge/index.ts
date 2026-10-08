import type { BaseSessionConfig } from "../../core/agentSpec.js";
import { folderOf, type Extension, type FolderOption } from "../../core/extensions.js";
import { createFileKnowledgeStore } from "./fileKnowledgeStore.js";
import type { KnowledgeStore, PageType } from "./knowledgeStore.js";
import { knowledgeToolLabels } from "./labels.js";
import { knowledgePluginRoot, knowledgePromptSection } from "./prompt.js";
import { createKnowledgeServer } from "./tools.js";

/** The knowledge base's options. */
export interface KnowledgeOptions<TConfig extends BaseSessionConfig = BaseSessionConfig> {
  /** The knowledge base's folder, reached only through its tools, never the file tools. Without a folder the extension is off. */
  dir: FolderOption<TConfig>;
  /**
   * The agent's own page types, besides the kit's (summary, concept, entity, synthesis,
   * preference): each with its folder (`""` for the root), index section, description (told to
   * the model) and template.
   */
  pageTypes?: PageType[];
  /** Its store, instead of the kit's over markdown files in `dir` (e.g. a database or a vector store implementing `KnowledgeStore`). */
  store?(config: TConfig, dir: string): KnowledgeStore;
}

/**
 * The built-in knowledge base (ADR-008, ADR-024): an interlinked wiki the agent keeps only through
 * its `knowledge_*` tools, over a `KnowledgeStore` (the kit's over markdown files, or the agent's
 * own). The host reads it through `apis.knowledge.knowledgeStore`.
 */
export function knowledge<TConfig extends BaseSessionConfig = BaseSessionConfig>(options: KnowledgeOptions<TConfig>): Extension {
  return {
    name: "knowledge",
    plugin: knowledgePluginRoot(),
    missing: ({ config }) => (folderOf(options.dir, config) ? undefined : "needs a folder (`dir`)"),
    async contribute({ config, runDir, interactive, capabilities }) {
      const knowledgeDir = folderOf(options.dir, config)!;
      const store = options.store?.(config as TConfig, knowledgeDir) ?? createFileKnowledgeStore(knowledgeDir, { pageTypes: options.pageTypes });
      // The person's preferences, by title, for its prompt section (#33).
      const preferences = (await store.list()).filter((page) => page.type === "preference" && page.status === "active").map(({ id, title }) => ({ id, title }));
      return {
        // knowledge_retire asks a person, so it exists only where there is one.
        mcpServers: { knowledge: createKnowledgeServer(store, { runDir, interactive }) },
        // Beside the sources, its summaries say which original they're about.
        promptSection: knowledgePromptSection({ withSources: capabilities.has("sources"), pageTypes: store.types(), preferences }),
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
}

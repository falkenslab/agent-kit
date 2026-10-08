import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BaseSessionConfig } from "../../core/agentSpec.js";
import { folderOf, type Extension, type FolderOption } from "../../core/extensions.js";
import { sourcesToolLabels } from "./labels.js";
import { addSource } from "./sources.js";
import { createSaveToSourcesServer, sourcesPromptSection } from "./tools.js";

/** Absolute path of the sources extension's plugin, next to `dist/` (or `src/` under tsx). */
export function sourcesPluginRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "extensions", "sources");
}

/** The sources extension's options. */
export interface SourcesOptions<TConfig extends BaseSessionConfig = BaseSessionConfig> {
  /**
   * The sources folder: original files kept as obtained, apart from any notes. Material the
   * person drops in, plus whatever the agent saves with `save_to_sources` (downloaded documents,
   * transcripts…). The agent reads and searches it, never edits it, and `save_to_sources` never
   * overwrites. Without a folder the extension is off.
   */
  dir: FolderOption<TConfig>;
  /** The `save_to_sources` tool's description in the agent's own words, instead of the kit's generic one. */
  saveDescription?: string;
}

/**
 * The sources folder: originals kept as obtained, read with `Read` and `extract_text`, added and
 * retired only through its tools (`sourceFiles`). It knows nothing of a knowledge base (#30).
 */
export function sources<TConfig extends BaseSessionConfig = BaseSessionConfig>(options: SourcesOptions<TConfig>): Extension {
  return {
    name: "sources",
    plugin: sourcesPluginRoot(),
    missing: ({ config }) => (folderOf(options.dir, config) ? undefined : "needs a folder (`dir`)"),
    async contribute({ config, runDir, interactive }) {
      const sourcesDir = folderOf(options.dir, config)!;
      const folder = `${path.relative(config.projectDir, sourcesDir).split(path.sep).join("/")}/`;
      return {
        // Asking a person (request_file, retire_source) only where there is one.
        mcpServers: { sourceFiles: createSaveToSourcesServer(runDir, sourcesDir, options.saveDescription, { projectDir: config.projectDir, interactive }) },
        promptSection: sourcesPromptSection(config.projectDir, sourcesDir),
        // The originals are read and searched, never written: the only way in is its tools.
        fileTools: ["Read", "Glob", "Grep"],
        readOnlyDirs: [sourcesDir],
        readOnlyTools: ["mcp__sourceFiles__list_sources", "mcp__sourceFiles__extract_text"],
        selfAskingTools: ["mcp__sourceFiles__request_file", "mcp__sourceFiles__retire_source"],
        toolLabels: sourcesToolLabels(),
        // For the host (a page's "add to the chest"): a file the person gave, with the same rules
        // as the tools (never overwriting, a duplicate recognized) and the person as its origin.
        api: {
          addSource: (file: string, name: string, subfolder = "") =>
            addSource(sourcesDir, file, subfolder ? `${subfolder.replace(/[/\\]*$/, "")}/` : name, { kind: "person", from: name }, subfolder ? { name } : {}),
        },
        helpLines: [`Originals go in \`${folder}\`: the person drops files there (or you ask for one, or download it), and you never change them.`],
      };
    },
  };
}

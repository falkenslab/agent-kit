import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Extension } from "../../core/extensions.js";
import { sourcesToolLabels } from "./labels.js";
import { addSource } from "./sources.js";
import { createSaveToSourcesServer, sourcesPromptSection } from "./tools.js";

/** Absolute path of the sources extension's plugin, next to `dist/` (or `src/` under tsx). */
export function sourcesPluginRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "extensions", "sources");
}

/**
 * The sources folder (`config.sourcesDir`): originals kept as obtained, read with `Read` and
 * `extract_text`, added and retired only through its tools (`sourceFiles`). It knows nothing of
 * a knowledge base (#30).
 */
export const sourcesExtension: Extension = {
  name: "sources",
  plugin: sourcesPluginRoot(),
  missing: ({ config }) => (config.sourcesDir ? undefined : "needs `sourcesDir` in the config"),
  async contribute({ config, spec, runDir, interactive }) {
    const sourcesDir = config.sourcesDir!;
    const folder = `${path.relative(config.projectDir, sourcesDir).split(path.sep).join("/")}/`;
    return {
      // Asking a person (request_file, retire_source) only where there is one.
      mcpServers: { sourceFiles: createSaveToSourcesServer(runDir, sourcesDir, spec.saveToSourcesDescription, { projectDir: config.projectDir, interactive }) },
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

import path from "node:path";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

/** Domain-neutral default — a concrete agent may override this via a wrapper around `createSaveToKnowledgeServer` if it wants domain-specific wording (e.g. "a Moodle-hosted document"). */
const DEFAULT_DESCRIPTION =
  "Copy a file from this run's own folder (e.g. something just downloaded) into a folder " +
  "under knowledge/, so it becomes readable there the same way anything else in " +
  "knowledge/ or context/ is — with the SDK's own Read tool, which already extracts text " +
  "from PDF/DOCX and interprets images directly. This tool does no parsing or conversion " +
  "itself, it only relocates the file. Use it right after downloading a document you're " +
  "about to study in depth, so it's still there for later sessions instead of only " +
  "existing for this run.";

/** Resolves `candidate` against `base`; returns the absolute path only if it stays inside it. */
function resolveWithin(base: string, candidate: string): string | undefined {
  const resolved = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(base, candidate);
  const relative = path.relative(base, resolved);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)) ? resolved : undefined;
}

/**
 * `resolvedPath` as given if it exists; otherwise, a same-directory sibling whose
 * filename is Unicode-equal under NFC normalization. Needed because a file downloaded via
 * a real browser navigation can land on disk with an accented filename in NFD
 * (decomposed) form, while the model's own `source` argument, being ordinary typed/read
 * text, is normally NFC (composed). The two look character-for-character identical but
 * differ byte-for-byte, so a literal `copyFile` throws ENOENT even though the file is
 * right there under a name that reads identically.
 */
async function resolveExistingFileToleratingNormalization(resolvedPath: string): Promise<string | undefined> {
  try {
    await stat(resolvedPath);
    return resolvedPath;
  } catch {
    // fall through to the normalization-tolerant lookup below
  }

  const dir = path.dirname(resolvedPath);
  const wantName = path.basename(resolvedPath).normalize("NFC");
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return undefined;
  }
  const match = entries.find((name) => name.normalize("NFC") === wantName);
  return match ? path.join(dir, match) : undefined;
}

/** Same idea as DEFAULT_DESCRIPTION, for `save_to_sources`: the original file kept apart from the notes written about it. */
const DEFAULT_SOURCES_DESCRIPTION =
  "Copy a file from this run's own folder (e.g. something just downloaded) into a folder " +
  "under sources/, where original source files are kept apart from your own notes, so " +
  "it becomes readable there with the SDK's own Read tool, which already extracts text " +
  "from PDF/DOCX and interprets images directly. This tool does no parsing or conversion " +
  "itself, it only relocates the file. Use it right after downloading a document you're " +
  "about to study in depth, so it's still there for later sessions instead of only " +
  "existing for this run.";

/**
 * Deliberately just an fs.copyFile: no parsing, no format conversion, no third-party
 * library. A document downloaded via a browser-automation tool typically lands in this
 * run's own folder, which Read/Write/Glob can't reach if `additionalDirectories` only
 * covers the project's own folders — this tool's only job is getting the file into
 * `targetDir`, where the SDK's own Read tool already knows how to interpret it (PDF/DOCX
 * text extraction, multimodal images), exactly as it already does for context/.
 */
function createSaveFileServer(
  toolName: string,
  targetLabel: string,
  runDir: string,
  contextDir: string,
  targetDir: string,
  description: string,
) {
  const saveFile = tool(
    toolName,
    description,
    {
      source: z
        .string()
        .describe("Path to the file, relative to this run's own folder (or to context/) - not a URL"),
      destination: z.string().describe(`Path to save it under, relative to ${targetLabel}, e.g. "topic-3/slides.pdf"`),
    },
    async (args) => {
      const runDirCandidate = resolveWithin(runDir, args.source);
      const contextDirCandidate = resolveWithin(contextDir, args.source);
      if (!runDirCandidate && !contextDirCandidate) {
        return {
          content: [{ type: "text" as const, text: `"${args.source}" isn't inside this run's folder or context/ - refusing to read it.` }],
          isError: true,
        };
      }

      const resolvedSource =
        (runDirCandidate && (await resolveExistingFileToleratingNormalization(runDirCandidate))) ??
        (contextDirCandidate && (await resolveExistingFileToleratingNormalization(contextDirCandidate)));
      if (!resolvedSource) {
        return {
          content: [{ type: "text" as const, text: `Couldn't find "${args.source}" in this run's folder or context/ (checked byte-for-byte and Unicode-normalized names) - double check the exact path, e.g. with Glob.` }],
          isError: true,
        };
      }

      const resolvedDestination = resolveWithin(targetDir, args.destination);
      if (!resolvedDestination) {
        return {
          content: [{ type: "text" as const, text: `"${args.destination}" isn't inside ${targetLabel} - refusing to write there.` }],
          isError: true,
        };
      }

      try {
        await mkdir(path.dirname(resolvedDestination), { recursive: true });
        await copyFile(resolvedSource, resolvedDestination);
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Couldn't copy "${args.source}" to ${targetLabel}: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }

      const savedAs = path.relative(targetDir, resolvedDestination).split(path.sep).join("/");
      return {
        content: [{ type: "text" as const, text: `Saved to ${targetLabel}${savedAs} - read it from there with Read.` }],
      };
    },
  );

  return createSdkMcpServer({ name: "knowledgeFiles", version: "1.0.0", tools: [saveFile] });
}

/** `save_to_knowledge`: copies into `knowledgeDir`. */
export function createSaveToKnowledgeServer(runDir: string, contextDir: string, knowledgeDir: string, description = DEFAULT_DESCRIPTION) {
  return createSaveFileServer("save_to_knowledge", "knowledge/", runDir, contextDir, knowledgeDir, description);
}

/** `save_to_sources`: copies into `sourcesDir`, for a project that keeps original files apart from its notes. */
export function createSaveToSourcesServer(runDir: string, contextDir: string, sourcesDir: string, description = DEFAULT_SOURCES_DESCRIPTION) {
  return createSaveFileServer("save_to_sources", "sources/", runDir, contextDir, sourcesDir, description);
}

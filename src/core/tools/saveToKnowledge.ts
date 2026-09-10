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

/**
 * Deliberately just an fs.copyFile: no parsing, no format conversion, no third-party
 * library. A document downloaded via a browser-automation tool typically lands in this
 * run's own folder, which Read/Write/Glob can't reach if `additionalDirectories` only
 * covers context/+knowledge/ — this tool's only job is getting the file into knowledge/,
 * where the SDK's own Read tool already knows how to interpret it (PDF/DOCX text
 * extraction, multimodal images), exactly as it already does for context/.
 */
export function createSaveToKnowledgeServer(runDir: string, contextDir: string, knowledgeDir: string, description = DEFAULT_DESCRIPTION) {
  const saveToKnowledge = tool(
    "save_to_knowledge",
    description,
    {
      source: z
        .string()
        .describe("Path to the file, relative to this run's own folder (or to context/) - not a URL"),
      destination: z.string().describe('Path to save it under, relative to knowledge/, e.g. "topic-3/slides.pdf"'),
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

      const resolvedDestination = resolveWithin(knowledgeDir, args.destination);
      if (!resolvedDestination) {
        return {
          content: [{ type: "text" as const, text: `"${args.destination}" isn't inside knowledge/ - refusing to write there.` }],
          isError: true,
        };
      }

      try {
        await mkdir(path.dirname(resolvedDestination), { recursive: true });
        await copyFile(resolvedSource, resolvedDestination);
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Couldn't copy "${args.source}" to knowledge/: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: `Saved to knowledge/${path.relative(knowledgeDir, resolvedDestination)} - read it from there with Read.` }],
      };
    },
  );

  return createSdkMcpServer({ name: "knowledgeFiles", version: "1.0.0", tools: [saveToKnowledge] });
}

import path from "node:path";
import { constants, copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

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

const DEFAULT_DESCRIPTION =
  "Copy a file from this run's own folder (e.g. something just downloaded) into a folder " +
  "under sources/, where original files are kept as they were obtained, apart from your " +
  "own notes. It becomes readable there with the SDK's own Read tool, which already " +
  "extracts text from PDF/DOCX and interprets images directly. This tool does no parsing " +
  "or conversion itself, it only relocates the file, and it never overwrites a file " +
  "that's already in sources/. Use it right after downloading a document you're about to " +
  "study in depth, so it's still there for later sessions instead of only existing for " +
  "this run.";

/**
 * `save_to_sources`: the only way the agent adds to `sourcesDir` (Write/Edit are scoped
 * to the notes folder, see hooks/fileScopeGate.ts), so the originals stay as obtained.
 * Deliberately just an fs.copyFile with COPYFILE_EXCL — no parsing, no format conversion,
 * no overwriting. A document downloaded via a browser-automation tool typically lands in
 * this run's own folder, which the file tools can't reach; this tool's only job is getting
 * it into `sourcesDir`, where the SDK's own Read tool already knows how to interpret it
 * (PDF/DOCX text extraction, multimodal images).
 */
export function createSaveToSourcesServer(runDir: string, sourcesDir: string, description = DEFAULT_DESCRIPTION) {
  const saveToSources = tool(
    "save_to_sources",
    description,
    {
      source: z.string().describe("Path to the file, relative to this run's own folder - not a URL"),
      destination: z.string().describe('Path to save it under, relative to sources/, e.g. "topic-3/slides.pdf"'),
    },
    async (args) => {
      const candidate = resolveWithin(runDir, args.source);
      if (!candidate) {
        return {
          content: [{ type: "text" as const, text: `"${args.source}" isn't inside this run's folder - refusing to read it.` }],
          isError: true,
        };
      }

      const resolvedSource = await resolveExistingFileToleratingNormalization(candidate);
      if (!resolvedSource) {
        return {
          content: [{ type: "text" as const, text: `Couldn't find "${args.source}" in this run's folder (checked byte-for-byte and Unicode-normalized names) - double check the exact path, e.g. with Glob.` }],
          isError: true,
        };
      }

      const resolvedDestination = resolveWithin(sourcesDir, args.destination);
      if (!resolvedDestination) {
        return {
          content: [{ type: "text" as const, text: `"${args.destination}" isn't inside sources/ - refusing to write there.` }],
          isError: true,
        };
      }

      try {
        await mkdir(path.dirname(resolvedDestination), { recursive: true });
        await copyFile(resolvedSource, resolvedDestination, constants.COPYFILE_EXCL);
      } catch (error) {
        const exists = (error as NodeJS.ErrnoException).code === "EEXIST";
        return {
          content: [{
            type: "text" as const,
            text: exists
              ? `"${args.destination}" already exists in sources/ - originals are never overwritten; pick another destination name.`
              : `Couldn't copy "${args.source}" to sources/: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }

      const savedAs = path.relative(sourcesDir, resolvedDestination).split(path.sep).join("/");
      return {
        content: [{ type: "text" as const, text: `Saved to sources/${savedAs} - read it from there with Read.` }],
      };
    },
  );

  return createSdkMcpServer({ name: "sourceFiles", version: "1.0.0", tools: [saveToSources] });
}

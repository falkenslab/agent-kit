import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The sources folder's bookkeeping: originals stay files (ADR-024), and the kit keeps a
 * manifest next to them (`.agent-kit/sources.json`, inside `sourcesDir`, where the agent's
 * file tools can't write) with each original's hash, size, provenance, the version it replaces
 * and when its content last changed. From that it refuses duplicates, tells present, missing
 * and retired originals apart, and retires an original into `.agent-kit/retired/` instead of
 * deleting it. It knows nothing of the knowledge base: each owns its data, and the model
 * connects them through their tools (#30). Hashes never leave it.
 */

export const KIT_DIR = ".agent-kit";
const MANIFEST = "sources.json";
const RETIRED_DIR = "retired";

/** Where an original came from. */
export type SourceOrigin =
  | { kind: "run"; from: string }
  | { kind: "url"; from: string }
  | { kind: "person"; from: string }
  /** Copied in by hand: first seen by `listSources()`. */
  | { kind: "manual" };

export interface SourceEntry {
  hash: string;
  size: number;
  /** For hashing a file again only when it changed. */
  mtimeMs: number;
  addedAt: string;
  origin: SourceOrigin;
  /** The original this one is a new version of (a path relative to `sourcesDir`). */
  replaces?: string;
  /** The page this one was generated from (a web page's markdown, from its HTML). */
  derivedFrom?: string;
  /** When its content last changed (ISO 8601): when it was added, or when its hash last differed. Not when it was only touched. */
  changedAt: string;
}

export interface RetiredSource {
  path: string;
  movedTo: string;
  retiredAt: string;
  why: "wrong" | "replaced";
  reason: string;
  replacedBy?: string;
  entry?: SourceEntry;
}

export interface SourceManifest {
  version: 1;
  files: Record<string, SourceEntry>;
  retired: RetiredSource[];
}

/** Present in the folder; missing (in the manifest, deleted by hand); or retired with `retire_source`. */
export type SourceStatus = "present" | "missing" | "retired";

export interface SourceListing {
  path: string;
  status: SourceStatus;
  type: string;
  /** When its content last changed (ISO 8601), to compare with when something was built from it. */
  changedAt?: string;
  size?: number;
  pages?: number;
  slides?: number;
  origin?: SourceOrigin;
  replaces?: string;
  /** For a retired one: when, why, and what replaced it. */
  retiredAt?: string;
  why?: "wrong" | "replaced";
  replacedBy?: string;
}

const posix = (p: string): string => p.split(path.sep).join("/");

// The model can call several tools at once: everything that reads and writes a folder's
// manifest runs one at a time per folder, or a parallel call would lose another's entry.
const locks = new Map<string, Promise<unknown>>();
function serialized<T>(sourcesDir: string, work: () => Promise<T>): Promise<T> {
  const key = path.resolve(sourcesDir);
  const result = (locks.get(key) ?? Promise.resolve()).then(work, work);
  locks.set(key, result.catch(() => undefined));
  return result;
}
const now = (): string => new Date().toISOString();

export async function hashFile(file: string): Promise<string> {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

/** Resolves `candidate` against `base`; the absolute path only if it stays inside it. */
export function resolveWithin(base: string, candidate: string): string | undefined {
  const resolved = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(base, candidate);
  const relative = path.relative(base, resolved);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative)) ? resolved : undefined;
}

export async function loadManifest(sourcesDir: string): Promise<SourceManifest> {
  try {
    const parsed = JSON.parse(await readFile(path.join(sourcesDir, KIT_DIR, MANIFEST), "utf8")) as Partial<SourceManifest>;
    return { version: 1, files: parsed.files ?? {}, retired: parsed.retired ?? [] };
  } catch {
    return { version: 1, files: {}, retired: [] };
  }
}

export async function saveManifest(sourcesDir: string, manifest: SourceManifest): Promise<void> {
  await mkdir(path.join(sourcesDir, KIT_DIR), { recursive: true });
  await writeFile(path.join(sourcesDir, KIT_DIR, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}

/** Every original under `sourcesDir` (paths relative to it), leaving out hidden files and folders (the kit's own among them). */
export async function scanSources(sourcesDir: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) found.push(posix(path.relative(sourcesDir, full)));
    }
  }
  await walk(sourcesDir);
  return found.sort();
}

/**
 * An entry for `file`, reusing the recorded hash when its size and modification time haven't
 * changed; `changedAt` moves only when the content (its hash) did. Entries from before
 * `changedAt` existed take their `addedAt`.
 */
async function freshEntry(file: string, known: SourceEntry | undefined, origin: SourceOrigin): Promise<SourceEntry> {
  const info = await stat(file);
  const previous = known ? { ...known, changedAt: known.changedAt ?? known.addedAt } : undefined;
  if (previous && previous.size === info.size && previous.mtimeMs === info.mtimeMs) return previous;
  const hash = await hashFile(file);
  const stamp = now();
  const base = previous ?? { addedAt: stamp, origin, changedAt: stamp };
  return { ...base, hash, size: info.size, mtimeMs: info.mtimeMs, changedAt: previous && previous.hash === hash ? previous.changedAt : stamp };
}

/** Pages of a PDF, read from its page tree without a parser; undefined when it can't tell (e.g. compressed object streams). */
export function pdfPageCount(bytes: Buffer): number | undefined {
  const text = bytes.toString("latin1");
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  const reversed = [...text.matchAll(/\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)].map((m) => Number(m[1]));
  const fromTree = Math.max(0, ...counts, ...reversed);
  if (fromTree > 0) return fromTree;
  const pages = text.match(/\/Type\s*\/Page(?![s\w])/g)?.length ?? 0;
  return pages > 0 ? pages : undefined;
}

/** Slides of a PPTX, from the file names in the zip (stored uncompressed). */
export function pptxSlideCount(bytes: Buffer): number | undefined {
  const names = new Set(bytes.toString("latin1").match(/ppt\/slides\/slide\d+\.xml/g) ?? []);
  return names.size > 0 ? names.size : undefined;
}

const typeOf = (file: string): string => path.extname(file).slice(1).toLowerCase() || "file";

/**
 * Every original with its status and when its content last changed, recording in the manifest
 * the ones copied in by hand; then the missing ones and the retired ones.
 */
export function listSources(sourcesDir: string): Promise<SourceListing[]> {
  return serialized(sourcesDir, () => listSourcesNow(sourcesDir));
}

async function listSourcesNow(sourcesDir: string): Promise<SourceListing[]> {
  const manifest = await loadManifest(sourcesDir);
  const files = await scanSources(sourcesDir);
  const listing: SourceListing[] = [];
  for (const rel of files) {
    const full = path.join(sourcesDir, rel);
    const entry = await freshEntry(full, manifest.files[rel], { kind: "manual" });
    manifest.files[rel] = entry;
    const type = typeOf(rel);
    const counts =
      type === "pdf" || type === "pptx"
        ? await readFile(full).then((bytes) => (type === "pdf" ? { pages: pdfPageCount(bytes) } : { slides: pptxSlideCount(bytes) }))
        : {};
    listing.push({
      path: rel,
      status: "present",
      type,
      changedAt: entry.changedAt,
      size: entry.size,
      ...counts,
      origin: entry.origin,
      ...(entry.replaces ? { replaces: entry.replaces } : {}),
    });
  }
  for (const [rel, entry] of Object.entries(manifest.files)) {
    if (!files.includes(rel)) listing.push({ path: rel, status: "missing", type: typeOf(rel), origin: entry.origin });
  }
  for (const retired of manifest.retired) {
    listing.push({
      path: retired.path,
      status: "retired",
      type: typeOf(retired.path),
      retiredAt: retired.retiredAt,
      why: retired.why,
      ...(retired.replacedBy ? { replacedBy: retired.replacedBy } : {}),
    });
  }
  await saveManifest(sourcesDir, manifest);
  return listing;
}

export interface AddedSource {
  /** Where it is, relative to `sourcesDir`. */
  path: string;
  /** An identical file was already there: nothing was copied. */
  duplicateOf?: string;
}

/**
 * Adds `file` (an absolute path) to `sourcesDir` at `destination` (a folder: under `extra.name`,
 * or the file's own name): never overwriting, and
 * not at all if an identical file is already there (its path is returned). `replaces`
 * records it as a new version of an original already in the folder.
 */
export function addSource(
  sourcesDir: string,
  file: string,
  destination: string,
  origin: SourceOrigin,
  extra: { replaces?: string; derivedFrom?: string; name?: string } = {},
): Promise<AddedSource> {
  return serialized(sourcesDir, () => addSourceNow(sourcesDir, file, destination, origin, extra));
}

async function addSourceNow(
  sourcesDir: string,
  file: string,
  destination: string,
  origin: SourceOrigin,
  extra: { replaces?: string; derivedFrom?: string; name?: string },
): Promise<AddedSource> {
  // A folder ("books/", or one that exists) means: inside it, under the file's own name.
  const isFolder = /[/\\]$/.test(destination) || (await stat(path.join(sourcesDir, destination)).catch(() => null))?.isDirectory();
  if (isFolder) destination = path.join(destination, extra.name ?? path.basename(file));
  const target = resolveWithin(sourcesDir, destination);
  if (!target || posix(path.relative(sourcesDir, target)).split("/").some((part) => part.startsWith("."))) {
    throw new Error(`"${destination}" isn't a path inside sources/ (hidden folders are the kit's).`);
  }
  const manifest = await loadManifest(sourcesDir);
  if (extra.replaces) {
    const old = resolveWithin(sourcesDir, extra.replaces);
    if (!old || !(await stat(old).catch(() => null))) throw new Error(`"${extra.replaces}" isn't an original in sources/, so it can't be replaced.`);
  }
  const hash = await hashFile(file);
  for (const rel of await scanSources(sourcesDir)) {
    const entry = await freshEntry(path.join(sourcesDir, rel), manifest.files[rel], { kind: "manual" });
    manifest.files[rel] = entry;
    if (entry.hash === hash) {
      await saveManifest(sourcesDir, manifest);
      return { path: rel, duplicateOf: rel };
    }
  }
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await copyFile(file, target, constants.COPYFILE_EXCL);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`"${destination}" already exists in sources/: originals are never overwritten. Pick another name${extra.replaces ? "" : ", or pass `replaces` for a new version"}.`, {
        cause: error,
      });
    }
    throw error;
  }
  const rel = posix(path.relative(sourcesDir, target));
  const info = await stat(target);
  const stamp = now();
  manifest.files[rel] = {
    hash,
    size: info.size,
    mtimeMs: info.mtimeMs,
    addedAt: stamp,
    changedAt: stamp,
    origin,
    ...(extra.replaces ? { replaces: posix(path.relative(sourcesDir, resolveWithin(sourcesDir, extra.replaces)!)) } : {}),
    ...(extra.derivedFrom ? { derivedFrom: extra.derivedFrom } : {}),
  };
  await saveManifest(sourcesDir, manifest);
  return { path: rel };
}

/** Where a retired original went. */
export interface RetireResult {
  /** Relative to `sourcesDir`. */
  movedTo: string;
}

/**
 * Moves an original to `.agent-kit/retired/` (never deleted: the person empties that folder) and
 * records why. What was built from it (summary pages) is the knowledge base's to update: the
 * model does it with its tools.
 */
export function retireSource(sourcesDir: string, source: string, why: "wrong" | "replaced", reason: string, replacedBy?: string): Promise<RetireResult> {
  return serialized(sourcesDir, () => retireSourceNow(sourcesDir, source, why, reason, replacedBy));
}

async function retireSourceNow(sourcesDir: string, source: string, why: "wrong" | "replaced", reason: string, replacedBy?: string): Promise<RetireResult> {
  const full = resolveWithin(sourcesDir, source);
  if (!full || !(await stat(full).catch(() => null))?.isFile()) throw new Error(`"${source}" isn't an original in sources/.`);
  const rel = posix(path.relative(sourcesDir, full));
  if (rel.split("/").some((part) => part.startsWith("."))) throw new Error(`"${source}" is one of the kit's own files.`);
  const replacement = replacedBy ? resolveWithin(sourcesDir, replacedBy) : undefined;
  if (replacedBy && (!replacement || !(await stat(replacement).catch(() => null)))) throw new Error(`"${replacedBy}" isn't an original in sources/.`);

  const manifest = await loadManifest(sourcesDir);
  const stamp = now();
  const movedTo = posix(path.join(KIT_DIR, RETIRED_DIR, `${stamp.replace(/[:.]/g, "-")}-${path.basename(rel)}`));
  await mkdir(path.join(sourcesDir, KIT_DIR, RETIRED_DIR), { recursive: true });
  await rename(full, path.join(sourcesDir, movedTo));
  manifest.retired.push({
    path: rel,
    movedTo,
    retiredAt: stamp,
    why,
    reason,
    ...(replacement ? { replacedBy: posix(path.relative(sourcesDir, replacement)) } : {}),
    ...(manifest.files[rel] ? { entry: manifest.files[rel] } : {}),
  });
  delete manifest.files[rel];
  await saveManifest(sourcesDir, manifest);
  return { movedTo };
}

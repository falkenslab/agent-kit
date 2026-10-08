import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inKitRange } from "./externalExtensions.js";

/**
 * A marketplace plugin from an `npm` or `archive` source (#49), fetched into a temporary folder
 * for `addExtension()` to copy, hash and lock like any other: in the kit's own process, so a
 * packaged agent needs neither npm nor a `tar`. Nothing is ever run: an npm package's scripts
 * don't, and what's unpacked is only files, none outside the folder.
 *
 * - **npm**: the registry's metadata for the package, the version asked for (exact, a dist-tag,
 *   `latest` by default, or a range: `^`, `~`, comparators), its tarball checked against the
 *   registry's `integrity` (sha512), unpacked from its `package/` folder.
 * - **archive**: a zip over HTTPS, checked against its `sha256` when the marketplace gives one;
 *   the plugin is its root, or its only folder.
 *
 * Unpacking takes the optional `fflate` library, the same that opens PPTX and XLSX.
 */

type Fflate = { gunzipSync(data: Uint8Array): Uint8Array; unzipSync(data: Uint8Array): Record<string, Uint8Array> };

async function fflate(): Promise<Fflate> {
  try {
    return (await import("fflate")) as Fflate;
  } catch (error) {
    throw new Error('Installing from an npm or archive source needs the optional "fflate" library: npm install fflate', { cause: error });
  }
}

async function download(url: string): Promise<Uint8Array> {
  if (!url.startsWith("https://")) throw new Error(`Only https downloads: ${url}.`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}.`);
  return new Uint8Array(await response.arrayBuffer());
}

/** Files into `dir`, each at its relative path; one that would land outside it is refused. */
async function writeFiles(dir: string, files: Iterable<[string, Uint8Array]>): Promise<void> {
  const root = path.resolve(dir);
  for (const [name, data] of files) {
    const target = path.resolve(root, name);
    if (!target.startsWith(`${root}${path.sep}`) || name.split(/[\\/]/).includes("..")) throw new Error(`The download has a file outside its folder: ${name}.`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }
}

/** The regular files of a tar archive, by path (ustar, with pax and GNU long names). */
export function untar(tar: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  const text = (from: number, length: number) => new TextDecoder().decode(tar.subarray(from, from + length)).replace(/\0.*$/s, "");
  let offset = 0;
  let longName: string | undefined;
  while (offset + 512 <= tar.length) {
    const name = text(offset, 100);
    if (!name) break; // the two empty blocks at the end
    const size = parseInt(text(offset + 124, 12).trim() || "0", 8);
    const type = text(offset + 156, 1);
    const prefix = text(offset + 345, 155);
    const body = tar.subarray(offset + 512, offset + 512 + size);
    if (type === "x") {
      longName = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(new TextDecoder().decode(body))?.[1] ?? longName;
    } else if (type === "L") {
      longName = new TextDecoder().decode(body).replace(/\0.*$/s, "");
    } else {
      if (type === "0" || type === "" || type === "7") files.set(longName ?? (prefix ? `${prefix}/${name}` : name), body);
      longName = undefined;
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

/** The highest of `versions` that `wanted` asks for: an exact version, or a range (`^`, `~`, comparators, `*`). */
export function pickVersion(versions: readonly string[], wanted: string): string | undefined {
  const range = wanted.trim();
  if (versions.includes(range)) return range;
  const comparators = range.split(/\s+/).flatMap((part): string[] => {
    if (part === "*" || part === "x" || part === "") return [];
    const caret = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(part);
    if (caret) {
      const [major, minor, patch] = caret.slice(1).map(Number) as [number, number, number];
      const upper = major > 0 ? `${major + 1}.0.0` : minor > 0 ? `0.${minor + 1}.0` : `0.0.${patch + 1}`;
      return [`>=${major}.${minor}.${patch}`, `<${upper}`];
    }
    const tilde = /^~(\d+)\.(\d+)\.(\d+)$/.exec(part);
    if (tilde) return [`>=${tilde[1]}.${tilde[2]}.${tilde[3]}`, `<${tilde[1]}.${Number(tilde[2]) + 1}.0`];
    return [part];
  });
  const stable = versions.filter((version) => /^\d+\.\d+\.\d+$/.test(version));
  const matching = stable.filter((version) => !comparators.length || inKitRange(version, comparators.join(" ")));
  const order = (version: string) => version.split(".").map(Number);
  return matching.sort((a, b) => {
    const [x, y] = [order(a), order(b)];
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
    return 0;
  }).at(-1);
}

/** An npm package into a new temporary folder: `{ dir, version }`. */
export async function fetchNpmPlugin(name: string, wanted = "latest", registry = "https://registry.npmjs.org"): Promise<{ dir: string; version: string }> {
  if (!/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i.test(name)) throw new Error(`"${name}" isn't an npm package name.`);
  const response = await fetch(`${registry.replace(/\/+$/, "")}/${name.replace("/", "%2f")}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`The registry has no package ${name} (${response.status}).`);
  const metadata = (await response.json()) as { "dist-tags"?: Record<string, string>; versions?: Record<string, { dist?: { tarball?: string; integrity?: string } }> };
  const version = metadata["dist-tags"]?.[wanted] ?? pickVersion(Object.keys(metadata.versions ?? {}), wanted);
  const dist = version ? metadata.versions?.[version]?.dist : undefined;
  if (!version || !dist?.tarball) throw new Error(`${name} has no version ${wanted}.`);
  const tarball = await download(dist.tarball);
  const sri = /^sha512-(.+)$/.exec(dist.integrity ?? "");
  if (!sri) throw new Error(`${name}@${version} has no sha512 integrity to check it against.`);
  if (createHash("sha512").update(tarball).digest("base64") !== sri[1]) throw new Error(`${name}@${version}'s download doesn't match its integrity.`);
  const { gunzipSync } = await fflate();
  const dir = await mkdtemp(path.join(os.tmpdir(), "agent-kit-npm-"));
  try {
    // npm puts a package's files under package/.
    const files = [...untar(gunzipSync(tarball))].flatMap(([file, data]): [string, Uint8Array][] => (file.startsWith("package/") ? [[file.slice("package/".length), data]] : []));
    await writeFiles(dir, files);
    return { dir, version };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

/** A zip archive into a new temporary folder; the plugin is its root, or its only folder. */
export async function fetchArchivePlugin(url: string, sha256?: string): Promise<{ dir: string; root: string }> {
  const zip = await download(url);
  if (sha256 && createHash("sha256").update(zip).digest("hex") !== sha256.toLowerCase()) throw new Error(`${url} doesn't match its sha256.`);
  const { unzipSync } = await fflate();
  const files = Object.entries(unzipSync(zip)).filter(([name]) => !name.endsWith("/"));
  const dir = await mkdtemp(path.join(os.tmpdir(), "agent-kit-archive-"));
  try {
    await writeFiles(dir, files);
    const tops = new Set(files.map(([name]) => name.split("/")[0]!));
    const only = tops.size === 1 && files.every(([name]) => name.includes("/")) ? [...tops][0]! : "";
    return { dir, root: path.join(dir, only) };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

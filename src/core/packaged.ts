import { existsSync } from "node:fs";
import { createRequire } from "node:module";

/**
 * Running packaged in an archive (Electron's `app.asar`, ADR-026, #42). Electron reads files
 * inside the archive for its own process, but another process can't: not the Claude Code CLI
 * reading a plugin, not the binary itself. So every path the kit hands to another process goes
 * through `outsideArchive()`, which points it at the copy the build unpacked (`asarUnpack`).
 */

const ARCHIVE = /([\\/])app\.asar([\\/])/;

/** A path inside `…/app.asar/…`, as the unpacked copy next to it (`…/app.asar.unpacked/…`); any other path as it is. */
export function outsideArchive(file: string): string {
  return file.replace(ARCHIVE, "$1app.asar.unpacked$2");
}

/**
 * The module requests that name the SDK's CLI binary on this platform, in the SDK's order:
 * `@anthropic-ai/claude-agent-sdk-<platform>-<arch>/claude[.exe]`, both libcs on Linux (musl
 * first when the system runs on it, as the SDK decides).
 */
export function claudeBinaryRequests(platform: NodeJS.Platform = process.platform, arch: string = process.arch, musl: boolean = platform === "linux" && runsOnMusl()): string[] {
  const packages = platform === "linux" ? (musl ? [`linux-${arch}-musl`, `linux-${arch}`] : [`linux-${arch}`, `linux-${arch}-musl`]) : [`${platform}-${arch}`];
  return packages.map((suffix) => `@anthropic-ai/claude-agent-sdk-${suffix}/claude${platform === "win32" ? ".exe" : ""}`);
}

/** A Linux whose C library is musl (Alpine): Node's report names no glibc version there. */
function runsOnMusl(): boolean {
  if (process.platform !== "linux") return false;
  const report = process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined;
  return Boolean(report?.header) && report?.header?.glibcVersionRuntime === undefined;
}

/**
 * The SDK's CLI binary unpacked next to the archive, when the kit runs packaged: the SDK would
 * resolve it inside `app.asar`, where it can't be executed, and its first turn would hang with
 * no error (confirmed empirically). Looked up as the SDK does (`@anthropic-ai/claude-agent-sdk-
 * <platform>-<arch>`, either libc on Linux), with `resolve` replaceable for tests. `undefined`
 * when not packaged, or when the build didn't unpack it: then the SDK finds its own.
 */
export function unpackedClaudeExecutable(
  resolve: (request: string) => string = createRequire(import.meta.url).resolve,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string | undefined {
  for (const request of claudeBinaryRequests(platform, arch)) {
    let file: string;
    try {
      file = resolve(request);
    } catch {
      continue;
    }
    if (!ARCHIVE.test(file)) return undefined;
    const unpacked = outsideArchive(file);
    if (existsSync(unpacked)) return unpacked;
  }
  return undefined;
}

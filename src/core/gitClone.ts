import { execFile } from "node:child_process";
import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

const exec = promisify(execFile);

/**
 * Clones a git repository into `dir` (#89), without the `git` program: an extension or a
 * marketplace from GitHub installs on a computer without Git, as in a desktop app on a clean
 * Windows. Over HTTP(S) with isomorphic-git (pure JavaScript: Node and Electron); a `file://`
 * repository is read where it is and its files written out, never changed; SSH (`git@…`,
 * `ssh://`, `git://`), which isomorphic-git can't speak, goes to the system's `git` when there is
 * one. `ref` is a branch or a tag (the default branch without it); `sha` pins a commit, which must
 * be on that branch's history. Returns the commit checked out. `dir` keeps no `.git`.
 */
export async function cloneRepository(url: string, dir: string, options: { ref?: string; sha?: string } = {}): Promise<string> {
  try {
    if (/^(git@|ssh:\/\/|git:\/\/)/.test(url)) return await cloneWithGitProgram(url, dir, options);
    if (/^https?:\/\//.test(url)) return await cloneOverHttp(url, dir, options);
    // A local repository: a file:// URL, or a path (one ending in .git, perhaps bare).
    return await exportLocal(url.startsWith("file://") ? fileURLToPath(url) : path.resolve(url), dir, options);
  } catch (error) {
    throw new Error(explain(url, options, error), { cause: error });
  }
}

/** Over HTTP(S): the tip of a branch or tag in one shallow fetch, or its history when a commit is pinned. */
async function cloneOverHttp(url: string, dir: string, { ref, sha }: { ref?: string; sha?: string }): Promise<string> {
  await git.clone({ fs, http, dir, url, ...(ref ? { ref } : {}), singleBranch: true, ...(sha ? {} : { depth: 1 }), noTags: !ref });
  if (sha) await git.checkout({ fs, dir, ref: await expandCommit(path.join(dir, ".git"), sha), force: true });
  const commit = await git.resolveRef({ fs, dir, ref: "HEAD" });
  await fs.promises.rm(path.join(dir, ".git"), { recursive: true, force: true });
  return commit;
}

/** A local repository: the commit's files written into `dir`, the repository itself untouched (no checkout, no index). */
async function exportLocal(repo: string, dir: string, { ref, sha }: { ref?: string; sha?: string }): Promise<string> {
  // A working copy's .git, or the repository itself when it's bare.
  const gitdir = fs.existsSync(path.join(repo, ".git")) ? path.join(repo, ".git") : repo;
  const commit = sha ? await expandCommit(gitdir, sha) : await git.resolveRef({ fs, gitdir, ref: ref ?? "HEAD" });
  const { commit: { tree } } = await git.readCommit({ fs, gitdir, oid: commit });
  await git.walk({
    fs,
    gitdir,
    trees: [git.TREE({ ref: tree })],
    map: async (filepath, [entry]) => {
      if (!entry || filepath === ".") return true;
      const type = await entry.type();
      const target = path.join(dir, filepath);
      if (type === "tree") await mkdir(target, { recursive: true });
      else if (type === "blob") {
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, (await entry.content()) ?? new Uint8Array());
      }
      return true;
    },
  });
  return commit;
}

/** A commit given whole or abbreviated, as git takes it: the whole id, or an error when there's no such commit. */
async function expandCommit(gitdir: string, sha: string): Promise<string> {
  const oid = sha.length === 40 ? sha.toLowerCase() : await git.expandOid({ fs, gitdir, oid: sha.toLowerCase() });
  await git.readCommit({ fs, gitdir, oid });
  return oid;
}

/** SSH, which isomorphic-git can't speak: the system's `git`, or a clear error without one. */
async function cloneWithGitProgram(url: string, dir: string, { ref, sha }: { ref?: string; sha?: string }): Promise<string> {
  try {
    await exec("git", ["clone", ...(sha ? [] : ["--depth", "1"]), ...(ref ? ["--branch", ref] : []), url, dir]);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw Object.assign(new Error("no git"), { code: "NoGitForSsh" });
    throw error;
  }
  if (sha) await exec("git", ["-C", dir, "checkout", "--quiet", sha]);
  const commit = (await exec("git", ["-C", dir, "rev-parse", "HEAD"])).stdout.trim();
  await fs.promises.rm(path.join(dir, ".git"), { recursive: true, force: true });
  return commit;
}

/** What went wrong, for a person: which repository, and whether it's the network, the repository, the ref or the commit. */
function explain(url: string, { ref, sha }: { ref?: string; sha?: string }, error: unknown): string {
  const code = (error as { code?: string }).code ?? "";
  const status = (error as { data?: { statusCode?: number } }).data?.statusCode;
  let host = url;
  try {
    host = new URL(url).host || url;
  } catch {
    // Not a URL (git@host:…): the address as given.
  }
  if (code === "NoGitForSsh") return `${url} is an SSH address, which needs the git program, and this computer has none: use its HTTPS address instead.`;
  if (code === "HttpError" && (status === 401 || status === 403 || status === 404)) return `${url} isn't a repository this computer can reach: it doesn't exist, or it's private.`;
  if (code === "HttpError") return `${host} answered with an error (${status ?? "?"}) for ${url}.`;
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"].includes(code)) return `Couldn't reach ${host} for ${url}: check the network.`;
  if (code === "NotFoundError" || code === "AmbiguousError") {
    if (sha) return `${url} has no commit ${sha}${ref ? ` on ${ref}` : ""}.`;
    if (ref) return `${url} has no branch or tag ${ref}.`;
  }
  if (code === "NotFoundError" && !/^https?:\/\//.test(url)) return `${url} isn't a git repository.`;
  return `Couldn't get ${url}${ref ? ` at ${ref}` : ""}: ${error instanceof Error ? error.message : String(error)}`;
}

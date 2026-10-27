# Install extensions and marketplaces from git without a git program

Issue: [#89](https://github.com/falkenslab/agent-kit/issues/89)

## Goal

Installing an extension, adding a marketplace or updating one from a git repository works on a computer without Git, as in a desktop app on a clean Windows, with the same commit and hash as today.

## Context

- The kit runs the system's `git`: `clone [--depth 1] [--branch ref]`, `checkout <sha>` and `rev-parse HEAD` in `addExtension()` (`src/core/externalExtensions.ts`), `clone --depth 1` and `rev-parse HEAD` in `src/core/marketplaces.ts`.
- Without Git the error is `spawn git ENOENT`. miyagi's Electron installer (falkenslab/miyagi#48) runs on Windows with no Node and no Git: npx servers already work there (the kit fetches packages itself, #54), but moodle-teacher can't be installed from falkenslab/agent-extensions.
- Claude Code has the same limit (it clones GitHub marketplaces with the system's git).
- isomorphic-git is pure JavaScript (Node and Electron), clones over HTTP(S), with shallow clones and refs; no SSH.

## Changes

- Replace the `git` program with isomorphic-git (a dependency of the kit), always, so the terminal and the app behave the same:
  - `clone --depth 1 [--branch ref]` → `clone({ depth: 1, singleBranch: true, ref })`;
  - a pinned `sha` → fetch that commit and `checkout({ ref: sha })`; a full fetch where the server doesn't allow fetching a commit by id (check GitHub);
  - `rev-parse HEAD` → `resolveRef({ ref: "HEAD" })`, the commit the lock keeps.
- `github:`, `owner/repo` and `git-subdir` sources as today.
- Errors a person understands: which repository, and whether it was the network, a missing repository or ref, or a commit that isn't there.
- SSH URLs (`git@…`, `ssh://`): the system's `git` for them, or a clear error saying to use HTTPS when it isn't there.
- The system proxy (`HTTPS_PROXY`) respected.
- ADR-025 (repositories and trust) updated; docs (English and Spanish): Installing, Developing (no Git needed).

## Acceptance

- With no `git` on `PATH`, `extension add` from a GitHub marketplace and `marketplace add owner/repo` work, and `extension update` and the integrity check see the same commit and hash as before.
- Tests: a fixture repository (a local `file://` or an HTTP fixture) cloned at a branch, a tag and a pinned sha, with no `git` on `PATH`; the lock's commit and the hash unchanged.
- `verify` passes.

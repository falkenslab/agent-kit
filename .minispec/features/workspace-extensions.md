# Workspace extensions: a lock that travels, restore and trust

Issue: [#57](https://github.com/falkenslab/agent-kit/issues/57)

## Goal

A workspace received from someone else (cloned, downloaded) says which extensions it uses and at which version, gets them with one command, and runs none of them until the person trusts it.

## Context

- The project's scope (`extensionDirs.project`) keeps a full copy of each extension in the project (`<projectDir>/extensions/<name>/`), with its lock and data (`.data/`). Copied with the project, that code runs as soon as a session opens: the lock's hash proves nothing, it comes with the same files.
- A copy in the project is heavy (moodle-mcp with `playwright-core`, 18 MB), tied to a platform when it has native files, and `.data/` holds browser profiles and cookies that end up in git.
- The lock already records where each extension came from; a git source pinned to a commit, a marketplace plugin or an npm package (npx-servers.md) can be fetched again elsewhere; a local folder or a `--link` can't.

## Changes

- The project's scope keeps only its lock (`extensions.lock.json`: source, version or commit, hash, enabled, options without secrets); the code goes to the agent's cache by version (`<agent scope>/.store/<name>@<version-or-sha>/`), shared by every workspace, and each session mounts it from there, as it mounts any extension now. Data (`.data/`) leaves the project: per workspace, under the agent's folder.
- `extension restore` installs what the project's lock lists and the cache lacks, checking each hash; an entry from a folder or a link can't be restored and says so. A session with entries missing opens without them, saying to run `restore`; never a download in the session.
- Trust: a project's extensions don't run until the person trusts that workspace, recorded outside it (the agent's folder) with the hash of its lock; a changed lock (a new extension, another version) asks again. The terminal and the chats ask when the session opens; `extension trust` and `--trust` for scripts.
- Docs: `capabilities/extensions.md` (scopes, sharing a workspace, trust), `security/` pages, ADR-025.

## Acceptance

- A workspace copied to another folder (or machine) with its lock and no code opens with its extensions off and the reason; after `restore`, and trusting it, they run.
- Changing its lock (another version) asks for trust again; the agent's own scope never asks.
- Two workspaces locking the same version share one copy in the cache.
- No extension file or data is left inside the project.
- `verify` passes.

# ADR-012: Distributed from git tags, not npm

> Superseded by ADR-017: the kit is now published to npm.

## Decision

The kit is not published to npm (`private: true`). Each release is a git tag; consumers depend on it by tag (git dependency) or on an `npm pack` tarball of the tag attached to their own release.

## Motivation

The API is still 0.x and has few consumers. A git dependency works for developers cloning a consumer, but breaks an end user's `npm install -g` of it (npm can't find `tsc` while running `prepare`); bundling the kit into a consumer drags in the SDK's platform-specific binary (245 MB of Windows-only `claude.exe`). A built tarball has `dist/` and skips `prepare`.

## Consequences

`prepare` builds on install for git dependencies; tarball consumers deny it in `allowScripts`. A consumer that ships to end users (teacher-agent) uses the tarball; one that doesn't yet (student-agent) can use the git tag. Publishing to npm would replace all of this once the API settles.

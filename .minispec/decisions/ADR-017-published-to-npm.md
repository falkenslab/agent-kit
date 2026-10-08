# ADR-017: Published to npm

## Decision

The kit is published to the public npm registry as `@falkenslab/agent-kit`, under the MIT license. Every release (`release` skill) is a git tag, a GitHub release and an `npm publish` of the same version. Supersedes ADR-012.

## Motivation

The git-tag distribution (ADR-012) needed workarounds: a git dependency builds on install and fails in an end user's `npm install -g` of an agent (no `tsc`), so an agent shipping to end users attached an `npm pack` tarball of the kit to its own release. A registry package carries its built `dist/`, installs with a plain `npm install`, and resolves version ranges like any dependency.

## Consequences

- `prepublishOnly` runs typecheck, lint, tests and the build, so a broken or unbuilt version can't be published; `prepare` stays for anyone still depending on a git tag.
- The published files are `dist/`, `assets/`, `extensions/`, the README, the license and `package.json` (`files`), nothing of `src/`, tests or `.minispec/`.
- A published version can't be reused: a bad release is fixed with a new patch version, never by republishing.
- Versions up to 0.10.0 exist only as git tags.
- Every GitHub release carries Captain Whiskers' Windows installer (decided 8 October 2026), so anyone can try the kit without cloning or building: built from the release commit (so it carries the kit just tagged) and attached as `Captain-Whiskers-Setup-<version>.exe`. The captain has his own version, from 0.1.0 in his `package.json` (his installer's too, copied in by his build), bumped by the same rules only when he changed. Windows only (macOS and Linux need building on them, a CI matrix later) and unsigned (SmartScreen warns; signing needs a code-signing certificate). A fix of the captain alone means a new kit release, until he gets tags of his own.
- Publishing needs an npm account in the `falkenslab` organization, logged in on the machine; with two-factor authentication the release asks for the one-time code.

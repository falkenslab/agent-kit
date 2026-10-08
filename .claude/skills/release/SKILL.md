---
name: release
description: Cut a new agent-kit release - decide the semver bump (patch vs minor) from the commits since the last tag, bump version files (the kit's and Captain Whiskers'), commit, tag, push, create the GitHub release with Captain Whiskers' Windows installer attached, and publish to npm. Only when the user explicitly asks to release or publish.
disable-model-invocation: true
---

# Release agent-kit

A release is a version commit, a `vX.Y.Z` git tag on `main`, a GitHub release with Captain Whiskers' Windows installer attached, and the same version published to npm as `@falkenslab/agent-kit` (ADR-017). Users install it with `npm install @falkenslab/agent-kit`.

## 1. Preconditions

- On branch `main`, working tree clean (`git status --short` empty), up to date with `origin/main` (`git fetch && git status -sb`). If there are uncommitted changes, stop and ask (or use the `commit` skill first if the user wants them included).
- Run the `verify` skill; a release must be green.
- `gh auth status` works.
- `npm whoami` works (logged in to npm with an account in the `falkenslab` organization). If it doesn't, stop and ask the user to run `npm login` themselves: it's interactive.
- **The documentation is up to date.** Every change since the last tag that an agent built on the kit would notice (a new option, export, behavior, default, breaking change) must be reflected in the guides under `docs/content/`, not only in the release notes. Read `git log <last tag>..HEAD` and `git diff <last tag>..HEAD -- src/index.ts src/core src/tui`, check the matching pages (see `docs/sidebars.ts` for the map), and update them before going on; commit them with the `commit` skill (`docs(site): ...`). The API reference regenerates itself from the doc comments; make sure new exports have one.

## 2. Decide the bump

Find the last tag: `git describe --tags --abbrev=0`. Read `git log <tag>..HEAD --format=%s`.

While the version is `0.x` (current policy):
- **minor** (`0.1.1 -> 0.2.0`): any `feat`, or any breaking change (`!` in a subject / `BREAKING` in a body). In `0.x`, breaking changes bump minor, not major.
- **patch** (`0.1.0 -> 0.1.1`): only `fix`, `docs`, `refactor`, `chore`, `build`, `test` with no API change.
- **major**: only when the user decides to declare `1.0.0`. After `1.0.0`: breaking = major, feature = minor, fix = patch.

If nothing but `docs`/`chore` changed since the last tag, tell the user a release may not be worthwhile and confirm before continuing. State the chosen bump and why; if it is ambiguous, ask.

### Captain Whiskers' version

The captain has his own version, in `examples/captain-whiskers/package.json` (the one he says he is, and his installer's: `npm run build` copies it into `desktop/package.json`). Read `git diff <tag>..HEAD --stat -- examples/captain-whiskers` and bump it by the same rules: minor for a feature or a breaking change of his, patch for fixes only. If he didn't change, keep his version: the installer is built again anyway, since the kit inside it is new. State both versions.

## 3. Bump

```
npm version <patch|minor|major> --no-git-tag-version
```

This updates `package.json` and `package-lock.json`. If the captain's version goes up, the same in his folder: `(cd examples/captain-whiskers && npm version <patch|minor> --no-git-tag-version)`. The README installs with a plain `npm install @falkenslab/agent-kit` and names no version; still, `grep -n "<old version>" README.md` in case one slipped in.

Then snapshot the documentation for this version (the site shows the latest version by default, and keeps each release's documentation):

```
npm run docs:version -- X.Y.Z
npm run docs:build
```

This copies `docs/content/` (the generated API reference included) to `docs/versioned_docs/version-X.Y.Z/` and adds the version to `docs/versions.json`; it becomes the default at `/docs`, and `main` moves to `/docs/next`. The build must pass.

## 3b. Notes

Draft the release notes in English from the commits since the last tag, grouped as: new features, fixes, breaking changes (with migration hints), internal. Only include what matters to a consumer of the kit.

## 4. Commit, tag, push

```
git add package.json package-lock.json README.md docs/versioned_docs docs/versioned_sidebars docs/versions.json examples/captain-whiskers/package.json examples/captain-whiskers/package-lock.json examples/captain-whiskers/desktop/package.json
git commit -m "chore(release): vX.Y.Z"   # plus the attribution trailer required by the session
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --title "vX.Y.Z" --notes "<notes>"
npm publish
```

`npm publish` runs `prepublishOnly` (typecheck, lint, tests, build) first and publishes with public access (`publishConfig`). If the account has two-factor authentication, it asks for a one-time code: ask the user for it and run `npm publish --otp=<code>`. A published version can't be reused; if something is wrong after publishing, fix it with a new patch release.

## 4b. Captain Whiskers' installer

Built from the release commit, so it carries exactly the kit just tagged (`npm run build` packs the kit from the repository), then attached to the release. Windows only for now, and unsigned (ADR-017).

```
cd examples/captain-whiskers/desktop
npm run build                 # the kit packed and installed, the captain compiled, his version copied in
npm run dist                  # dist/Captain Whiskers Setup.exe and dist/win-unpacked/
```

- Unset `ELECTRON_RUN_AS_NODE` for both (VS Code's terminal sets it). If `electron-builder` fails with "No JSON content found in output", a `PATH` entry points at an npm that no longer exists (a stale `nvm4w`): run it with that entry removed.
- Check before uploading: `dist/win-unpacked/resources/app.asar.unpacked/node_modules/@anthropic-ai/claude-agent-sdk-win32-x64/claude.exe` exists, `.../node_modules/@falkenslab/agent-kit/package.json` says the new kit version, and `desktop/package.json` says the captain's.
- Upload it with the captain's version in its name (installed, it's "Captain Whiskers" alone): copy it to the session scratchpad as `Captain-Whiskers-Setup-<captain version>.exe`, then `gh release upload vX.Y.Z <that file>`.
- The notes say which captain it is, how it's run and its caveats: "Captain Whiskers <version>, the example agent built on agent-kit X.Y.Z, as a Windows app: download the installer. It's unsigned, so SmartScreen warns about it; it asks for a Claude key on first start and keeps everything in `~/.captain-whiskers`."
- `git status` afterwards: the build leaves nothing tracked changed but, possibly, `desktop/package.json`'s version (commit it if so).

Tags in this repo are lightweight (`git tag vX.Y.Z`). Never move or delete an existing tag, and never force-push. If a step fails half-way, report the exact state (what is pushed, what is not) instead of retrying blindly.

## 5. Verify the release

- `git ls-remote --tags origin` shows the tag on the release commit.
- `gh release view vX.Y.Z` works and lists `Captain-Whiskers-Setup-<captain version>.exe` among its assets.
- `npm view @falkenslab/agent-kit version` shows the new version.
- The documentation workflow ran for the release commit (`gh run list --workflow docs.yml --limit 1`) and https://falkenslab.github.io/agent-kit/docs shows the new version in the version selector.
- Optionally prove the install path in a scratch directory (use the session scratchpad, not the repo): `npm install @falkenslab/agent-kit@X.Y.Z` and check `node_modules/@falkenslab/agent-kit/dist/index.js` exists.

Report the version, the captain's version, the tag, the release URL (and the installer's download URL), the npm package page and the notes you published. Mention that consumers pinned to an older tag must bump their dependency themselves.

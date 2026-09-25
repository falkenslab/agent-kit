---
name: release
description: Cut a new agent-kit release - decide the semver bump (patch vs minor) from the commits since the last tag, bump version files, commit, tag, push and create the GitHub release. Only when the user explicitly asks to release or publish.
disable-model-invocation: true
---

# Release agent-kit

The package is `private` and not on npm: a "release" is a version commit, a `vX.Y.Z` git tag on `main`, and a GitHub release. Consumers install it with `git+https://github.com/falkenslab/agent-kit.git#vX.Y.Z` (npm runs the `prepare` script and builds `dist/`).

## 1. Preconditions

- On branch `main`, working tree clean (`git status --short` empty), up to date with `origin/main` (`git fetch && git status -sb`). If there are uncommitted changes, stop and ask (or use the `commit` skill first if the user wants them included).
- Run the `verify` skill; a release must be green.
- `gh auth status` works.

## 2. Decide the bump

Find the last tag: `git describe --tags --abbrev=0`. Read `git log <tag>..HEAD --format=%s`.

While the version is `0.x` (current policy):
- **minor** (`0.1.1 -> 0.2.0`): any `feat`, or any breaking change (`!` in a subject / `BREAKING` in a body). In `0.x`, breaking changes bump minor, not major.
- **patch** (`0.1.0 -> 0.1.1`): only `fix`, `docs`, `refactor`, `chore`, `build`, `test` with no API change.
- **major**: only when the user decides to declare `1.0.0`. After `1.0.0`: breaking = major, feature = minor, fix = patch.

If nothing but `docs`/`chore` changed since the last tag, tell the user a release may not be worthwhile and confirm before continuing. State the chosen bump and why; if it is ambiguous, ask.

## 3. Bump

```
npm version <patch|minor|major> --no-git-tag-version
```

This updates `package.json` and `package-lock.json`. Then update every user-facing occurrence of the old version in `README.md` (the install snippet `#vX.Y.Z` and the `allowScripts` entry `@falkenslab/agent-kit@X.Y.Z`): `grep -n "<old version>" README.md`. On a **minor** bump also update the `#semver:^0.N.0` range example so it still covers the new version (`^0.1.0` does not match `0.2.x`).

## 3b. Notes

Draft the release notes in Spanish from the commits since the last tag, grouped as: new features, fixes, breaking changes (with migration hints), internal. Only include what matters to a consumer of the kit.

## 4. Commit, tag, push

```
git add package.json package-lock.json README.md
git commit -m "chore(release): vX.Y.Z"   # plus the attribution trailer required by the session
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --title "vX.Y.Z" --notes "<notes>"
```

Tags in this repo are lightweight (`git tag vX.Y.Z`). Never move or delete an existing tag, and never force-push. If a step fails half-way, report the exact state (what is pushed, what is not) instead of retrying blindly.

## 5. Verify the release

- `git ls-remote --tags origin` shows the tag on the release commit.
- `gh release view vX.Y.Z` works.
- Optionally prove the install path in a scratch directory (use the session scratchpad, not the repo): `npm install "git+https://github.com/falkenslab/agent-kit.git#vX.Y.Z"` and check `node_modules/@falkenslab/agent-kit/dist/index.js` exists.

Report the version, the tag, the release URL and the notes you published. Mention that consumers pinned to an older tag must bump their dependency themselves.

---
name: verify
description: Run the full quality gate for agent-kit (typecheck, lint, tests, build, the captain-whiskers example, and the documentation site) and report the result. Use before committing, before a release, and after any change under src/, test/ or docs/.
---

# Verify agent-kit

Run from the repo root, in this order, stopping at the first failure and reporting it:

```
npm run typecheck
npm run lint
npm test
npm run build
(cd examples/captain-whiskers && npm run typecheck)
npm run docs:build
```

Notes:
- `npm test` must report `fail 0`. Quote the pass/fail counts in your report.
- `dist/` is gitignored and `tsc` never deletes stale output. If files were moved or removed under `src/`, run `rm -rf dist` before `npm run build`, otherwise orphaned `.js`/`.d.ts` files linger and hide broken imports.
- The example is a standalone project that imports from the package root (`dist/`), so it only sees the kit after `npm run build`. If its `node_modules` is missing, run `npm install` inside `examples/captain-whiskers` first.
- Root `eslint` deliberately ignores `examples/` and `docs/`.
- `npm run docs:build` builds the documentation site (`docs/`, Docusaurus) and fails on a broken link or anchor; its API reference is generated from `src/`'s doc comments, so it also catches a doc comment that breaks the site. If `docs/node_modules` is missing, run `npm run docs:install` first. Run it whenever `docs/` or anything exported from `src/index.ts` changed; skip it (and say so) only for changes that touch neither.
- Every public export should have a doc comment: an undocumented one shows as "-" in the API reference (`grep -E "\| - \|$" docs/content/api/index.md` after a build lists them).
- Never "fix" a failure by weakening a rule, skipping a test or adding `any`. Find the cause; if the fix is out of scope, report it instead.

Report only: what ran, pass/fail per step, and the exact error for any failure.

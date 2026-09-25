---
name: verify
description: Run the full quality gate for agent-kit (typecheck, lint, tests, build, and the captain-whiskers example) and report the result. Use before committing, before a release, and after any change under src/ or test/.
---

# Verify agent-kit

Run from the repo root, in this order, stopping at the first failure and reporting it:

```
npm run typecheck
npm run lint
npm test
npm run build
(cd examples/captain-whiskers && npm run typecheck)
```

Notes:
- `npm test` must report `fail 0`. Quote the pass/fail counts in your report.
- `dist/` is gitignored and `tsc` never deletes stale output. If files were moved or removed under `src/`, run `rm -rf dist` before `npm run build`, otherwise orphaned `.js`/`.d.ts` files linger and hide broken imports.
- The example is a standalone project that imports from the package root (`dist/`), so it only sees the kit after `npm run build`. If its `node_modules` is missing, run `npm install` inside `examples/captain-whiskers` first.
- Root `eslint` deliberately ignores `examples/`.
- Never "fix" a failure by weakening a rule, skipping a test or adding `any`. Find the cause; if the fix is out of scope, report it instead.

Report only: what ran, pass/fail per step, and the exact error for any failure.

---
name: check-consumers
description: After changing agent-kit's public API or behavior, rebuild dist/ and check that the projects that consume the kit still typecheck (examples/captain-whiskers and the sibling ../student-agent). Use after any change to src/, especially exports, types, or option shapes.
---

# Check the kit's consumers

Consumers import only from the package root, which resolves to the compiled `dist/`. A change in `src/` is invisible to them until the kit is rebuilt.

## 1. Rebuild the kit

```
rm -rf dist && npm run build
```

`tsc` never removes stale output, so clean first whenever files were moved, renamed or deleted.

## 2. Typecheck each consumer

| Consumer | Location | Dependency on the kit | Command |
|---|---|---|---|
| captain-whiskers | `examples/captain-whiskers` | `file:../..` (symlink) | `npm run typecheck` |
| student-agent | `../student-agent` (sibling repo, may not exist on this machine) | `file:../agent-kit` (symlink) or a git tag | `npm run typecheck && npm run lint` |

- Skip a consumer whose directory does not exist and say so.
- If a consumer's `node_modules` is missing, run `npm install` there first.
- If student-agent depends on a git tag (`git+https://...#vX.Y.Z`) instead of `file:`, it will not see local changes: report that it was not actually exercised, do not claim it passed.

## 3. Interpret failures

A consumer failing after a kit change means one of:
- an intentional breaking change: fix the consumer, and make sure the change is marked as breaking (`!`) in its commit and covered in the release notes;
- an unintentional API regression: fix it in the kit, not by patching the consumer.

Consumers are separate projects with their own git history: do not commit their changes as part of a kit commit. Report what needs changing there, or make the change only if the user asked.

Report per consumer: checked or skipped, pass/fail, and exact errors.

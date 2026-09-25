---
name: commit
description: Create smart, atomic commits for agent-kit following the repo's conventions (Conventional Commits, Spanish messages, grouped by logical change). Use whenever the user asks to commit, or when finishing a piece of work that should be committed.
---

# Smart commits for agent-kit

Only commit when the user asked for it. Never push from this skill unless the user also asked to push.

## 1. Understand what changed

Run `git status --short` and `git diff --stat`, then read the diffs. Other sessions or the user may have changed files too: commit only what belongs to the work at hand, and mention anything unrelated instead of sweeping it in. Never commit `dist/`, `node_modules/`, `.run/` or secrets (`.env`, tokens).

## 2. Verify

Run the `verify` skill first. Do not commit a tree that fails typecheck, lint or tests.

## 3. Group into atomic commits

One logical change per commit, ordered so each commit builds on the previous ones (nothing imports something introduced by a later commit). Typical groups: a feature or fix together with its tests, a refactor/move on its own, docs on their own, dependency/tooling changes on their own.

- Stage by path (`git add <paths>`), never `git add -A` blindly; check `git status --short` after staging.
- When one file mixes two concerns, split the hunks: `printf 'y\nn\n' | git add -p <file>` (answers per hunk), then check with `git diff --cached`.
- Use `git mv` for moves so history follows the rename, and keep pure renames free of content changes.

## 4. Write the message

Format: `type(scope): description`, lowercase type, no trailing period. Types used here: `feat`, `fix`, `refactor`, `docs`, `chore`, `build`, `test`. Scopes seen in history: `tui`, `core`, `auth`, `mode`, `session`, `examples`, `readme`, `deps`, `release`.

- **Language: Spanish** for the subject and body (this is the repo's history convention). Code, identifiers and skills stay in English.
- Breaking API change: add `!` after the type/scope (`refactor(auth)!: ...`) and say what breaks and what to use instead.
- The body explains *why* (the problem, the constraint, the empirically confirmed behavior), not a line-by-line list of what changed. Wrap at ~80 columns.
- End the message with the attribution trailer that the session's instructions require for commits (do not invent your own).
- Pass the message through a HEREDOC to keep formatting.

## 5. Finish

Run `git status --short` (must be clean unless you deliberately left unrelated changes) and `git log --oneline -n <commits made>`. Report the commits created. Never use `--no-verify`, `--amend` on pushed commits, or force-push.

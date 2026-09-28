# Conventions

- Code, comments, skills, CLAUDE.md and `.minispec/` in English; commit messages and `README.md` in Spanish.
- Commits follow Conventional Commits, one logical change each (see the `commit` skill).
- Relative imports inside `src/` use explicit `.js` extensions (NodeNext).
- Nothing under `src/core/` imports from `src/tui/`.
- Every public symbol is exported from `src/index.ts` (see the `add-export` skill); consumers never deep-import.
- Doc comments explain *why*, and mark SDK behavior verified by hand as "confirmed empirically".
- A bug fixed or an SDK quirk found gets a regression test in `test/`, mirroring `src/`.
- Documentation Markdown (`README.md`, `CLAUDE.md`, `.minispec/`): one line per paragraph and list item, no horizontal rules between sections. Skill and plugin Markdown keeps its own formatting.
- Before a release, the `verify` skill must pass (it also typechecks captain-whiskers against the rebuilt kit).

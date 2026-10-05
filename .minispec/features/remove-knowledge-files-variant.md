# Remove the file-tools variant of the knowledge base

Issue: [#31](https://github.com/falkenslab/agent-kit/issues/31)

## Goal

The built-in knowledge base has one way in, the `knowledge_*` tools over a `KnowledgeStore`: `knowledgeTools: "files"` and everything behind it are removed.

## Context

- ADR-024 moved the knowledge base to the `knowledge_*` tools and kept an escape hatch for the transition: "an option returns to the file tools", `AgentSpec.knowledgeTools: "files"`.
- Nobody uses it: padawan, miyagi and Captain Whiskers don't set `knowledgeTools` (searched in their sources).
- It costs: a second plugin (`assets/knowledge-plugin-files/`, four skills, `knowledge-pages` among them) to keep in step with the first; the files variant of the prompt section (`knowledgePromptSection()` without `tools`); the `notesDir` branches in `session.ts` (file tools, writable and searchable folders, the knowledge skills list); `knowledgePluginRoot("files")`; their tests and docs.
- No case needs it: an agent with its own rules for its notes has `knowledgeBase: false`; a person can still edit the pages on disk, since the file store reads the same layout.
- It would also leave the knowledge base extension (#29, phase 3) with a single variant.

## Changes

No deprecation phase: nothing depends on it (no backward compatibility is kept, 6 October 2026).

- Remove `AgentSpec.knowledgeTools`, `assets/knowledge-plugin-files/`, the files variant of `knowledgePromptSection()` (its `tools` option goes), `knowledgePluginRoot()`'s variant parameter, the `notesDir` branches and `KNOWLEDGE_SKILLS.files` in `session.ts`, and their tests.
- ADR-024: the escape hatch is closed. `architecture.md` and the docs follow (`capabilities/knowledge-base.md`, `core-concepts/agent-spec.md`, `core-concepts/session-options.md`, `security/file-scope.md`); the release notes say it's gone and what to use instead (the default, or `knowledgeBase: false` with the agent's own rules).

## Acceptance

- No file-tools path to the knowledge base left in `src/`, `assets/` or the docs; Captain Whiskers runs as before (he doesn't set it); `verify` passes.

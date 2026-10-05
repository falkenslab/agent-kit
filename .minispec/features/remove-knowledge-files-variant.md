# Remove the file-tools variant of the knowledge base

Issue: [#31](https://github.com/falkenslab/agent-kit/issues/31)

## Goal

The built-in knowledge base has one way in, the `knowledge_*` tools over a `KnowledgeStore`: `knowledgeTools: "files"` and everything behind it are deprecated now and removed in the next breaking release.

## Context

- ADR-024 moved the knowledge base to the `knowledge_*` tools and kept an escape hatch for the transition: "an option returns to the file tools", `AgentSpec.knowledgeTools: "files"`.
- Nobody uses it: padawan, miyagi and Captain Whiskers don't set `knowledgeTools` (searched in their sources).
- It costs: a second plugin (`assets/knowledge-plugin-files/`, four skills, `knowledge-pages` among them) to keep in step with the first; the files variant of the prompt section (`knowledgePromptSection()` without `tools`); the `notesDir` branches in `session.ts` (file tools, writable and searchable folders, the knowledge skills list); `knowledgePluginRoot("files")`; their tests and docs.
- No case needs it: an agent with its own rules for its notes has `knowledgeBase: false`; a person can still edit the pages on disk, since the file store reads the same layout.
- It would also leave the knowledge base extension (#29, phase 3) with a single variant.

## Changes

Now (no behavior change):

- `@deprecated` on `AgentSpec.knowledgeTools` and on `knowledgePluginRoot()`'s `"files"` variant, saying what to use instead (the default, or `knowledgeBase: false` with the agent's own rules).
- The docs mark it deprecated (`capabilities/knowledge-base.md`, `core-concepts/agent-spec.md`, `core-concepts/session-options.md`, `security/file-scope.md`), and the release notes say it goes in the next breaking release.

In the next breaking release (the one where `restrictReads` becomes the default):

- Remove `knowledgeTools`, `assets/knowledge-plugin-files/`, the files variant of `knowledgePromptSection()` (its `tools` option goes), `knowledgePluginRoot()`'s variant parameter, the `notesDir` branches and `KNOWLEDGE_SKILLS.files` in `session.ts`, and their tests.
- ADR-024: the escape hatch is closed. `architecture.md` and the docs follow.

## Acceptance

- Now: an agent with `knowledgeTools: "files"` gets a deprecation in its editor (the doc comment), behaves as before; `verify` passes.
- Breaking release: no file-tools path to the knowledge base left in `src/`, `assets/` or the docs; padawan, miyagi and Captain Whiskers run unchanged (none set it); `verify` passes.

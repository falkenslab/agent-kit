# Each extension owns its options

Issue: [#50](https://github.com/falkenslab/agent-kit/issues/50)

## Goal

The kit's extensions (sources, knowledge, memory, awareness) take their own options, as any agent's extension would, and the core's config and spec name none of them.

## Context

- ADR-025 turned them into extensions, but their options stayed where they were: `BaseSessionConfig` has `knowledgeDir`, `sourcesDir` and `memoryDir`; `AgentSpec` has `knowledgeStore`, `knowledgePageTypes` and `saveToSourcesDescription`.
- An `Extension` has no options of its own: it reads fixed fields of `config`/`spec` from its `ExtensionContext`. A third-party extension can't do the same, so the kit's are special.
- The core imports `KnowledgeStore` from `src/extensions/knowledge/` (`agentSpec.ts`, `session.ts`), and `SessionResult.knowledgeStore` duplicates what `apis` is for.
- `knowledgeDir` without the knowledge extension is a notes folder kept with the file tools (`session.ts`, `notesDir`): the same as an `extraWritableDirs` entry.
- `identity` stays in `AgentSpec`: it's the agent's, not awareness's (`SessionFacts.identity`, hosts may show it).
- No backward compatibility: padawan, miyagi and Captain Whiskers change directly.

## Changes

- A factory per kit extension, exported: `sources({ dir, saveDescription? })`, `knowledge({ dir, store?, pageTypes? })`, `memory({ dir })`, `awareness()`. A folder is a function of the session's config (`(config) => string`), since the spec is static and folders depend on the project.
- `AgentSpec.extensions` takes `Extension` objects only; drop the lookup by name (or keep a bare name for an extension with no required options: decide while implementing, and record it in ADR-025).
- `missing()` reads the extension's own options; an unset folder is a reason, as today.
- Remove `knowledgeDir`, `sourcesDir`, `memoryDir` from `BaseSessionConfig`, and `knowledgeStore`, `knowledgePageTypes`, `saveToSourcesDescription` from `AgentSpec`; the notes-folder case goes through `extraWritableDirs`.
- Remove `SessionResult.knowledgeStore`: hosts read `apis.knowledge.knowledgeStore`.
- Anything in the core that needs an extension's folders gets it from its contribution (`readOnlyDirs`, `toolOnlyDirs`), not from the config.
- The ESLint rule that keeps `extensions.ts` the only importer of `src/extensions/` covers type imports too.
- Captain Whiskers, the tests, ADR-025, `architecture.md` and the guides (`core-concepts/agent-spec.md`, `core-concepts/session-config.md`, `capabilities/extensions.md`, `capabilities/knowledge-base.md`, `examples/captain-whiskers.md`) follow.

## Acceptance

- `grep -rn "knowledge\|sources\|memory" src/core/agentSpec.ts` finds no extension option.
- No file in `src/core/` other than `extensions.ts` imports from `src/extensions/`, types included, and lint enforces it.
- An agent enabling the knowledge base without a folder sees it inactive with a reason, as today.
- Captain Whiskers runs with its extensions configured through their factories (web and terminal), and `verify` passes.

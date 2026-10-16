# Extension capabilities for the person

Issue: [#62](https://github.com/falkenslab/agent-kit/issues/62)

## Goal

An extension says what the agent can do with it, as capabilities (its skills and tools together, described in the person's language), shown in `/extensions`, the chat's help and the catalog, and gating on them as `provides` does today.

## Context

- `metadata["agent-kit"].provides` and `requires` are bare names (`src/core/extensions.ts`, `src/core/externalExtensions.ts`): an extension that `requires` one no active extension provides is left out, and so is a skill whose frontmatter `requires` it.
- What the person sees of an extension is its description and, for its tools, their labels; moodle-teacher reads as 140 tools.
- A capability is what the agent does well because it has both: the skill (how) and the tools (what). "Grading with rubrics" is moodle-teacher's `grading` skill with `get_rubric`, `get_submissions` and `grade_submission`.
- Neutral ids let an agent's skills depend on what can be done, not on which extension does it (`lms-grading`: moodle-teacher today, a Google Classroom extension tomorrow).
- The JSON schema of `metadata["agent-kit"]` (`schemas/agent-kit-metadata.schema.json`, #60) and the catalog generator (`packages/agent-kit-catalog`) are the contract marketplaces follow.
- The word "capability" is the kit's already (what `provides` names): this makes it an object, not a second meaning.

## Changes

- `metadata["agent-kit"].capabilities`: a list, each with an `id`, a `label` and a `description` per language (`en`, `es`…, as `labels`), the `skills` and `tools` it's made of, and optionally the requirements it needs (#63). In the schema, `readExternalManifest()` and `ExternalManifest`.
- `provides` is the capabilities' ids when there are capabilities (with `provides` also given, the two must agree); without them, `provides` stays as it is. `requires` gates on them unchanged.
- Validation when an extension is checked (`extension add`, `agent-kit-catalog --check`): every skill a capability names is one of the extension's, and every tool one of its servers'. The tools can only be checked against a running server, so `--check` checks the skills and the names' form, and a session warns of a tool its server doesn't list.
- Shown, in the person's language (the session's, then English): `/extensions` and the chat's help as "what your agent can do", grouped by extension; `about_me`; the controller's catalog entries and Captain Whiskers' drawer (each card and its details).
- The catalog generator writes them into `catalog.json`, and its schema says so, for the marketplace's page.
- Tests: the manifest's capabilities read, validated and refused when a skill is missing; `provides` derived from them; gating unchanged; their text in each language with English as fallback.
- Docs: Extensions → writing, reference; `schemas/` and the generator's README.

## Acceptance

- moodle-teacher, written with capabilities, shows "Grading with rubrics" and its description in Spanish in `/extensions` of a Spanish session, and on its card in the captain's catalog.
- A skill that `requires: lms-grading` loads with moodle-teacher enabled and is left out without it, the prompt saying why.
- An extension whose capability names a skill it doesn't have fails `extension add` and `agent-kit-catalog --check` with that name.
- An extension without capabilities behaves exactly as today.
- `verify` passes.

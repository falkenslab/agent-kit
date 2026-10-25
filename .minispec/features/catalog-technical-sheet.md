# A technical sheet per extension in catalog.json

Issue: [#80](https://github.com/falkenslab/agent-kit/issues/80)

## Goal

`catalog.json` says what each extension holds (its servers and their versions, its skills, commands and subagents, its tools), so a catalog page can show it without reading the repository.

## Context

- falkenslab/agent-extensions' catalog page wants a technical sheet under each card's "Install and use it", for someone checking what they install or writing an agent that uses it.
- `catalog.json` (agent-kit-catalog, `packages/agent-kit-catalog`) says what an extension does (description, capabilities, requirements, `remote`), not what it holds. A page can't find out: raw.githubusercontent.com can't list a folder, and the GitHub API is rate-limited.

## Changes

- **`servers`**: per MCP server (plugin.json's `mcpServers`, else `.mcp.json`), its `name` and `kind`: `package` (`npx -y <package>@<version>`, and `bunx`, `uvx`: `package`, `version`, npm's `url`), `bundled` (a command run from `${CLAUDE_PLUGIN_ROOT}`: the `command` as written), `remote` (`transport`, `host`), `command` (anything else: the command's name only). Never arguments' secrets nor an `env` value.
- **`skills`**, **`commands`**, **`agents`**: each one's `name` and `description` from its frontmatter, sorted by name; plugin.json's own paths followed.
- **`tools`**: what the manifest knows, by short name (labels, capabilities, `readOnlyTools`, `confirmTools`, `serverConfirmTools`): each with its `label` per language (`{field}` as written), and `readOnly`, `confirm` (`always`, `server`) where they apply. A static read of the files, never running the server.
- **`kit`**: the agent-kit range, as written.
- All optional in `schemas/marketplace-catalog.schema.json`; `--check` covers them. The package's README says what each field is.

## Acceptance

- agent-extensions' `catalog.json` has them: moodle-teacher's `servers` says `@falkenslab/moodle-mcp` and its version, its skills with descriptions, its tools with `en` and `es` labels and their marks; weather's server is `bundled`, with its commands; canva's is `remote` with `mcp.canva.com`.
- Tests for the four server kinds and a skill without frontmatter (no description); `verify` passes.

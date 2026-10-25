# `extension update --help` updates every extension: unknown flags are ignored

Issue: [#81](https://github.com/falkenslab/agent-kit/issues/81)

## Problem

- `<agent> extension update --help` doesn't show help: it updates every extension that has an update. In miyagi it printed `Updated canva (0.1.0 → 0.2.2) in the agent scope…`.
- The same for any action and flag: `--help`, a misspelt `--projct` or `--dry-run` are silently ignored, and the command runs as if they weren't there. Harmless for `list` or `info`; not for `update`, `remove` or `disable`.

## Cause

`runExtensionCommand()` (`src/tui/extensionCommand.ts`) drops every argument starting with `--` when it picks the positionals, and never checks the flags it doesn't know; `update` without a name means "update all".

## Solution

- `--help` (and `-h`) after an action prints that action's usage line (the one its `fail()` already has) and changes nothing.
- Each action knows its flags (`--project`, `--agent`, `--yes`, `--keep-data`, `--path`, `--set`, `--unset`, `--link`, `--trust`, `--delete-data`…); an unknown one fails with the usage line instead of being ignored.
- Docs (English and Spanish): Installing (the command).

## Verification

- Tests: `update --help` updates nothing and prints its usage; `remove x --projct` fails naming the flag; the known flags still work.
- `verify` passes.

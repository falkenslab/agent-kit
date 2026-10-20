# `extension add --yes` still asks for options, and loses `--set` values if cut short

Issue: [#73](https://github.com/falkenslab/agent-kit/issues/73)

## Problem

- `extension add <name> --set key=value --yes` asks on the terminal for every option the call doesn't set, defaults included: `--yes` only answers the confirmations.
- A script, or a host calling `runExtensionCommand()` inside its own wizard, blocks or fights over stdin. Seen in `miyagi init` (moodle-teacher): the kit asked for `headless` under miyagi's prompt and the process ended.
- The values are saved only at the end of the option loop, so `sites`, given with `--set`, was lost: installed, enabled, and without its required site.

## Cause

The option loop in `src/tui/extensionCommand.ts` calls `ask()` for every option `--set` didn't give, whatever `--yes` says, and calls `setExtensionOptions()` once, after the loop.

## Solution

- With `--yes`, never ask for an option: one with a default keeps it, an optional one stays unset, a required one without a value leaves the extension off with the line it already prints ("it stays off until … is set").
- Without a terminal (`!process.stdin.isTTY`), options behave as with `--yes`.
- Save what `--set` gave before asking for the rest, so a prompt cut short loses nothing.
- Docs (English and Spanish): the command's table in Installing, Configuring.

## Verification

- A test: `add … --set url=… --yes` asks nothing, keeps the defaults and saves `url`; a required option without a value leaves it off, saying so.
- A test: a prompt that throws after `--set` still finds the `--set` values in the lock.
- miyagi can drop its `ask` returning `""`.
- `verify` passes.

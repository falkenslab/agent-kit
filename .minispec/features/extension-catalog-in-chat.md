# The extension catalog in the chat

Issue: [#56](https://github.com/falkenslab/agent-kit/issues/56)

## Goal

A person browses the agent's official marketplace and installs, updates, uninstalls, enables and disables extensions from the chat, in the terminal, the web and the desktop app, without the `extension` command.

## Context

- The `extension` command (extensionCommand.ts) does it all from a shell: `search`, `info`, `add <plugin>@<marketplace>`, `remove`, `enable`, `disable`, `list`, `marketplace add|list|update|remove`. An agent names its official marketplace (`official`, the captain's shipyard).
- In the chat, `/extensions` (chat/extensions.ts) only lists the installed ones and turns them on and off, live when they were running when the session opened (#49).
- There's no update of an installed extension: it's reinstalled with `add`.
- A person using the desktop app has no shell: today they can't install anything.

## Changes

- `/extensions` gets the catalog: the official marketplace's extensions (and any other the agent knows), each with its description, version and whether it's installed, enabled or has a newer version; search by text.
- From it: install (into the agent's scope; the project's when the agent has one, asking which), update, uninstall (asking about its data, as the command does), enable, disable, and the extension's details (`info`).
- `update`: in the command (`extension update [name]`) and the chat, an installed extension from a marketplace is replaced by the version the marketplace lists now, its data kept; `marketplace update` first when the copy is old.
- A newly installed or updated extension is available in the next conversation: the chat says so and offers to start one; the running session is untouched.
- Each installed extension's settings: a form made from its `userConfig` (#55), each option by its type, title and description, sensitive ones masked and never shown back. Saving applies them live, restarting only that extension's servers (#55); while a call to one of them is running, it waits for the turn to end, saying so.
- The same actions in the chat controller (chatController.ts), so the web and the desktop app show them; the Ink chat its own view. Texts in the kit's languages.
- Docs: `capabilities/extensions.md`, the chats' pages, the captain's walkthrough.

## Acceptance

- In the captain's desktop app, the jokebook can be uninstalled, found in the catalog, installed again, disabled and enabled, without a shell.
- An extension whose marketplace lists a newer version shows it, and updates keeping its data.
- Installing during a session doesn't change that session; the next one has it.
- An extension's option changed in its settings form reaches its server in the same conversation, the model told; a sensitive value is never shown in the form again.
- `verify` passes.

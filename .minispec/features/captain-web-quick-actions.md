# Captain Whiskers' web: quick actions in the top bar

Issue: [#46](https://github.com/falkenslab/agent-kit/issues/46)

## Goal

The things a person does most with the captain are one click away at any moment, from a menu in the top bar, not only on the welcome screen.

## Context

- The page offers four suggestions on the welcome screen only (`web/texts.ts`, `suggestions`); once a conversation starts they're gone, and the commands are only reachable by typing them.
- The top bar has the mode, a new conversation, the conversations and the extensions.

## Changes

- A "quick actions" button in the top bar (an icon, a lightning bolt or a compass) opening a menu: tell a joke, a fresh joke, learn from the chest, check the logbook, the best jokes (only when the jokebook is on), what can you do; each sends its prompt or command, as the suggestions do.
- The list lives with the captain's texts, in his four languages, each with an icon and, when it's a command, only shown if the command is there (an extension off hides its action).
- Disabled while a turn runs; on a phone, the menu as a bottom sheet.

## Acceptance

- From any point of a conversation, the menu sends a joke request or `/captain-whiskers:learn` in one click.
- With the jokebook off, "the best jokes" isn't offered.
- The menu reads in the captain's language and works on a phone.

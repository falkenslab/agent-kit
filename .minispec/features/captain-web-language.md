# Captain Whiskers' web: changing the language on the fly

Issue: [#47](https://github.com/falkenslab/agent-kit/issues/47)

## Goal

The person changes the captain's language from his web page or app (English, Spanish, French, German), and he, the page and the kit's texts switch, keeping the conversation.

## Context

- The kit has one language per process (ADR-019): `chooseLanguage()` picks it once (`--language`, then `config.language`, then the system's) and `--language` wins over any option; `buildSessionOptions()` puts the reply line in the system prompt and the extensions' labels in that language when the session opens.
- The captain's name and texts (`captain.ts`'s `text`, the page's `web/texts.ts`) are chosen at import from `detectLanguage()`.
- The desktop app has no command line to pass `--language`.

## Changes

- Kit: the language can change for a running chat: `setLanguage()` (already there) plus reopening the session with it (the controller, e.g. `setLanguage(language)`: sets it, opens the session again keeping the conversation, as for an extension); `chooseLanguage()` lets an explicit change win over `--language` from then on. ADR-019 says how.
- The captain: his texts looked up by language when used, not fixed at import (his name in the prompt and the identity, the page's texts); his language kept in his home (so the app starts in the last one chosen).
- The page: a language menu (in the top bar or the quick actions); on change, the page's texts and the conversation's labels and notices switch, and his next reply comes in the new language.

## Acceptance

- Switching to French mid-conversation: the page reads in French, he's "Capitaine Moustaches" and answers in French, and the conversation is still there.
- The desktop app starts in the last language chosen.
- The terminal captain still follows `--language`; `verify` passes.

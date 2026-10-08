# ADR-019: One language per process, for the interface and the replies

## Decision

The kit's texts come in English, Spanish, French and German, from catalogs in `src/core/messages/` (plain data, English as the fallback for any missing key). The language is resolved once per process: `--language=<code>` on the command line, then the agent's `language` option (`config.language` or a UI entry point's), then the system's (`Intl` locale, then `LC_ALL`/`LC_MESSAGES`/`LANG`), then English. `buildSessionOptions()` also appends one line to the agent's and each subagent's prompt asking to reply in that language, or in the human's if they write in another one; `AgentSpec.replyInLanguage: false` leaves it to the agent.

## Motivation

- One language for everything a person sees: the status bar, panels, labels and the agent's replies. `--language` and the system's language belong to the process, and an agent has one, so a module-level current language (`chooseLanguage()`, `t()`) is simpler than passing a catalog through every view, renderer and label function. A desktop host sets it with `setLanguage()`. It can still change while a chat runs: `switchLanguage()` sets it and wins over `--language` and the agent's option from then on, and the chat controller's `setLanguage()` reopens the session in it, keeping the conversation, and tells the model with the next message (the earlier conversation pulls the replies otherwise). Still one per process: a server with several people in several languages needs one process each.
- Text for the model stays in English (tool descriptions, hook deny reasons, the knowledge base section, the reply line itself but for the language's name): several of those texts are tuned to SDK behavior confirmed by hand.
- Texts the agent passes in (header, welcome, prompt label, approval texts, its own tool labels) are its own and aren't translated.

## Consequences

- The reply line is a strong hint, not a guarantee (confirmed empirically): whatever language the agent's own prompt, skills or commands are written in pulls the replies towards it, and so do the runner's name and e-mail the CLI puts in the context (ADR-018), most for a question about the agent itself. An agent meant to follow the language writes everything its model reads in English and picks its own on-screen texts by `detectLanguage()`; captain-whiskers does both, with its name in each language. English messages from the human don't always switch the language: the model takes English as neutral.
- Fixed-place texts are measured in columns: the busiest status bar fits 80 columns in every language (a test), which is why the other languages abbreviate tokens and show the mode key as `⇧Tab`.
- Pasted-text tokens are matched in any language, so a prompt written before a language change still expands.
- Adding a language is one catalog plus its code in `SUPPORTED_LANGUAGES`; a test checks every catalog has every English key.

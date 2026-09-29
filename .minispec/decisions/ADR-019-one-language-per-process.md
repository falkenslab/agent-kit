# ADR-019: One language per process, for the interface and the replies

## Decision

The kit's texts come in English, Spanish, French and German, from catalogs in `src/core/messages/` (plain data, English as the fallback for any missing key). The language is resolved once per process: `--language=<code>` on the command line, then the agent's `language` option (`config.language` or a UI entry point's), then the system's (`Intl` locale, then `LC_ALL`/`LC_MESSAGES`/`LANG`), then English. `buildSessionOptions()` also appends one line to the agent's and each subagent's prompt asking to reply in that language, or in the human's if they write in another one; `AgentSpec.replyInLanguage: false` leaves it to the agent.

## Motivation

- One language for everything a person sees: the status bar, panels, labels and the agent's replies. `--language` and the system's language belong to the process, and an agent has one, so a module-level current language (`chooseLanguage()`, `t()`) is simpler than passing a catalog through every view, renderer and label function. A desktop host sets it with `setLanguage()`.
- Text for the model stays in English (tool descriptions, hook deny reasons, the knowledge base section, the reply line itself but for the language's name): several of those texts are tuned to SDK behavior confirmed by hand.
- Texts the agent passes in (header, welcome, prompt label, approval texts, its own tool labels) are its own and aren't translated.

## Consequences

- The reply line is a strong hint, not a guarantee (confirmed empirically): whatever language the agent's own prompt, skills or subagent names are written in pulls the replies towards it, and so does the runner's account name (ADR-018). An agent meant to follow the language writes its prompts in English; captain-whiskers does, and keeps its skills and on-screen texts in Spanish. English messages from the human don't always switch the language: the model takes English as neutral.
- Fixed-place texts are measured in columns: the busiest status bar fits 80 columns in every language (a test), which is why the other languages abbreviate tokens and show the mode key as `⇧Tab`.
- Pasted-text tokens are matched in any language, so a prompt written before a language change still expands.
- Adding a language is one catalog plus its code in `SUPPORTED_LANGUAGES`; a test checks every catalog has every English key.

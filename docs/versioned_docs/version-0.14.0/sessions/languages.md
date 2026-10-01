---
sidebar_position: 2
title: Languages
description: The kit's four languages, how the language is chosen, the reply language, an agent's own texts in several languages, and the limits.
---

# Languages

The kit's own texts (status bar, spinner, panels, shortcuts, tool labels, turn summaries, authentication prompts) come in **English, Spanish, French and German**, and the agent is asked to reply in the same language.

## How the language is chosen

Once per process, in this order:

1. **`--language=<code>`** on the command line (or `--language <code>`);
2. **the agent's option**: `config.language`, or the `language` option of a UI entry point;
3. **the system's language**: the `Intl` locale, then `LC_ALL`, `LC_MESSAGES`, `LANG`;
4. **English**.

Codes are `en`, `es`, `fr`, `de`; region variants work (`es-ES`, `fr_FR.UTF-8`). An unsupported code shows a one-line warning and falls through to the next source.

```bash
npx tsx agent.ts --language=fr
npm start -- --language=de     # with npm, arguments go after --
```

```ts
const config: BaseSessionConfig = { mode: "guided", projectDir, language: "es" };
```

`buildSessionOptions()` chooses the language (and appends the reply line); a chat, progress view or wizard started afterwards without its own `language` keeps it. `getLanguage()` returns it, `setLanguage(code)` sets it directly (a desktop host with its own language setting), and `resolveLanguage()` / `detectLanguage()` resolve without setting anything.

## The reply language

`buildSessionOptions()` appends one line to the system prompt and to every subagent's prompt:

> Language: reply in French, whatever language these instructions, your skills or the human's name are in. Switch to another language only when the human's message is clearly written in it; a greeting, a slash command or a single word doesn't count.

So the agent answers in the chosen language, and follows the person when they clearly write in another one. Turn it off with `replyInLanguage: false` in the spec when your prompt decides the language itself.

## Limits

The line is a strong hint, not a guarantee. Checked by hand:

- **Text in another language pulls the replies towards it**: the agent's prompt, its skills, its commands, its subagents' names. Write everything the model reads in English (or in the language you want) if the agent should follow the chosen one.
- **The runner's identity**: the CLI puts the logged-in Claude Code account's name and e-mail in the context, and the model may take the runner's language from them, most for questions about the agent itself. The kit already drops the git context (the runner's git user name) for this reason; the account can't be removed.
- **English messages** don't always switch the language: the model tends to take English as neutral.

## An agent's own texts

Texts the agent passes to the kit (header, welcome message, prompt label, approval texts, tool labels of its own) are its own: the kit doesn't translate them. To have them follow the language too, pick them with `detectLanguage()`, as Captain Whiskers does:

```ts
import { detectLanguage, messagesFor, type Language } from "@falkenslab/agent-kit";

const { language } = detectLanguage(); // --language, else the system's

const TEXTS: Record<Language, { name: string; you: string; welcome: string }> = {
  en: { name: "Captain Whiskers", you: "you>", welcome: "Captain Whiskers is aboard." },
  es: { name: "Capitán Bigotes", you: "tú>", welcome: "El Capitán Bigotes ha subido a bordo." },
  fr: { name: "Capitaine Moustaches", you: "toi>", welcome: "Le Capitaine Moustaches est à bord." },
  de: { name: "Käpt'n Schnurrbart", you: "du>", welcome: "Käpt'n Schnurrbart ist an Bord." },
};
const text = TEXTS[language];

await runChatInk(opener, {
  runsDir,
  header: { title: text.name, fields: { mode: messagesFor(language).mode(config.mode) } },
  promptLabel: `${ui.user(text.you)} `,
  welcomeMessage: text.welcome,
});
```

`messagesFor(language)` gives the kit's own texts in a language (the mode names above), with English for anything missing.

## What stays in English

Text for the model: tool descriptions, hook denial reasons, the knowledge base section, the reply line itself (but for the language's name). Several are tuned to SDK behavior confirmed by hand, and English is what the model follows most reliably.

## Adding a language

The catalogs live in `src/core/messages/` of the kit, one file per language, typed against the English one; a test checks every catalog has every key. Contributions are welcome: add the catalog and its code to `SUPPORTED_LANGUAGES`, and check the busiest status bar still fits 80 columns.

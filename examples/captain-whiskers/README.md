# Captain Whiskers

A minimal agent built on agent-kit: a retired pirate cat who tells jokes in a terminal chat. He speaks the kit's language, the system's or the one given with `npm start -- --language=fr` (`en`, `es`, `fr`, `de`): his name (Capitán Bigotes, Captain Whiskers, Capitaine Moustaches, Käpt'n Schnurrbart), his on-screen texts and the kit's follow it, and he answers in it. Everything the model reads (prompts, skills, commands) is in English, since text in another language pulls the replies towards it; only his crew keeps Spanish names. It's a standalone project that uses the kit through `file:../..`.

## Getting started

With the kit built (at the repo root, once and after each change to the kit):

```
npm install && npm run build
```

And from this folder:

```
npm install
npm start
```

It needs Claude authentication: `CLAUDE_CODE_OAUTH_TOKEN` (or `ANTHROPIC_API_KEY`) in the environment or in a `.env` file in this folder (ignored by git), loaded at startup; what's already in the environment wins over the file. If there's no token, it offers to create one with `claude setup-token` and saves it to `.env` for next time.

## Usage

Type as usual, `/captain-whiskers:joke` to ask for a joke right away, and `/exit` to leave. ↑/↓ bring back earlier messages, Tab completes `/commands` and Esc interrupts the reply in progress. Each run keeps its session log, its transcript and the conversation in `.run/<date-time>/` (ignored by git): `npm start -- --continue` picks up the latest one, and `/resume` lists them to pick one. The ↑/↓ history lives in `.run/history.jsonl`.

In a terminal it uses the kit's Ink interface (`runChatInk`) full screen: the prompt stays at the bottom, PageUp/PageDown and the mouse wheel scroll through the conversation and Ctrl+End (or typing) goes back to the bottom; drag with the mouse to select and right-click to copy to the clipboard. With `CAPTAIN_INLINE=1` it uses the inline mode (with the terminal's own scrollback), and without a TTY, or with `CAPTAIN_PLAIN=1`, the plain readline chat.

It runs in `autonomous` mode by default. With `CAPTAIN_MODE=interactive` it asks for approval before every tool (the panel takes `1`-`3` or `y`/`n`/`q`, and it can also be answered by writing to `.run/<date-time>/approval-response.txt`), and with `CAPTAIN_MODE=guided` only before publishing something. With `CAPTAIN_MODE=plan` it only reads and plans: its crew can still search the web and read the ship's clock (declared read-only), and anything else is denied until you leave plan mode. Started in any mode but `autonomous`, Shift+Tab cycles through `guided`, `interactive` and `plan`.

## Crew (subagents)

- `minino-buscachistes` — looks for new jokes on the web (`WebSearch`, `WebFetch`) and brings back 2 or 3 candidates with their source. The captain sends it when you ask for a new joke, or with `/captain-whiskers:fresh-joke`.
- `loro-critico` — rates the chosen joke from 1 to 10, with no tools; if it fails, the captain asks for another batch, once.
- `grumete-del-reloj` — tells the time, the date or how long until something. It reads the ship's clock with `current_time`, a read-only tool of the captain's own (an in-process MCP server), not with `Bash`.

All of them use `haiku`. While they work, the interface shows their tool calls under the call that started them, and with `CAPTAIN_MODE=interactive` their tools also go through the approval panel.

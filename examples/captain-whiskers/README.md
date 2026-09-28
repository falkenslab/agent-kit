# Captain Whiskers

A minimal agent built on agent-kit: a retired pirate cat who tells jokes in a terminal chat. He speaks Spanish, and so do his prompt, skills and commands, since the example is also a test of a non-English agent. It's a standalone project that uses the kit through `file:../..`.

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

Type as usual, `/captain-whiskers:chiste` to ask for a joke right away, and `/exit` to leave. ↑/↓ bring back earlier messages, Tab completes `/commands` and Esc interrupts the reply in progress. Each session keeps its transcript in `.run/<date-time>/` (ignored by git); the ↑/↓ history lives in `.run/history.jsonl`.

In a terminal it uses the kit's Ink interface (`runChatInk`) full screen: the prompt stays at the bottom, PageUp/PageDown and the mouse wheel scroll through the conversation and Ctrl+End (or typing) goes back to the bottom; drag with the mouse to select and right-click to copy to the clipboard. With `CAPTAIN_INLINE=1` it uses the inline mode (with the terminal's own scrollback), and without a TTY, or with `CAPTAIN_PLAIN=1`, the plain readline chat.

It runs in `autonomous` mode by default. With `CAPTAIN_MODE=interactive` it asks for approval before every tool (the panel takes `1`-`3` or `y`/`n`/`q`, and it can also be answered by writing to `.run/<date-time>/approval-response.txt`), and with `CAPTAIN_MODE=guided` only before publishing something. Started in `guided` or `interactive`, Shift+Tab switches between the two.

## Crew (subagents)

- `minino-buscachistes` — looks for new jokes on the web (`WebSearch`, `WebFetch`) and brings back 2 or 3 candidates with their source. The captain sends it when you ask for a new joke, or with `/captain-whiskers:chiste-fresco`.
- `loro-critico` — rates the chosen joke from 1 to 10, with no tools; if it fails, the captain asks for another batch, once.
- `grumete-del-reloj` — only with `CAPTAIN_BASH=1`: tells the time, the date or how long until something, using `Bash` (date-reading commands only). Like everything that grants `Bash`, it's opt-in.

All of them use `haiku`. While they work, the interface shows their tool calls under the call that started them, and with `CAPTAIN_MODE=interactive` their tools also go through the approval panel.

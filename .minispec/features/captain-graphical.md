# Captain Whiskers in a browser and on the desktop

Issue: [#44](https://github.com/falkenslab/agent-kit/issues/44)

## Goal

Captain Whiskers runs in a terminal, in a browser (from a phone too, through a tunnel) and as a packaged desktop application, each a host of his own on the kit's chat controller: the kit's end-to-end check that it supports them (ADR-026).

## Context

- The kit gives the chat controller (#39) and runs packaged (#42); the interface is each agent's (ADR-026). The Electron probe (`examples/electron-probe/`) runs a minimal agent packaged; nothing runs a real one with a graphical interface yet.
- `examples/captain-whiskers/agent.ts` holds everything (texts, prompt, spec, crew, config, the terminal chat) at module level, in TypeScript run by `tsx`, with his workspace next to his code.

## Changes

- **`captain.ts`**: what makes the captain, apart from how he's shown: his texts per language, prompt, crew, page type, spec, and `createCaptain({ workspace, home, mode })` with his config, runs folder, extension scopes and session opener. `agent.ts` keeps the terminal; `--web` starts the web host instead.
- **`web/`**: his web host. `startWebChat()`: a chat controller (`panels: "state"`) and an HTTP server on `127.0.0.1` (a free port, or `CAPTAIN_PORT`) with a token in the URL it prints; the state by server-sent events, the person's actions by `POST`; one person at a time. `web/index.html`: the page, no dependencies or build: the conversation (markdown, tool calls folded with their labels), a spinner and the activity, the mode and its switch, the panels as dialogs (approval, choices with "Other", free text, the plan), `/resume` and `/extensions` as menus, usable on a phone, in the captain's colors and language.
- **Signing in from the page**: without a token, the page asks for one (an API key or `claude setup-token`'s), kept in his home's `.env`, and the session opens then. The same for the desktop.
- **`desktop/`**: an Electron app with its own `package.json` (the kit packed as published, like the probe): his compiled code, plugin, extensions and guide inside, his workspace and home in the app's user data folder; the main process starts the web host and loads it in a window, with the token never leaving the process; `electron-builder` with `asarUnpack` only. Windows first.
- Docs: the captain's README and the walkthrough (running him in a browser, through a tunnel, as an app).

## Acceptance

- `npm start -- --web`: the URL works in a desktop browser and, through a tunnel, on a phone; without the token, nothing. A turn with tools, an approval answered on the page, a choice, a mode switch, `/resume` and an extension disabled all work.
- The packaged desktop app opens with his name, signs in from the window when there's no token, and completes a conversation with tools and an approval, without a terminal.
- The terminal captain is unchanged; `verify` passes.

# The chat in a browser

Issue: [#40](https://github.com/falkenslab/agent-kit/issues/40)

## Goal

An agent can run its chat as a web page it serves itself, usable from a phone through a tunnel, for people who don't use a terminal (ADR-026, phase 2).

## Context

- Needs the chat controller (`chat-controller.md`): the web host draws its state and sends it actions.
- The person's tunnel (cloudflared, ngrok, Tailscale) reaches a local port; the agent acts in the world, so whoever reaches the page must be the person.

## Changes

- `runChatWeb(opener, options)`: an HTTP server (`node:http`, no new dependency) on `127.0.0.1` (a port given, or a free one), with a token generated at start (or given) that every request carries; it prints the URL with the token, and refuses everything without it. One person connected per session: a second connection takes over and the first is told.
- The state reaches the page with server-sent events; the person's actions are `POST`s (send, interrupt, mode, resume, extensions, a panel's answer, a file uploaded for `request_file`).
- One page served by the kit (HTML, CSS and JavaScript, no build step for the agent): the conversation with markdown, tool calls folded as `toolDetail` says, the panels as dialogs (approval, choices with "Other", the plan, a file picker for `request_file`), the mode and its switch, the conversations to resume, the extensions, the context in use; the kit's theme roles as CSS variables; the kit's language; usable on a phone (one column, large touch targets).
- Agents choose how to start it (Captain Whiskers: `npm start -- --web`, or `CAPTAIN_WEB=1`).
- Docs: a guide page (starting it, the token, tunnels, what's safe), Captain Whiskers.

## Acceptance

- Captain Whiskers with `--web`: the URL works in a desktop browser and, through a tunnel, on a phone; without the token, nothing.
- A turn with tools, an approval answered on the phone, `request_file` with a file uploaded, a mode switch, `/resume` and an extension disabled all work.
- `verify` passes.

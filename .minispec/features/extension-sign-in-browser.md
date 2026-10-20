# Signing in to an extension from the chat opens the browser, with a link that survives wrapping

Issue: [#72](https://github.com/falkenslab/agent-kit/issues/72)

## Goal

`/extensions sign-in <name>` can be finished from the full-screen chat: the browser opens on this computer, and the link shown stays whole for another one.

## Context

- Found with Canva's remote server from miyagi (falkenslab/agent-extensions#23).
- `signInExtension()` (`src/chat/chatController.ts`) shows the OAuth link inside a sentence (`extensionSignInOpen`). The URL is long, Ink's full-screen chat wraps it with real line breaks, and clicking or selecting it gets a piece.
- #61 chose never to open a browser, for a person on another computer. But the callback is the CLI's `localhost`, so the usual case is this computer, where Claude Code itself opens the browser.
- `--plain` lets the person copy the line whole: the only way today.

## Changes

- Open the browser with the link on this computer, with the platform's opener (`start`, `open`, `xdg-open`); not without a display (headless, SSH). Still show the link, for another computer (`/extensions sign-in <name> <address>`, as now).
- An agent may turn the opening off (a config option).
- The link on a line of its own, apart from the sentence, and as an OSC 8 hyperlink where the terminal supports it; the plain chat the same.
- `extensionSignInOpen` in the four languages follows.
- Docs (English and Spanish): Writing an extension ("A remote server"), the chats' `/extensions`, Session config for the option.

## Acceptance

- In the full-screen chat on Windows Terminal, `/extensions sign-in canva` opens the browser at the sign-in page, and the link shown can be clicked or copied whole.
- Headless or over SSH, nothing is opened and the link is still usable.
- Signing in finishes and the server connects, as now.
- `verify` passes.

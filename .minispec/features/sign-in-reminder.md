# The model is told how to sign in to an extension that needs it

Issue: [#82](https://github.com/falkenslab/agent-kit/issues/82)

## Goal

When an installed extension waits for the person to sign in, the model tells them to run `/extensions sign-in <name>`, never Claude Code's `/mcp`, `claude mcp` or claude.ai's connectors.

## Context

- Tried in miyagi on 0.29.0 with canva not signed in: `/extensions` says it right ("canva necesita que inicies sesión: /extensions sign-in canva"), but asked to search Canva designs the model answered with `/mcp`, `claude mcp` and claude.ai's connectors, none of which works in an agent on the kit.
- With the server needing sign-in, its tools aren't there, nor is the extension's skill that says how to sign in, so the model falls back on what it knows of Claude Code. An extension can't fix it.
- The kit already knows who waits (`createExtensionAuth().needed()`, `needingSignIn()` in `src/chat/extensions.ts`), and already tells the model when an extension is turned on or off, and when a sign-in finishes (a system reminder with the next message).
- Goes with #83 (a project server's own sign-in notice misleads the model too).

## Changes

- When the session starts, and when an extension's remote server turns to needing sign-in (after `/extensions sign-out`), the kit adds a system reminder to the next message: "The <name> extension needs the person to sign in before its tools are available: ask them to run `/extensions sign-in <name>` (it opens their browser). Never suggest `/mcp`, `claude mcp` or claude.ai's connectors: they don't apply here." In English, like the kit's other reminders.
- `about_me` (awareness) lists the extensions waiting for a sign-in, with the same instruction.
- The reminder after a sign-in finishes stays.
- Docs (English and Spanish): Writing an extension ("A remote server"), awareness.

## Acceptance

- In miyagi with canva not signed in, "busca mis diseños de canva" is answered with `/extensions sign-in canva`, and nothing about `/mcp` or connectors.
- `about_me` says canva waits for a sign-in, and how.
- Tests for the reminder at session start and after `/extensions sign-out`; `verify` passes.

# MCP elicitation in the chats

Issue: [#58](https://github.com/falkenslab/agent-kit/issues/58)

## Goal

When an MCP server asks the person for something in the middle of a tool (a form, or a page to open), the kit's chats ask them, and the answer goes back to the server without the model or the transcript seeing it.

## Context

- MCP elicitation: a server sends `elicitation/create` during a tool call, either a form (a flat schema of fields: text, number, boolean, a choice, with title and description) or a URL to open (a sign-in elsewhere); the client asks the person, who accepts, declines or cancels, and the server gets the answer. The model only sees the tool's result.
- It's what a server needs for a value only the person knows or must not reach the model: a Moodle site's URL in moodle-mcp's `add_site`, a token, its own confirmation before deleting ("12 questions will be deleted"), the same in Claude Code, Codex and the kit.
- The SDK takes it through `onElicitation` in `query()`'s options (after any `Elicitation` hook); without it, every request is declined automatically. The kit sets none: today every elicitation is declined without asking.
- The kit already asks the person through its interaction port (interaction.ts: `askDecision`, `askText`, `askChoice`), which the Ink chat, the plain chat and the chat controller (web, desktop) implement; but those are the model's questions (`ask_human`), and their answers go back to the model.

## Changes

- `buildSessionOptions()` sets `onElicitation`: in every mode but autonomous, the request goes to the interaction port; autonomous declines, as now, and the transcript says so.
- The port gets `askForm` (the server's name and message, the fields, accept / decline / cancel) and `openUrl` (the URL, and the person confirming they're done); a chat without them falls back to `askText` per field and `askDecision`.
- The Ink chat shows a form panel; the chat controller sends it to the web and the desktop app, which show it as a dialog. The server's name is always on it, so the person knows who asks. Texts in the kit's languages.
- What the person answers is never written to the transcript nor the run's log: only that the server asked, which fields, and whether they accepted. A field the schema marks as a secret (a password format) is masked.
- A URL request opens only `https://` (or `http://localhost`) and shows the address before opening it.
- Docs: `human-in-the-loop/` (a page on elicitation), `capabilities/tools-and-mcp.md`, `reference/sdk-behaviors.md` with what's measured.

## Acceptance

- A test server whose tool asks for a form gets the values the person gives, in the Ink chat and in the captain's web chat; declined and cancelled reach it as such.
- The values aren't in the transcript, the run's log or anything the model receives.
- An autonomous session declines without asking.
- `verify` passes.

# Remote MCP servers

Issue: [#61](https://github.com/falkenslab/agent-kit/issues/61)

## Goal

An agent on the kit uses remote MCP servers (Canva, Notion and the like, over HTTP, most behind OAuth) from an installed extension, with the person signing in and the kit's gates intact. The person's claude.ai connectors are #70.

## Context

- The SDK takes `{ type: "http" | "sse", url, headers }` servers, and an agent can already pass one in `spec.mcpServers`.
- An installed extension can't: every server in its `.mcp.json` needs a `command` and runs through the launcher (`src/core/externalExtensions.ts`, ADR-025); an `http` one is refused at install ("has no command").
- Most remote servers sign the person in with OAuth. `mcpServerStatus()` reports `needs-auth`, but the SDK has no method to start the sign-in; Claude Code does it from `/mcp`. Unknown: what the CLI does with one when the SDK drives it (opens a browser, gives a URL, a tool for the model?), where it keeps the token, and whether that survives the kit's isolation (`settingSources: ["project"]`, ADR-018).
- The kit keeps the claude.ai connectors of the account out on purpose (`disableClaudeAiConnectors: true`, `src/core/session.ts`): they're the runner's integrations, not the agent's. A person who signed in to Canva or Notion on claude.ai already has them authenticated; an agent might opt into some of them.
- Elicitation's `url` mode already shows a link for the person to open in both chats (`src/core/elicitation.ts`): the way a sign-in could reach them.
- What the model sends to a remote server leaves the computer: moodle-teacher's pseudonymization protects what comes from Moodle, not what the model copies elsewhere.

## Findings (17 October 2026, SDK 0.3.300, CLI 2.1.300, Windows; confirmed empirically)

- **No auth**: `{ type: "http", url }` connects and lists tools; `mcpServerStatus()` gives the tools' annotations mapped (`readOnlyHint` → `annotations.readOnly`), scope `dynamic`. A server still starting shows `failed` briefly and the CLI retries by itself.
- **Header token**: `headers` reach the server on every request. The kit must resolve `${user_config.*}` itself.
- **OAuth**: status `needs-auth`, no error text. The CLI does nothing by itself: no elicitation, no SDK message, no browser, no authenticate tool offered to the model (with `tools: []` or every built-in).
- **Sign-in control methods exist but are undocumented**: the `Query` object has `mcpAuthenticate(name, redirectUri?)` → `{ authUrl, requiresUserAction, callbackExpected, redirectScheme: "localhost", state, callbackPort }`, `mcpSubmitOAuthCallbackUrl(name, callbackUrl)` and `mcpClearAuth(name)`, in `sdk.mjs` and not in `sdk.d.ts`. Canva's `client_id` is Claude Code's (`https://claude.ai/oauth/claude-code-client-metadata`), redirect `http://localhost:<port>/callback`.
- **The flow end to end** (a local fake OAuth server): the browser reaching the CLI's localhost callback turns the server `connected` within about a second; a pasted callback URL stores the token but needs `reconnectMcpServer(name)` before that session is `connected`; a new session is `connected` straight away; `mcpClearAuth` revokes and returns it to `needs-auth`.
- **The token**: in `<CLAUDE_CONFIG_DIR>/.credentials.json`, `mcpOAuth["<server name>|<hash of its config>"]` (plaintext on Windows), plus `mcp-needs-auth-cache.json`. `settingSources: ["project"]` doesn't isolate it: a server named `notion` was `connected` with the runner's own Claude Code token, the same URL named `notion2` was `needs-auth`. Extension servers must have names of their own (prefixed with the extension's) to avoid picking up the runner's tokens.
- **claude.ai connectors**: with `disableClaudeAiConnectors: false` they appear as `claude.ai <Name>` (type `claudeai-proxy`, scope `claudeai`). `settings.deniedMcpServers` by `serverName` removes one; `allowedMcpServers` by `serverName` doesn't let one in, by `serverUrl` does. Once any `serverUrl` entry exists, the allowlist also drops remote servers passed by the SDK that aren't listed (in-process `sdk` servers are exempt). Whether each connector has its own URL couldn't be checked (one on the account tested).
- **Gates**: a remote server's tool goes through PreToolUse (`mcp__<server>__<tool>`) and `canUseTool` as a local one.

What this means: `http`/`sse` in `.mcp.json`, the status and the gates can be built now. Signing in relies on undocumented methods: call them guarded (`typeof`), record it in an ADR, and ask Anthropic to make them public. A per-agent token store would take its own `CLAUDE_CONFIG_DIR`, where the model's login also lives: to be designed carefully. Connector opt-in works by URL, not by name.

## Changes

Research first, each answer confirmed empirically and recorded in the code comments and `reference/sdk-behaviors.md` (done: see Findings; the code comments and `sdk-behaviors.md` come with the implementation):

- A remote server with no auth and one with a header token (`${user_config.token}`): connects, its tools work, the kit's gates (plan mode, `readOnlyHint`, read-only lists, labels) apply as to a local one.
- One behind OAuth, through the SDK: what `needs-auth` leads to, how the sign-in can be started and finished from a host, where the token is kept, whether it survives a new session and the kit's isolation, and how it's signed out.
- The claude.ai connectors: whether they can be let in one by one (not all-or-nothing), how they're named and listed, whether they need anything but the account's login, and how they combine with the kit's gates.

Then, from what's confirmed (and an ADR, or ADR-025 updated, with the design):

Decided (18 October 2026): the claude.ai connectors and a guard for sensitive data go to their own feature (#70, `claude-ai-connectors.md`); a remote server's options apply when the session opens again (the SDK fixes `url` and `headers` at start; the chat offers `/extensions reload`); signing in shows the person the link, never opens a browser by itself.

- An installed extension's `.mcp.json` may declare `http` and `sse` servers: no launcher, no package, nothing to hash but the manifest; its options go into `url` and `headers` (`${user_config.KEY}`, secrets kept as today), resolved by the kit when the session opens.
- Each remote server gets a session name of its own, `<extension>-<server>`, so it never picks up the runner's own Claude Code tokens for a server of the same name.
- Installing one says it talks to a remote service, and which host; the extension's info and the catalog show it.
- Signing in: `/extensions` and the chat controller show "needs sign-in" for an extension's server (`needs-auth` in `mcpServerStatus()`); `/extensions sign-in <name>` (a controller method for a host) calls `mcpAuthenticate()` and shows the link, the CLI's localhost callback finishes it and the kit waits for `connected`; a pasted callback URL (a browser on another computer) goes to `mcpSubmitOAuthCallbackUrl()` then `reconnectMcpServer()`; `/extensions sign-out <name>` calls `mcpClearAuth()`. The three are undocumented: called only when they exist, recorded in an ADR, and asked of Anthropic to make public.
- An example extension with a remote server in agent-extensions, once one works end to end: Canva (`canva-extension.md`), after a server without auth has proven `http` in `.mcp.json`.
- Tests: manifest validation and options into `url`/`headers` without network; with the SDK's CLI, a local HTTP server (connects, its tools, its read-only hints, plan mode) and a local fake OAuth server (`needs-auth`, signing in, a new session connected, signing out); the docs' Extensions section (writing, configuring, reference; English and Spanish), `sdk-behaviors.md` and `architecture.md`.

## Acceptance

- The research's answers are written down, each confirmed with a script or a session, with the CLI version.
- An extension whose `.mcp.json` names an `http` server installs, validates with `claude plugin validate --strict`, and its tools work in a session.
- A server behind OAuth is signed in to from a chat and from the controller, its tools then work, and a new session doesn't ask again.
- Plan mode lets through a remote server's `readOnlyHint` tools and stops the rest.
- Changing a remote extension's option says it applies when the session opens again, and `/extensions reload` applies it.
- `verify` passes.

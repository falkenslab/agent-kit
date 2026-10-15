# Remote MCP servers

Issue: [#61](https://github.com/falkenslab/agent-kit/issues/61)

## Goal

An agent on the kit uses remote MCP servers (Canva, Notion and the like, over HTTP, most behind OAuth), from an installed extension or from the person's claude.ai connectors, with the person signing in and the kit's gates intact.

## Context

- The SDK takes `{ type: "http" | "sse", url, headers }` servers, and an agent can already pass one in `spec.mcpServers`.
- An installed extension can't: every server in its `.mcp.json` needs a `command` and runs through the launcher (`src/core/externalExtensions.ts`, ADR-025); an `http` one is refused at install ("has no command").
- Most remote servers sign the person in with OAuth. `mcpServerStatus()` reports `needs-auth`, but the SDK has no method to start the sign-in; Claude Code does it from `/mcp`. Unknown: what the CLI does with one when the SDK drives it (opens a browser, gives a URL, a tool for the model?), where it keeps the token, and whether that survives the kit's isolation (`settingSources: ["project"]`, ADR-018).
- The kit keeps the claude.ai connectors of the account out on purpose (`disableClaudeAiConnectors: true`, `src/core/session.ts`): they're the runner's integrations, not the agent's. A person who signed in to Canva or Notion on claude.ai already has them authenticated; an agent might opt into some of them.
- Elicitation's `url` mode already shows a link for the person to open in both chats (`src/core/elicitation.ts`): the way a sign-in could reach them.
- What the model sends to a remote server leaves the computer: moodle-teacher's pseudonymization protects what comes from Moodle, not what the model copies elsewhere.

## Changes

Research first, each answer confirmed empirically and recorded in the code comments and `reference/sdk-behaviors.md`:

- A remote server with no auth and one with a header token (`${user_config.token}`): connects, its tools work, the kit's gates (plan mode, `readOnlyHint`, read-only lists, labels) apply as to a local one.
- One behind OAuth, through the SDK: what `needs-auth` leads to, how the sign-in can be started and finished from a host, where the token is kept, whether it survives a new session and the kit's isolation, and how it's signed out.
- The claude.ai connectors: whether they can be let in one by one (not all-or-nothing), how they're named and listed, whether they need anything but the account's login, and how they combine with the kit's gates.

Then, from what's confirmed (and an ADR, or ADR-025 updated, with the design):

- An installed extension's `.mcp.json` may declare `http` and `sse` servers: no launcher, no package, nothing to hash but the manifest; its options go into `url` and `headers` (`${user_config.KEY}`, secrets kept as today).
- Installing one says it talks to a remote service, and which host; the extension's info and the catalog show it.
- Signing in: `/extensions` and the chat controller show "needs sign-in" for an extension's server, and a command (`/extensions sign-in <name>`, a controller method for a host) starts it and gives the person the link; signing out too.
- The agent's opt-in to claude.ai connectors, if the research allows it: a config listing the ones it accepts (none by default), shown in `/extensions` apart from installed extensions.
- A guard for student data: an agent can mark that remote servers mustn't receive it (or warn), as moodle-teacher's `clear` warns today; the exact shape comes from the research.
- An example extension with a remote server in agent-kit-extensions, once one works end to end.
- Tests where no network is needed (manifest validation, options into `url`/`headers`, the status shown); the docs' Extensions section (writing, configuring, reference) and `architecture.md`.

## Acceptance

- The research's answers are written down, each confirmed with a script or a session, with the CLI version.
- An extension whose `.mcp.json` names an `http` server installs, validates with `claude plugin validate --strict`, and its tools work in a session.
- A server behind OAuth is signed in to from a chat and from the controller, its tools then work, and a new session doesn't ask again.
- Plan mode lets through a remote server's `readOnlyHint` tools and stops the rest.
- Without the agent's opt-in, no claude.ai connector reaches a session.
- `verify` passes.

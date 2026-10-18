# ADR-028: Installed extensions' remote MCP servers, signed in through the SDK's undocumented methods

## Decision

Decided 18 October 2026 (#61). An installed extension's `.mcp.json` may declare remote servers (`type: "http" | "sse"`, `url`, `headers`), and the person signs in to those behind OAuth from the agent's chats, through methods the SDK's `Query` has but its typings don't.

- **No launcher, no package.** A remote server runs nowhere on the computer: the kit passes it to the SDK as it is, its options (`${user_config.KEY}`) and the agent's variables (`${VAR}`) filled into `url` and `headers` when the session opens. A header naming an option without a value isn't sent. Its address must be `https`, or `http` on `localhost` for a server under development.
- **A session name of its own.** The SDK's CLI keeps OAuth tokens in its configuration folder by server name and config, and `settingSources: ["project"]` doesn't isolate them: a server named like one of the runner's own Claude Code servers signs in with the runner's token. The kit names an extension's remote server `<extension>-<server>`.
- **Options apply on reopening.** The SDK fixes `url` and `headers` when the session opens, and `reconnectMcpServer()` restarts with the same config: a changed option of a remote server opens the session again (the chat keeps the conversation); `restartExtension()` returns `false` for it.
- **Signing in through `mcpAuthenticate()`, `mcpSubmitOAuthCallbackUrl()` and `mcpClearAuth()`.** They're in `sdk.mjs` and not in `sdk.d.ts` (SDK 0.3.300). `runQuery()` attaches them to the session's view only when they're functions, so an SDK without them leaves an agent that says it can't sign in, not one that breaks. `/extensions sign-in <name>` and the chat controller's `signInExtension()` start it and show the person the link (the kit never opens a browser by itself); the CLI's localhost callback finishes it; from a browser on another computer, the address it ended on is pasted and the kit submits it and reconnects (a pasted callback stores the token, but the server stays `needs-auth` in that session until it reconnects). `/extensions sign-out <name>` clears it.
- **Where data goes is said.** Installing, `extension info`, the catalog and `catalog.json` name the hosts an extension's remote servers talk to.

## Motivation

Services such as Canva or Notion offer remote MCP servers, most behind OAuth, and teaching agents would use them (materials, slides, a teacher's notebook). The research (#61's note, confirmed empirically with the SDK 0.3.300 and the CLI 2.1.300) found that a remote server works as a local one (its tools, its annotations, the kit's gates), but that the CLI does nothing about OAuth by itself when the SDK drives it: no browser, no elicitation, no tool for the model. Only the undocumented methods start and finish the sign-in from a host.

Rejected: waiting for Anthropic to document them (it blocks Canva, Google Classroom and every remote extension with no date); asking the model to sign in (it has no tool for it, and a credential flow is the person's); opening the browser by the kit (the person should see what they open, and a desktop app or a remote host can't always do it the same way); one shared name per server (it collides with the runner's own tokens).

## Consequences

- An SDK upgrade must check the three methods still exist and behave so (the `upgrade-sdk` skill); they're the first thing to look at when signing in breaks. If Anthropic documents them, their types replace the kit's guarded calls.
- The token lives in the CLI's configuration folder, shared with the runner's Claude Code unless the agent points `CLAUDE_CONFIG_DIR` elsewhere: a store per agent would take its own folder, where the model's login also lives, and is left for later.
- An `Authorization` header turns a server's OAuth off ("OAuth fallback is disabled when headers.Authorization is set"): an extension offering both a token and signing in leaves the token optional.
- The claude.ai connectors of the person's account, and keeping sensitive data from remote servers, are #70.

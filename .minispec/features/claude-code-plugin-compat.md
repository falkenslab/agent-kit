# Extensions that are valid Claude Code plugins: metadata and userConfig

Issue: [#55](https://github.com/falkenslab/agent-kit/issues/55)

## Goal

One extension folder works the same in the kit and in Claude Code: its manifest passes `claude plugin validate --strict`, and the values a person gives it (a Moodle URL, a token) reach its servers in both.

## Context

- The kit reads its data from a top-level `"agent-kit"` key in `plugin.json` (`readExternalManifest()`, `readExtensionManifest()`). Claude Code strips unknown top-level keys and loads the plugin, but `claude plugin validate` warns, and `--strict` (what a marketplace's CI should run) fails. Its documented place for custom data is the free-form `metadata` object.
- Claude Code has `userConfig` in `plugin.json`: options with `type` (`string`, `number`, `boolean`, `directory`, `file`), `title`, `description`, and `required`, `default`, `sensitive`…; it asks for them when the plugin is enabled, keeps sensitive ones in the credential store and the rest in settings, and expands `${user_config.KEY}` in MCP server config and skill content.
- The kit only passes values through `env` with `${VAR}` from the agent's environment; `${user_config.KEY}` would reach a server empty. An extension for Moodle needs its URL per installation.
- Restarting one server in a running session, measured with the real CLI on 13 October 2026 (an installed extension's server, through the launcher): `reconnectMcpServer(name)` ends its process and starts a new one with the session's config, which reads anything from disk anew; `toggleMcpServer` off and on does the same. `setMcpServers({ name: … })` starts the server with a new config, but replaces the whole set of the session's servers (the kit's `time` server, not named, was removed) and left the old process running until the session closed.

## Changes

- The kit reads its manifest data from `metadata["agent-kit"]` (internal extensions' plugins and installed ones); the top-level key is dropped (no backward compatibility), and the kit's own plugins and the jokebook move.
- `userConfig` read as Claude Code declares it; an unknown field in an option makes the extension off, as Claude Code refuses it.
- `extension add` (and enabling one whose required options have no value) asks for each option, in the terminal; `--set key=value` sets one without asking. Values are stored per scope: non-sensitive ones in the lock, sensitive ones in a file of the scope the session's `deniedPaths` covers, never in the lock or the transcript.
- `${user_config.KEY}` expanded in servers' `command`, `args` and `env`, beside `${VAR}`; a required option without a value leaves the extension off, saying which and how to set it (`extension config <name>`).
- `extension config <name> [key=value…]` shows and changes the values; `extension info` lists the options (sensitive ones masked).
- Changed values apply in the running session, restarting only that extension's servers: the launcher reads the option values when it starts a server (the kit passes where they are, not the values), and the kit calls `reconnectMcpServer()` for each; the model is told with the next message, as when an extension is turned off. Not `setMcpServers()` (see Context).
- Docs: `capabilities/extensions.md` (manifest, options), the jokebook's walkthrough, ADR-025.

## Acceptance

- The kit's plugins and the jokebook pass `claude plugin validate --strict` (when the CLI is there).
- An extension with a required `userConfig` option is off until it's set; set, its server receives it through `${user_config.KEY}`; a sensitive value isn't in the lock nor readable by the model's file tools.
- The same extension folder installed in Claude Code receives the same values through its own prompt.
- Changing a value during a session restarts only that extension's servers, which receive the new value; the conversation goes on.
- `verify` passes.

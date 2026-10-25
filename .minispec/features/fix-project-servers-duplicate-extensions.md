# A project's .mcp.json duplicates an extension's servers, and its sign-in notice misleads the model

Issue: [#83](https://github.com/falkenslab/agent-kit/issues/83)

## Problem

- Found with canva in miyagi on 0.29.0: after signing in, a new session told the person Canva wasn't authorized and to use `claude mcp`, `/mcp` or claude.ai's connectors, though the token was kept and `mcp__canva-canva__*` was there.
- The workspace had a `.mcp.json` of its own (from using the folder in Claude Code) with `canva` (`https://mcp.canva.com/mcp`) and `moodle` (`npx -y @falkenslab/moodle-mcp`, unpinned, other courses). With `settingSources: ["project"]` the CLI starts those too: two Canva servers (the extension's signed in, the project's not) and two Moodle ones.
- The CLI's notice ("The following MCP servers require authentication…: canva. This session is non-interactive…") is about the project's `canva`, but the model took it for the extension's. And the unpinned `moodle` runs any npm version on other courses, around the extension's pinned version and course limit.

## Cause

The kit passes the extensions' servers by name (`<extension>-<server>` for a remote one) and leaves the project's `.mcp.json` to the CLI, so nothing notices that two servers are the same service.

## Solution

- A project server that duplicates an installed extension's (the same URL for a remote one; the same npm package, version aside, for an `npx` one) is left out of the session through `settings.deniedMcpServers` by name, as #70 does for connectors (never `toggleMcpServer()`, which the CLI saves, #75). `/extensions` and `about_me` name it: "<project>/.mcp.json also declares canva (https://mcp.canva.com/mcp): the extension's is used".
- `BaseSessionConfig.projectMcpServers: "allow" | "deny"` (`allow` by default): `deny` keeps every server of the project's `.mcp.json` out, for an agent like miyagi that only wants its extensions'.
- Docs (English and Spanish): Session config, Extensions (installing), Permissions and isolation; troubleshooting.

## Verification

- A test with a project `.mcp.json` duplicating a remote and an npx extension server: both left out by name, the others kept; `projectMcpServers: "deny"` leaves all out; `/extensions` names them.
- Tried in miyagi with that `.mcp.json`: the session lists Canva designs and only the pinned `moodle` runs.
- `verify` passes.

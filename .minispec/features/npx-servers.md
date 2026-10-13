# Installed extensions' npx servers, resolved by the kit

Issue: [#54](https://github.com/falkenslab/agent-kit/issues/54)

## Goal

An installed extension whose `.mcp.json` runs `npx -y <package>@<exact version>` works in the kit, on a machine without Node or npm (the desktop app) and without the network during the session, with the same file Claude Code runs as it is.

## Context

- The kit only starts a server that is `node <script>` with the script inside the extension's folder (`serverLaunch()`, externalExtensions.ts); anything else leaves the extension off ("only Node servers can be installed").
- An extension built on an MCP server published to npm (moodle-mcp) would have to carry the server inside: duplicated code, and two versions to keep in step. With `npx` the extension is its manifest, `.mcp.json`, skills and commands.
- Running `npx` itself isn't an option: it needs npm and a `node` on the `PATH` (its bin shims call `node` through a shell), downloads while the server connects, and needs the npm variables the launcher strips. In Electron, npm inside the `asar` can't spawn.
- The kit already downloads an npm package and checks its `sha512` integrity (`fetchNpmPlugin()`, pluginDownloads.ts), for a marketplace's `npm` source. It doesn't install dependencies: a package must bring them (bundled, or in `bundleDependencies`, as moodle-mcp 0.2.0 does with `playwright-core`).
- A published npm version can't be republished: an exact version is as fixed as the lock's hash.

## Changes

- A server whose `command` is `npx` (`npx.cmd`) with `-y`/`--yes` and one `<package>@<x.y.z>` is resolved by the kit: anything else (no version, a range, a tag, other flags, other args after the package) leaves the extension off, saying why.
- On `extension add` (and when installing from a marketplace), each such package is fetched into a cache by version in the agent's extensions folder (`<agent scope>/.npm/<package>@<version>/`), shared by every scope and workspace of that agent, integrity checked; already there, nothing is downloaded.
- Refused at install, saying why: a package whose `dependencies` aren't all in `bundleDependencies`, one with install scripts (`preinstall`, `install`, `postinstall`), one without a `bin` (or with several and none named like the package).
- At session start the server runs as an installed Node server does: `node <cache>/<bin>` through the launcher, clean environment, its `env`, `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` as now. Missing from the cache (cleaned, or a lock from elsewhere): the extension is off, saying to reinstall it; never a download in the session.
- The lock records each resolved package (name, version, integrity); `extension info` shows it.
- Docs: `capabilities/extensions.md` (an extension whose server is published to npm; the rules a package must follow), ADR-025.

## Acceptance

- An installed extension with `npx -y <package>@<version>` (a local test registry or a tarball fixture) runs its server in a session, with no `npx` on the `PATH`.
- `npx -y <package>` and `npx -y <package>@^1.0.0` leave it off with the reason; so does a package with unbundled dependencies, at install.
- Two scopes installing the same package and version share one cached copy.
- Live: `@falkenslab/moodle-mcp@0.2.0` through `npx` in a wrapper extension lists its tools in a real session, and in the desktop app.
- `verify` passes.

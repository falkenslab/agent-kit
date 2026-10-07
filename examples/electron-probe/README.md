# Electron probe

The probe of [ADR-026](../../.minispec/decisions/ADR-026-graphical-interface.md) (#41): does an agent built on agent-kit run inside an Electron app, packaged as an installer would ship it? A window, a chat controller (`createChatController()`) with the kit's `knowledge` extension on, and one turn that uses the kit's tools; everything is written to `probe.log`.

It isn't an example to copy: it's how the desktop application's risk was checked before building it, kept so it can be run again (a new Electron, a new SDK, macOS).

## Result (7 October 2026, Windows 11, Electron 44.7, electron-builder 26, SDK 0.3.293)

It works packaged, with two fixes:

1. **The CLI binary.** The SDK doesn't run the Claude Code CLI with Node: it spawns a native binary from `@anthropic-ai/claude-agent-sdk-<platform>-<arch>` (`claude.exe`, 209 MB on Windows). Packaged, the SDK resolves it inside `app.asar`, which a process can't execute, and the turn hangs with no error. Fixed with `asarUnpack` for that package (in `package.json`) and `pathToClaudeCodeExecutable` pointing into `app.asar.unpacked` (`PROBE_CLAUDE_PATH` below).
2. **The kit's plugin paths.** Packaged, the knowledge extension's skills disappear: the kit hands the CLI their plugin's path inside `app.asar`. Fixed with `asarUnpack` and `scripts/patch-asar-paths.mjs`, which rewrites that path to `app.asar.unpacked`. The kit will do it itself for every path it hands to another process.

With both, the packaged app completes the turn (`current_time`, `knowledge_index`) and offers the same skills as unpackaged (`knowledge:knowledge-ingest`, `knowledge:knowledge-lint`, `knowledge:knowledge-query`, `agent-kit:agent-help`).

Also found:

- **`ELECTRON_RUN_AS_NODE=1`** in the environment (VS Code's terminal sets it) makes Electron plain Node: the app fails with "does not provide an export named 'BrowserWindow'". Unset it to run the probe.
- **Size**: about 630 MB unpacked (Electron about 250 MB, the CLI binary 209 MB).
- **Signing**: `electron-builder` signs every executable it packs, the CLI binary included.

## Running it

Windows, from this folder. It needs a Claude token: the probe reads it from a `.env` given by path, Captain Whiskers' for instance.

```
npm run pack-kit      # the kit as published, into agent-kit.tgz (run it again after changing the kit)
npm install
npm run patch         # the plugin-path fix (after every npm install)
```

If npm blocks install scripts (it says `allow-scripts` when installing), Electron's binary isn't downloaded and `npm start` fails: `node node_modules/electron/install.js` downloads it. Packaging doesn't need it (electron-builder downloads its own).

Unpackaged:

```
set ELECTRON_RUN_AS_NODE=
set PROBE_ENV=..\captain-whiskers\.env
set PROBE_LOG_DIR=logs-dev
set PROBE_AUTOQUIT=1
npm start
type logs-dev\probe.log
```

Packaged:

```
npm run dist
set PROBE_CLAUDE_PATH=%CD%\dist\win-unpacked\resources\app.asar.unpacked\node_modules\@anthropic-ai\claude-agent-sdk-win32-x64\claude.exe
set PROBE_LOG_DIR=logs-packaged
"dist\win-unpacked\Agent Kit Probe.exe"
type logs-packaged\probe.log
```

A good run ends in `PROBE OK`, after an `action` line per tool and the `reply`. `PROBE TIMEOUT` (no turn after 90 seconds) is what a CLI that can't start looks like: try without `PROBE_CLAUDE_PATH` to see it.

| Variable | What it does |
| --- | --- |
| `PROBE_ENV` | A `.env` with `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`. |
| `PROBE_LOG_DIR` | Where `probe.log` (and the probe's workspace and runs) go; by default the app's user data folder. |
| `PROBE_CLAUDE_PATH` | The CLI binary to run, for the packaged app. |
| `PROBE_PROMPT` | Another message to send, e.g. `List, comma-separated and nothing else, the exact names of the skills you can invoke with the Skill tool.` to check the plugins. |
| `PROBE_AUTOQUIT` | Quit when done. |
| `PROBE_HIDDEN` | Don't show the window. |

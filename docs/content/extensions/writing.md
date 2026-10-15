---
sidebar_position: 6
title: Writing one
description: Build an installable extension from scratch - a weather extension with its own MCP server bundled into one file, its settings, read-only tools, chat labels, a logo, a skill and a command - then the rules every installed extension follows.
---

# Writing an installable extension

**Any Claude Code plugin is an extension**, as it is: its skills, commands and subagents load as they do in Claude Code, and its MCP servers start from its own `.mcp.json`. What agent-kit adds (labels for the chat, a logo for the catalog, capabilities, help) goes under `metadata["agent-kit"]` in its manifest, which Claude Code doesn't read. So one folder serves agents on the kit and Claude Code alike.

This page builds one from scratch: **weather**, the weather in the person's city, for an agent that plans with them. It has its own MCP server, a setting the person gives once (their city), a tool that only reads, a skill, a command and a logo. Then it lists the rules every installed extension follows. The finished extension is in Falken's Lab's marketplace, [agent-kit-extensions/weather](https://github.com/falkenslab/agent-kit-extensions/tree/main/weather), and installs with `my-agent extension add weather@falkenslab` once the marketplace is added.

## What you'll build

```text
weather/
├── .claude-plugin/plugin.json    its manifest: name, version, settings, agent-kit's data
├── .mcp.json                     its MCP server, as Claude Code declares it
├── dist/server.mjs               the server, bundled into one file (built, committed)
├── src/server.mjs                the server's source
├── package.json                  for building it (not installed with it)
├── skills/plan-the-day/SKILL.md  a skill
├── commands/today.md             a command: /weather:today
├── assets/logo.svg               its logo in a catalog
└── README.md                     for people
```

You need [Node.js](https://nodejs.org) 20 or later, an agent on agent-kit to try it (Captain Whiskers will do), and Claude Code 2.1.271 or later to validate it.

## 1. The server

An installed extension's tools come from its MCP server: a Node program the kit starts in a separate process, speaking MCP over its standard input and output. Write it with the official SDK:

```bash
mkdir weather && cd weather
npm init -y
npm install --save-dev @modelcontextprotocol/sdk zod esbuild
```

```js title="src/server.mjs"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Its settings, as variables: the extension's options fill them in (step 3).
const city = process.env.WEATHER_CITY ?? "";
const imperial = process.env.WEATHER_UNITS === "imperial";

const server = new McpServer(
  { name: "weather", version: "0.1.0" },
  // What it's for and its rules: the model has them from the start.
  { instructions: "The person's weather: forecast for their city (today and the next days). Use it before suggesting plans that depend on the weather; never guess the weather." },
);

async function locate(name) {
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1`);
  const place = (await response.json()).results?.[0];
  if (!place) throw new Error(`No place called ${name}.`);
  return place;
}

server.registerTool(
  "forecast",
  {
    title: "Weather forecast",
    description: "The weather now and the forecast for the next days in the person's city (or another, if they name one): temperature, rain chance and wind.",
    inputSchema: { city: z.string().optional().describe("Another city than the person's"), days: z.number().int().min(1).max(7).default(1) },
    // It only reads: plan mode lets it through.
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ city: other, days }) => {
    const name = other || city;
    if (!name) return { isError: true, content: [{ type: "text", text: "No city set: the person sets it in the extension's settings (city)." }] };
    const place = await locate(name);
    const units = imperial ? "&temperature_unit=fahrenheit&wind_speed_unit=mph" : "";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=${days}${units}`;
    const data = await (await fetch(url)).json();
    const t = imperial ? "°F" : "°C";
    const lines = [
      `${place.name} (${place.country}): now ${data.current.temperature_2m}${t}, wind ${data.current.wind_speed_10m} ${imperial ? "mph" : "km/h"}.`,
      ...data.daily.time.map((day, i) => `${day}: ${data.daily.temperature_2m_min[i]}–${data.daily.temperature_2m_max[i]}${t}, rain ${data.daily.precipitation_probability_max[i]}%.`),
    ];
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

await server.connect(new StdioServerTransport());
```

**Bundle it into one file.** The kit installs an extension's files and runs them as they are: it never runs `npm install`. So the server ships with what it needs inside it:

```json title="package.json (its scripts)"
{
  "private": true,
  "type": "module",
  "scripts": { "build": "esbuild src/server.mjs --bundle --minify --platform=node --format=esm --target=node20 --outfile=dist/server.mjs" }
}
```

```bash
npm run build      # dist/server.mjs, about 700 kB, with the SDK and zod inside
```

Commit `dist/server.mjs`, and keep `node_modules/` out (`.gitignore`): what's installed is the folder as it is in the repository. A server already published to npm needn't be in the folder at all: see [A server published to npm](#a-server-published-to-npm).

## 2. The manifest

`.claude-plugin/plugin.json` is the plugin's manifest, in [Claude Code's format](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema):

```json title=".claude-plugin/plugin.json"
{
  "name": "weather",
  "version": "0.1.0",
  "description": "The weather in your city, for an agent that plans with you: today and the next days, from Open-Meteo.",
  "author": { "name": "Ada Lovelace" },
  "license": "MIT",
  "keywords": ["weather", "planning"]
}
```

- `name` is kebab-case, and names everything else: its tools (`mcp__weather__forecast`), its skills and commands (`weather:plan-the-day`, `/weather:today`).
- `author` is an object (`{ name, email?, url? }`): a plain string fails validation.
- `keywords` are its [topics](installing.md#the-catalog) in a catalog.

Its server goes in `.mcp.json`, as Claude Code reads it:

```json title=".mcp.json"
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/dist/server.mjs"],
      "env": {
        "WEATHER_CITY": "${user_config.city}",
        "WEATHER_UNITS": "${user_config.units}"
      }
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` is the extension's folder, wherever it's installed. `${user_config.…}` comes next.

## 3. Its settings

The person's city is a setting: declared in the manifest as Claude Code's `userConfig`, asked when the extension is installed, and passed to the server where `.mcp.json` names it. Add to `plugin.json`:

```json title=".claude-plugin/plugin.json (its settings)"
"userConfig": {
  "city": { "type": "string", "title": "Your city", "description": "Where you are, e.g. Santa Cruz de Tenerife.", "required": true },
  "units": { "type": "string", "title": "Units", "description": "metric (°C, km/h) or imperial (°F, mph).", "options": ["metric", "imperial"], "default": "metric" }
}
```

- An option has a `type` (`string`, `number`, `boolean`, `directory`, `file`), a `title` and a `description` written for the person, and may have `required`, `default`, `sensitive` (a secret), `options` (fixed values), `multiple` and `min`/`max`. Every field is listed in the [reference](reference.md#userconfig).
- Without its required `city`, the extension stays off, saying how to set it; in Claude Code, it's asked when the plugin is enabled.
- A secret (`sensitive: true`) is kept apart and never shown back. What the person does with options is in [Configuring](configuring.md).

## 4. agent-kit's data

What the kit's chat, gates and catalog use goes under `metadata["agent-kit"]` in `plugin.json`. All of it is optional:

```json title=".claude-plugin/plugin.json (agent-kit's data)"
"metadata": {
  "agent-kit": {
    "catalog": { "logo": "assets/logo.svg" },
    "help": "Weather: `forecast` gives today and the next days in your city; /weather:today sums up the day.",
    "labels": {
      "forecast": {
        "en": { "label": "Checking the weather in {city}", "phrase": ["checked the weather", "checked the weather {n} times"] },
        "es": { "label": "Mirando el tiempo en {city}", "phrase": ["miró el tiempo", "miró el tiempo {n} veces"] }
      }
    }
  }
}
```

- **`labels`**: how the chat shows each tool, per language: the line while it runs (`{city}` takes the call's input) and how it counts in a [folded summary](../terminal-ui/tool-labels.md#folded-summaries). Without them, the chat shows the tool's name.
- **`help`**: what it says about itself, for the agent to tell the person ([awareness](../capabilities/awareness.md)'s `about_me`).
- **`catalog`**: its look in a catalog ([below](#6-its-look-in-a-catalog)).
- **Read-only tools**: nothing to declare here, since `forecast` says `readOnlyHint: true` itself and plan mode asks the server ([Read-only tools](#read-only-tools)).

Never put it at the top level of `plugin.json`: Claude Code would warn ("Unknown field"), and `--strict` validation would fail. Every field is in the [reference](reference.md#metadataagent-kit), and `agent-kit-metadata.schema.json` (in the kit's `schemas/`) lets an editor check it.

## 5. A skill and a command

The tool says what it does; a skill says **how to do a job well** with it, loaded only when the model needs it:

```markdown title="skills/plan-the-day/SKILL.md"
---
name: plan-the-day
description: Plan the person's day or week around the weather - check the forecast first, then suggest when to do what. Use when they ask what to do today, when to go out, or to plan outdoor activities.
---

# Planning around the weather

1. Call `forecast` (with `days` for a week). Never guess the weather.
2. Put what has to be outdoors on the dry, mild hours or days; say why ("rain 70% on Thursday").
3. Name a plan B when the rain chance is over 40%.
```

A command is a flow the person types (`/weather:today`):

```markdown title="commands/today.md"
---
description: Today's weather in your city, in two lines
---

Call `forecast` for today and tell the person, in two short lines, what the day looks like and whether they need a jacket or an umbrella.
```

Subagents go in `agents/*.md`, as in Claude Code. A skill can require a [capability](overview.md#capabilities) (`requires: knowledge-base`) to be offered only when another extension provides it.

## 6. Its look in a catalog

A square `logo` (and a wide `banner`, about 3:1) make it a card in a [catalog](installing.md#the-catalog): SVG, PNG, JPEG or WebP, inside its folder, named in `metadata["agent-kit"].catalog`. An image outside its folder, or of another type, isn't shown.

```xml title="assets/logo.svg"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="weather">
  <rect width="64" height="64" rx="14" fill="#1e66d0"/>
  <circle cx="26" cy="26" r="10" fill="#ffd23f"/>
  <path d="M22 46h22a8 8 0 0 0 0-16 11 11 0 0 0-21 3 7 7 0 0 0-1 13z" fill="#fff"/>
</svg>
```

## 7. Validate it

```bash
claude plugin validate --strict .
```

It must pass with no warnings: the same check a marketplace's CI runs. Then [try it in an agent](developing.md) (`my-agent extension add ./weather --link --set city=Madrid`), and [publish it](publishing.md).

A `README.md` at its root is for people: what it does, what it offers (its tools, skills, commands), its settings, how to install it. The model never reads it; `extension info` says where it is.

## The rules every installed extension follows

### Its servers

- **Node, or npx.** `command` is `node` and the first of `args` is its script, inside the extension (`${CLAUDE_PLUGIN_ROOT}/…`); the rest of `args` reach the script. Or `command` is `npx`, with `-y` and a package at an exact version ([A server published to npm](#a-server-published-to-npm)). Any other command (`python`, `docker`, `npx` without an exact version) leaves the extension off, saying why: the kit runs installed code only through its launcher.
- **Its tools' names** come from its server's: `mcp__<server>__<tool>`.
- **Its environment** is the system's variables (where things are, the desktop session: `PATH`, `TEMP`, `HOME`, `APPDATA`, `PROGRAMFILES`, `DISPLAY`, `XDG_*`, the language and time zone…) and those in its `env`, nothing else of the agent's: not its credentials. In `args` and `env`, `${CLAUDE_PLUGIN_ROOT}` is its folder, `${CLAUDE_PLUGIN_DATA}` its [data folder](#its-data), `${user_config.KEY}` one of its options, and `${VAR}` the agent's own variable (`"API_KEY": "${API_KEY}"`, from the agent's `.env`).
- **What it's for and its rules** go in its server's `instructions`: the model has them from the start. Keep them short; procedures go in skills.
- **It runs from what's installed**: no dependencies, or bundled into one file with them. A folder installed with its development `node_modules` is hashed whole every session (seconds for tens of thousands of files): install the built extension, not the development folder, and [link it](developing.md#linking-it) while developing.

### Read-only tools

[Plan mode](../core-concepts/modes.md#plan) lets through only the tools known to only read. An installed extension says which in one of two ways:

- **Its servers' hints**, when its manifest has no `readOnlyTools`: a tool whose server declares `annotations: { readOnlyHint: true }` goes through, asked of the running session when plan mode meets the call, so a server that gains a tool needs no change in the manifest. A server still connecting, one turned off, or one that doesn't answer in 3 seconds counts as no.
- **Its manifest's list**, `readOnlyTools` in `metadata["agent-kit"]`: the whole answer, whatever its servers say. An empty list (`[]`) means none of its tools goes through. A server is the code the kit trusts least, so its hints only fill the list's absence: write the list when you don't trust, or can't change, what a server says.

`extension info <name>` says which applies (`Only read  roll (its manifest)`, or `what its servers mark readOnlyHint`).

### Its data

An installed extension has a data folder of its own, named in its servers' `args` and `env` as `${CLAUDE_PLUGIN_DATA}`, like Claude Code's for a plugin: `<scope>/.data/<name>/` (e.g. `~/.my-agent/extensions/.data/weather/`), or a workspace's private folder in the agent's ([Workspaces](workspaces.md)). Keep there what must last: a signed-in browser profile, a cache, a downloaded browser.

```json
{ "mcpServers": { "moodle": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/dist/server.mjs", "--profile", "${CLAUDE_PLUGIN_DATA}/profile"] } } }
```

- It's created when a session starts the extension, outside its plugin and its hash: what the server writes there never turns the extension off.
- It's kept when the extension is installed again or updated, and when it's removed unless the person says to delete it.
- Never write in the extension's own folder: an update replaces it, and a changed file leaves the extension off until it's installed again.

### A server published to npm

An MCP server published to npm on its own (usable with `npx` in Claude Code or Codex) needn't be copied into the extension: its `.mcp.json` runs it with `npx`, and the extension is its manifest, that file, and its skills and commands. Falken's Lab's [moodle extension](https://github.com/falkenslab/agent-kit-extensions/tree/main/moodle) is one:

```json
{
  "mcpServers": {
    "moodle": {
      "command": "npx",
      "args": ["-y", "@falkenslab/moodle-mcp@0.3.0"],
      "env": { "MOODLE_MCP_SITES": "${user_config.sites}" }
    }
  }
}
```

Claude Code runs that `npx` as it is. The kit doesn't run npx (it would need npm, a `node` on the `PATH` and the network while the server connects, none of which a desktop app has). Instead:

- **When the extension is installed**, the kit fetches the package from the npm registry, checks it against the registry's `integrity` (sha512), and keeps it in the agent's package cache, `<agent scope>/.npm/<package>/<version>/`, shared by every extension and scope running that version. The lock records it (`packages`: its integrity, a SHA-256 over its files, its `bin`).
- **When a session starts**, the server is the package's `bin` run with the agent's own Node (Electron's, in a desktop app) through the launcher, like any installed server. No npm, no network: a package missing from the cache, or whose files changed there, leaves the extension off, saying to install it again.
- **Only an exact version**: `<package>@x.y.z`. A published npm version never changes, so the extension runs the same code every time; without a version, a range or a tag (`@latest`), it can't be installed. The only option is `-y` (`--yes`).
- **The package brings what it needs**: the kit installs no dependencies and runs no script. A package whose `dependencies` aren't all in `bundleDependencies`, with install scripts (`preinstall`, `install`, `postinstall`) or native code to build (`binding.gyp`) can't be installed, saying why. Bundle the server, and list in `bundleDependencies` what can't be bundled (`playwright-core`).
- **Its `bin`** is the package's only one, or the one named like the package (`moodle-mcp` for `@falkenslab/moodle-mcp`), as npx picks it.
- **Updating the server** is a new version in `.mcp.json` and a new version of the extension; skills written for that version go in the same change.

### What it can't do

Unlike an extension in your agent's code ([The kit's own](the-kits-own.md#writing-one-in-your-agents-code)): hooks (none of its plugin's run), the kit's panels, a store passed from code, its own folders for the file tools. Its subagents get no `Bash`: one that lists it loses it, and one without `tools` gets none. Its tools go through the same gates as any other: the approval in interactive mode, plan mode, the transcript.

### When it's turned off

Turning an extension off in the session, or closing the session, ends its servers and every process they started (a browser it opened, with all its own processes), so a profile it held isn't left locked for the next start. A server needn't clean up on its own, but it may: closing a browser when its input ends saves the browser's state properly.

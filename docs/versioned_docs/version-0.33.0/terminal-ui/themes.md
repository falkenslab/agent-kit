---
sidebar_position: 6
title: Themes
description: The color theme by roles, its defaults, and how an agent changes some of them.
---

# Themes

The terminal UI's colors come from one theme of **roles**: what a color is for, not where it's drawn. An agent changes only the roles it wants; everything else keeps the kit's defaults.

```ts
await runChatInk(opener, {
  runsDir,
  theme: { toolResult: "yellow", selection: "#00ff00" },
});
```

## Roles

| Role | Used for | Default |
| --- | --- | --- |
| `agent` | the agent's label (`ui.agent()`) | `cyanBright` |
| `user` | the prompt label (`ui.user()`) | `white` |
| `userBar` | the background of the person's lines in the Ink chat | `#373737` |
| `accent` | the border of the approval and manual-intervention panels | `#d77757` |
| `working` | the spinner with what the agent is doing, and the mode in the status bar | `#89b4fa` |
| `code` | inline code and code blocks in replies | `#b1b9f9` |
| `toolBullet` | the `●` before each tool call | `green` |
| `toolLabel` | a tool call's label | dim |
| `toolResult` | the one-line result under a tool call (errors use `error`) | dim |
| `selection` | the focused option of choice lists (approval panels, `/resume`, the wizard), in bold | `#d77757` |
| `border` | the frame around the prompt and the `/resume` list | `gray` |
| `dim` | secondary text: notices, summaries, hints | dim |
| `heading` | titles (checkpoints, the wizard) | bold |
| `action` | the plain console's `[action]` lines | `magenta` |
| `success`, `warn`, `error` | outcomes, warnings, errors | `green`, `yellow`, `red` |

## Values

Each role takes one of:

- **a color name**: `"red"`, `"gray"`, `"cyanBright"`, `"magentaBright"`… (the names of picocolors and Ink);
- **a hex**: `"#ff8800"` (24-bit color);
- **a function** `(text) => string`, for anything else: bold, underline, a background, a gradient…

```ts
import pc from "picocolors";

theme: {
  agent: (text) => pc.bold(pc.cyan(text)),
  toolResult: "gray",
  error: (text) => pc.bgRed(pc.white(` ${text} `)),
},
```

Roles drawn by Ink itself (`accent` for the panels' border, `border`, `selection`) take a name or a hex only: a function there falls back to the default color. `userBar` is a background: use a name or a hex.

## Where to set it

- The `theme` option of `runChatInk()`, `runChatTui()`, `createProgressView()` and `runWizard()`.
- `setTheme(overrides)` once, for a host that sets it before anything else.

There's one theme per process. Each call to `setTheme()` (or an entry point with `theme`) starts again from the defaults with its overrides; an entry point without `theme` keeps the current one. `getTheme()` returns it and `DEFAULT_THEME` is the kit's.

```ts
import { DEFAULT_THEME, getTheme, setTheme } from "@falkenslab/agent-kit";

setTheme({ accent: "#e5b53a", selection: "#e5b53a" });
getTheme().agent === DEFAULT_THEME.agent; // true
```

## Your own texts follow the theme

The `ui` palette functions draw their role in the current theme, so texts an agent draws with them change with it:

```ts
import { ui } from "@falkenslab/agent-kit";

promptLabel: `${ui.user("you>")} `,
agentLabel: ui.agent("Scout>"),
welcomeMessage: ui.dim("Ask me anything. /exit to leave."),
```

| Function | Role |
| --- | --- |
| `ui.agent`, `ui.user`, `ui.action`, `ui.heading`, `ui.success`, `ui.warn`, `ui.error`, `ui.dim` | the role of the same name |
| `ui.accent`, `ui.working`, `ui.code`, `ui.toolBullet`, `ui.toolLabel`, `ui.toolResult` | the role of the same name |
| `ui.userBar` | `userBar`, as a background |
| `ui.bold`, `ui.italic`, `ui.strike` | styles, not themed |

## Without color

When the terminal has no color support (or `NO_COLOR` is set), names and hexes draw plain text; functions are still called, so a function should use a color library that honors it (picocolors does). Widths are always measured without escape codes, so a theme never changes the layout, and the session log is always plain text.

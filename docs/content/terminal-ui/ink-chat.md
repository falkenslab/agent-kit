---
sidebar_position: 1
title: Ink chat
description: runChatInk() - the Claude Code-like terminal chat - with every option, shortcut and behavior.
---

# Ink chat

`runChatInk()` is a full terminal chat built with [Ink](https://github.com/vadimdemedes/ink), modelled on the Claude Code CLI: the reply streams in with its markdown rendered, tool calls appear one by one with their results, checkpoints are panels, and a status bar shows the mode, turns, tokens and context.

```ts
function runChatInk(options: Options | SessionOpener, tuiOptions?: InkChatOptions): Promise<void>;
```

It resolves when the chat ends (an exit command, or Ctrl+C / Ctrl+D at an idle prompt), after closing the session. Without a TTY, or with `plain: true`, it runs the [plain chat](plain-chat.md) with the same options.

## Two ways to start it

**With a session opener and a runs folder** (recommended): every run gets its own folder, its conversation is kept there, and it can be resumed with `--continue` or `/resume`.

```ts
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
});
```

The opener is called with the run folder to use (a new one, the latest with `--continue`, or the one picked in `/resume`) and returns either `Options` or `buildSessionOptions()`'s whole result, whose `modeControl`, `toolLabels` and `extensions` the chat picks up.

**With fixed options**: one session, logs wherever you say, no resuming.

```ts
const { options, modeControl } = await buildSessionOptions(config, runDir, spec);
await runChatInk(options, { modeControl, sessionLogPath: path.join(runDir, "session.log") });
```

## Options

### Session and files

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `runsDir` | `string` | | The runs folder, with a session opener. See [Runs and resuming](../sessions/runs-and-resuming.md). |
| `sessionLogPath` | `string` | | With fixed options: where to mirror what the terminal shows. With `runsDir`, each run's `session.log` is used instead. |
| `historyPath` | `string` | | The ↑/↓ history file (JSON lines), kept across runs. Without it, history lasts one session. |
| `historyLimit` | `number` | `100` | Entries kept in the history. |
| `initialPrompt` | `string` | | Sent as the first turn before the person types anything (logged, not shown). For an agent that should act at startup. Skipped when resuming a conversation. |
| `exitCommands` | `string[]` | `["/exit", "/quit"]` | Lines that end the chat (case-insensitive). |

### Look and texts

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `header` | `HeaderInfo` | | `{ title, fields?, art? }`: pinned at the top in full screen, printed once otherwise. |
| `welcomeMessage` | `string` | | Printed once at the start (and logged). |
| `promptLabel` | `string` | `"> "` | The prompt's label. Leading newlines only reach the log. |
| `agentLabel` | `string` | | The label before the agent's reply in the log and the plain chat, e.g. `ui.agent("Scout>")`. |
| `fullscreen` | `boolean` | `false` | Take the whole terminal. See [Full screen](#full-screen). |
| `mode` | `Mode` | | Shown in the status bar when there's no mode control. |
| `theme` | `Partial<Theme>` | | Colors. See [Themes](themes.md). |
| `language` | `string` | | The kit's language. See [Languages](../sessions/languages.md). |
| `formatAction` | `(toolName, input) => string` | `createFriendlyToolLabel()` | Tool call labels. See [Tool labels](tool-labels.md). |
| `toolPhrase` | `(toolName) => ToolPhrase \| undefined` | | How your tools count in a folded summary. See [Tool labels](tool-labels.md#folded-summaries). |
| `toolLabels` | `ToolLabels` | | The extensions' labels (`buildSessionOptions()`'s `toolLabels`), before `formatAction` and `toolPhrase`, for plain `Options`: with a session opener, the ones it returns. See [Tool labels](tool-labels.md#an-extensions-labels). |
| `toolDetail` | `"full" \| "calls" \| "summary"` | `"full"` | How much of the tool calls shows until Ctrl+O. See [Tool labels](tool-labels.md#how-much-shows). |
| `formatResult` | `ResultFormatter` | | Your own result line per tool, or none. See [Tool labels](tool-labels.md#results-for-your-tools). |
| `renderApproval` | `(prompt) => ReactNode` | | Replaces the preview of the approval panels. See [Approval panels](#approval-panels). |

### Behavior

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `modeControl` | `ModeControl` | | With fixed options: enables Shift+Tab mode switching and shows the live mode. |
| `promptSuggestions` | `boolean` | `true` | Show the model's predicted next message in the empty prompt (Tab takes it). |
| `firstPromptSuggestion` | `string` | | The suggestion before the first turn (the SDK only suggests after a turn). |
| `terminalIntegration` | `boolean` | `true` | The tab title, the taskbar progress and `/copy`. See [Terminal integration](#terminal-integration). |
| `plain` | `boolean` | `false` | Use the plain readline chat even on a TTY. |

## What's on screen

```text
 ▄▀▀▄   Scout
 █  █   mode guided

● Searching the web for "TypeScript 6 release"
  ⎿  Found 8 results (+7 lines)
● Fetching https://devblogs.microsoft.com/typescript/…
  ⎿  TypeScript 6.0 is now available…

● TypeScript 6.0 shipped in March. The main changes are:

  - **Faster builds** through…

✻ Worked for 12s

╭───────────────────────────────────────────────╮
│ you> █                                        │
╰───────────────────────────────────────────────╯
⏵⏵ guided (shift+tab) · 3 turns · 12.4k in (+32.8k cached) / 1.3k out · context 8%
```

- **The agent's reply** follows a `●`, with its markdown rendered (bold, italics, inline code, lists, headings, quotes, code blocks, and tables as grids), also while it streams.
- **Tool calls** show one by one: `●` and the tool's label, then `⎿` and the first line of its result (red if it failed, `…` while it runs). Under a subagent call, the subagent's own tool calls (the latest five). **Ctrl+O** folds each group of consecutive calls into one summary line ("Read 2 files, ran 1 shell command") and back. `toolDetail` shows less from the start: the calls without results, or the summary lines (see [How much shows](tool-labels.md#how-much-shows)).
- **The spinner** shows what the agent is doing, the seconds, and `esc to interrupt`; with a subagent working, a second line `↳` shows its action.
- **The task list**: on a long job the agent keeps a list of tasks with the SDK's `TodoWrite` tool, and the chat draws it under the spinner, above the prompt: `☐` pending, `◼` in progress (in bold, and the spinner says what it's doing), `☑` done. It stays while any task is left, also between turns, and goes away when they're all done. The `TodoWrite` calls themselves don't show in the history, and at most eight tasks show (the rest are counted). The progress view draws it too.
- **Each turn ends** with `✻ Worked for Ns`.
- **The status bar** shows the mode (`(shift+tab)` if it can switch), the turns, the session's new input tokens with the ones read again from the cache apart (left out when the terminal is too narrow), its output tokens, and how full the context window is. See [Context and cost](../sessions/context-and-cost.md#watching-it).

## Keyboard

| Keys | Action |
| --- | --- |
| Enter | Send. During a turn the line is queued (shown as `queued: …`) and sent after. |
| `\` + Enter, Ctrl+J | New line (multi-line message). |
| Tab | Complete a `/command` or an `@file`, or take the suggestion. |
| ↑ / ↓ | History. On an empty prompt, ↑ first takes back the last queued line to edit it. |
| Ctrl+R | Search the history backwards; Ctrl+R again for older matches, Enter takes it, Esc cancels. |
| Ctrl+W, Ctrl+K, Ctrl+U | Delete a word back, to the line end, the whole line. |
| Ctrl+← / Ctrl+→, Home / End, Ctrl+A / Ctrl+E | Move by word, to the start or end. |
| Delete, Backspace | Delete forward, backward (a pasted block as a whole). |
| `?` on an empty prompt | The shortcuts panel. |
| Esc | Interrupt the turn. |
| Ctrl+C | Interrupt the turn (or answer Stop to a checkpoint); at an idle prompt, leave. |
| Shift+Tab | Next mode (guided → interactive → plan). |
| Ctrl+O | Fold or unfold tool calls (unfolded: every call with its result). |

**Pasting** a multi-line block folds it into a token, `[Pasted text #1 +12 lines]`, sent expanded. **`@`** followed by part of a path suggests the project's files (Tab completes).

## Local commands

| Command | What it does |
| --- | --- |
| `/exit`, `/quit` | Leave (configurable with `exitCommands`). |
| `/copy` | Copy the last reply to the clipboard (OSC 52), with terminal integration on. |
| `/resume` | Pick an earlier conversation to resume, with a runs folder. |
| `/extensions` | What the session runs with, what's off and why, and the [installed extensions](../capabilities/extensions.md#installing-extensions); `/extensions enable <name>` or `disable <name>` reopens the session with or without one, keeping the conversation (with a session opener). |
| `/plan` | Switch into [plan mode](../core-concepts/modes.md#plan), or back to the mode before it; offered only when the session's mode can switch. |

Any other `/command` is checked against the session's commands (skills and plugin commands included): an unknown one shows "Unknown command" instead of reaching the model as text.

## Full screen

With `fullscreen: true` the chat takes the terminal's alternate screen:

- the header stays pinned at the top, the prompt and the status bar at the bottom;
- the history scrolls in its own view: PageUp/PageDown and the mouse wheel move it, Ctrl+End or typing goes back to the bottom, and output arriving while you're scrolled up doesn't move it (the status bar shows `↓ N more lines (Ctrl+End)`);
- **dragging selects text; a right-click copies the selection** to the clipboard and clears it, as in Windows Terminal;
- the terminal is cleared when the chat ends.

Without it the chat is inline: the history goes to the terminal's own scrollback, and the header is printed once at the start.

## Approval panels

Checkpoints are panels in the chat (see [Human in the loop](../human-in-the-loop/overview.md)). Replace the preview (title and lines) with your own rendering; the choices stay:

```tsx
import { Box, Text } from "ink";
import type { RenderApproval } from "@falkenslab/agent-kit";

const renderApproval: RenderApproval = (prompt) => (
  <Box flexDirection="column">
    <Text bold color="yellow">{prompt.title}</Text>
    {prompt.lines.map((line, i) => (
      <Text key={i} wrap="truncate-end">{line}</Text>
    ))}
  </Box>
);

await runChatInk(opener, { runsDir, renderApproval });
```

## Terminal integration

On by default (`terminalIntegration: false` turns it off):

- the **tab title** is the header's title, and `✻ <title> — working…` while a turn runs (OSC 0);
- the **taskbar button** shows indeterminate progress during a turn (Windows Terminal, OSC 9;4);
- when a turn ends while the window isn't focused, the taskbar button turns yellow until the window is focused again (focus reporting);
- **`/copy`** copies the last reply (OSC 52).

Terminals that don't understand these sequences ignore them.

## The session log

Everything the plain console would print is mirrored to the session log: the welcome message, each line typed, the replies, `[action]` lines, notices and errors, without colors. The screen and the log are drawn differently (the log is plain text), but tell the same story.

## Header

```ts
header: {
  title: "Captain Whiskers",
  fields: { mode: "guided", workspace: "course-2026", "agent-kit": agentKitVersion() },
  art: [
    pc.gray("   ▄▄███▄▄"),
    pc.gray("  ▀▀▀▀▀▀▀▀▀"),
    pc.yellow("    /\\_/\\"),
    pc.yellow("   ( o.█ )"),
    pc.yellow("    > ^ <"),
  ],
},
```

`fields` are shown after the title, `name value`, in order; `agentKitVersion()` gives the version of the kit in use, worth showing so a screenshot or a bug report says which one. `art` is drawn left of the title, one string per row, colored as you like. **Use single-column characters only** (ASCII, box and block characters such as `▄ ▀ █`): emoji are measured differently by the kit and by terminals, and would shift the title.

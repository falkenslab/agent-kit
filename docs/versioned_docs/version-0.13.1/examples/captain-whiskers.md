---
sidebar_position: 1
title: Captain Whiskers
description: A walk through the kit's example agent, piece by piece.
---

# Captain Whiskers

[Captain Whiskers](https://github.com/falkenslab/agent-kit/tree/main/examples/captain-whiskers) is the kit's example: a retired pirate cat who tells jokes in the terminal. It's small, but it uses most of the kit, so it's the best template for an agent of your own.

![Captain Whiskers running full screen in Windows Terminal](/captain-whiskers.png)

## Running it

From a clone of the kit:

```bash
npm install && npm run build           # the kit, once and after each change to it
cd examples/captain-whiskers
npm install
npm start                               # full screen, in the system's language
npm start -- --language=en              # in English
npm start -- --continue                 # resume the latest conversation
CAPTAIN_MODE=interactive npm start      # ask before every tool call
CAPTAIN_INLINE=1 npm start              # inline, with the terminal's scrollback
CAPTAIN_PLAIN=1 npm start               # the plain readline chat
```

It needs `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` in the environment or in `examples/captain-whiskers/.env`; without one, it offers to create a token.

## Files

```text
examples/captain-whiskers/
├── agent.ts                    everything: texts, tools, crew, spec, chat
├── package.json                "@falkenslab/agent-kit": "file:../.."
├── plugin/
│   ├── .claude-plugin/plugin.json   { "name": "captain-whiskers" }
│   ├── skills/pirate-joke/SKILL.md  how to build a pirate pun
│   ├── skills/miau/SKILL.md         keep the feline tone
│   ├── commands/joke.md             /captain-whiskers:joke
│   └── commands/fresh-joke.md       /captain-whiskers:fresh-joke
└── .run/                        one folder per run (git-ignored)
```

## 1. Environment and language

```ts
const envPath = path.join(__dirname, ".env");
try {
  process.loadEnvFile(envPath);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const { language } = detectLanguage();
```

`detectLanguage()` resolves the kit's language (`--language`, else the system's) so the captain can pick his own texts: his name and on-screen texts come in the four languages, in a `TEXTS` record keyed by language. See [Languages](../sessions/languages.md#an-agents-own-texts).

## 2. A tool of his own

The clock cabin boy needs the time. Rather than giving a subagent `Bash`, the captain has a read-only tool in an in-process MCP server:

```ts
const clock = createSdkMcpServer({
  name: "clock",
  version: "1.0.0",
  tools: [
    tool(
      "current_time",
      "The system's current date and time: ISO 8601 in UTC, the local date and time, the time zone and the day of the week.",
      {},
      async () => {
        const now = new Date();
        const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
        const local = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "long", timeZone }).format(now);
        return { content: [{ type: "text" as const, text: JSON.stringify({ utc: now.toISOString(), local, timeZone }) }] };
      },
      { annotations: { readOnlyHint: true } },
    ),
  ],
});
```

## 3. The prompts, in English

```ts
const SYSTEM_PROMPT = `You are ${text.name}, a retired pirate cat who now "commands" this terminal as if it
were the bridge of a ship. …

Your crew (subagents, launch them with the Agent tool):
- minino-buscachistes: if you're asked for a new or fresh joke, …, send them to find candidates on the web.
- loro-critico: before telling a joke the kitten brought, pass them the one you like best. …
- grumete-del-reloj: if you're asked the time, the date or how long until something, ask them.

Be brief: 3-4 sentences per reply at most, always in character.`;
```

Everything the model reads (prompts, skills, commands) is in English, with the captain's name in the chosen language: text in another language pulls the replies towards it.

## 4. The crew

```ts
const SUBAGENTS: Record<string, AgentDefinition> = {
  "minino-buscachistes": {
    description: "Kitten cabin boy who searches the web for short jokes about pirates, cats or sailors and returns candidates with their source.",
    prompt: `You are Minino, the youngest cabin boy on ${text.name}'s ship. …`,
    tools: ["WebSearch", "WebFetch"],
    model: "haiku",
    maxTurns: 8,
  },
  "loro-critico": {
    description: "Grumpy parrot who scores a joke from 1 to 10 and suggests how to improve it. Uses no tools.",
    prompt: `You are Perico, ${text.name}'s grumpy parrot. …`,
    tools: [],
    model: "haiku",
    maxTurns: 1,
  },
  "grumete-del-reloj": {
    description: "Cabin boy who reads the ship's clock (the system's date and time) and does time arithmetic.",
    prompt: "You are the clock cabin boy. To answer, read the ship's clock with the current_time tool …",
    tools: ["mcp__clock__current_time"],
    model: "haiku",
    maxTurns: 3,
  },
};
```

Three small subagents on `haiku`: one searches the web, one only thinks, one uses the captain's own tool. See [Subagents](../capabilities/subagents.md).

## 5. The spec

```ts
const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildMcpServers: () => ({ clock }),
  pluginRoots: () => [path.join(__dirname, "plugin")],
  buildSubagents: () => ({ agents: SUBAGENTS, allowedSubagentTypes: Object.keys(SUBAGENTS) }),
  disallowedTools: ["Read", "Write", "Glob"],
  skills: ["captain-whiskers:pirate-joke", "captain-whiskers:miau"],
  settingSources: [],
};
```

- `disallowedTools`: the captain has no business with files.
- `skills` and `settingSources: []`: only his two skills, and nothing from the machine's Claude Code configuration. About 11.4k input tokens per call instead of 15.7k. See [Context and cost](../sessions/context-and-cost.md).

## 6. The chat

```ts
const runsDir = path.join(__dirname, ".run");
const modes: Mode[] = ["autonomous", "guided", "interactive"];
const mode = modes.find((m) => m === process.env.CAPTAIN_MODE) ?? "autonomous";
const config: BaseSessionConfig = { mode, projectDir: __dirname };

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir,
  header: { title: text.name, fields: { [text.mode]: messagesFor(language).mode(mode) }, art: LOGO },
  mode,
  theme: { accent: "#e5b53a", selection: "#e5b53a" },
  plain: process.env.CAPTAIN_PLAIN === "1",
  fullscreen: process.env.CAPTAIN_INLINE !== "1",
  firstPromptSuggestion: text.suggestion,
  welcomeMessage: pc.gray(text.welcome),
  promptLabel: `\n${ui.user(text.you)} `,
  agentLabel: ui.agent(`${text.name}>`),
  historyPath: path.join(runsDir, "history.jsonl"),
});
```

- **A session opener with `runsDir`**: every run in `.run/<timestamp>/`, resumable with `--continue` or `/resume`.
- **The header**: the translated name, the mode in the kit's language, and a logo in single-column block characters.
- **A theme**: the approval panels' border and the focused option in doubloon gold; everything else keeps the kit's colors.
- **The first suggestion**: Tab takes it before the first turn.

## Things to try

- `/captain-whiskers:joke` for a classic, `/captain-whiskers:fresh-joke` to send the crew to the web.
- "What time is it, and how long until New Year's Eve?" (the clock cabin boy).
- `CAPTAIN_MODE=interactive npm start` and watch every tool call stop at the approval panel; Shift+Tab switches to guided.
- Ctrl+O to fold the tool calls; drag and right-click to copy; `?` for the shortcuts.
- `/exit`, then `npm start -- --continue`.

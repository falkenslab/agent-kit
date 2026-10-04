<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-readme-dark.svg">
    <img src="docs/assets/logo-readme.svg" alt="agent-kit" height="64">
  </picture>
</h1>

[![npm](https://img.shields.io/npm/v/@falkenslab/agent-kit?logo=npm)](https://www.npmjs.com/package/@falkenslab/agent-kit)
[![npm downloads](https://img.shields.io/npm/dm/@falkenslab/agent-kit)](https://www.npmjs.com/package/@falkenslab/agent-kit)
[![types](https://img.shields.io/npm/types/@falkenslab/agent-kit)](https://www.npmjs.com/package/@falkenslab/agent-kit)
[![node](https://img.shields.io/node/v/@falkenslab/agent-kit)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/@falkenslab/agent-kit)](LICENSE)
[![docs](https://img.shields.io/badge/docs-falkenslab.github.io%2Fagent--kit-4453b8)](https://falkenslab.github.io/agent-kit/)

A foundation for building AI agents on top of the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). It isn't an agent itself: it solves once what every agent needs (human oversight, safety, memory and a good terminal interface), so each concrete agent only has to write what belongs to its own domain: what it knows how to do, with which tools, and how it talks.

## What an agent built with it can do

- **Work at different levels of oversight.** Autonomous, guided (it asks for permission before anything that can't be undone or that other people will see) or step by step (it asks before every action), and a plan mode where it only reads and plans until you let it act. Within the same conversation you can switch among guided, step by step and plan.
- **Ask a person for help.** It asks for approvals, or stops so someone can do something by hand, such as signing in to a website. It can be answered from the keyboard or from another program driving it, for example a desktop app.
- **Remember between sessions.** It keeps its own knowledge base, a small wiki of notes that grows with every session, and keeps the original documents you give it or that it downloads untouched. Each conversation stays in the project's folder, so you can pick it up again with `--continue` (the latest one) or `/resume` (any of them).
- **Speak your language.** Its interface comes in English, Spanish, French or German, the system's by default or the one you ask for with `--language=fr`, and it answers in that language unless you write to it in another one.
- **Delegate to subagents safely.** Only to the ones it declares, always waiting for their result, and without the main agent being able to slip past its own limits through them.
- **Stay within limits.** It only reads and writes in the folders that belong to it, and never in protected files, such as one holding passwords.
- **Use external tools.** MCP servers of its own or of the project, and skills and commands organized in plugins.
- **Leave a trail.** It records every action and the whole conversation, with secrets hidden.
- **Look the way you want.** The terminal's colors come from a theme by roles (the agent's replies, tool results, the focused option, borders…): pass only the ones you want to change, as a color name, a hex or a function.
- **Chat in a terminal the way Claude Code does.** Full screen, with the reply written live and its markdown already formatted, the tools it uses shown in as much detail as the agent chooses (each call with its result, the calls alone, or one line per group; Ctrl+O unfolds them), panels for approvals, history and search, a suggestion for the next message, pasted blocks, file mentions with `@`, mouse selection (right-click to copy), and the agent's status in the tab and in the Windows taskbar.
- **Also work without a terminal.** The same foundation runs inside a desktop app or a server, which bring their own interface.

## Examples

### Captain Whiskers

[Captain Whiskers](./examples/captain-whiskers) is a toy agent to see the kit in action: a retired pirate cat who tells jokes in the terminal, in your language. It starts full screen with its logo and has a small crew of subagents: one looks for new jokes on the web, another rates them before they're told, and a third tells the time with a tool of the captain's own. It lets you try the different levels of oversight and is the best starting point for an agent of your own. Its README explains how to run it.

![Captain Whiskers in Windows Terminal: his logo with the mode and the agent-kit version at the top, his crew at work in the middle, a task list under the spinner, and the framed prompt and status bar at the bottom](docs/assets/captain-whiskers.png)

See [everything he can do](https://falkenslab.github.io/agent-kit/docs/next/examples/captain-whiskers#what-he-can-do), with screenshots.

### teacher-agent

[teacher-agent](https://github.com/falkenslab/teacher-agent) is a real assistant for Moodle teachers. It signs in with your account in a Chrome window and works as you would: it grades submissions, answers in the forum, creates or reviews content and sums up how the class is going. It asks for your permission before publishing anything students will see, and takes notes about the course to remember everything in the next session.

Oversight, memory, safety and the chat come from the kit; teacher-agent brings what it knows about Moodle and driving the browser.

## Installation

```
npm install @falkenslab/agent-kit
```

To try changes to the kit without publishing them, point to a local clone with `"file:../agent-kit"` in your `package.json` and build it with `npm run build` after each change.

Requires Node.js 20 or later.

## A minimal agent

An agent only describes what belongs to it (who it is, which MCP servers, skills and subagents it has) and picks a level of oversight; the kit sets up the session and the chat:

```ts
import path from "node:path";
import { buildSessionOptions, ensureClaudeAuth, runChatInk, type AgentSpec, type BaseSessionConfig } from "@falkenslab/agent-kit";

// The only part specific to the agent: who it is and what it has.
const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You are a pirate cat who tells jokes. Always answer in character.",
  buildMcpServers: () => ({}), // its own MCP servers, if any
  pluginRoots: () => [], // folders with skills and commands
  buildSubagents: () => undefined, // subagents, if it delegates to any
};

await ensureClaudeAuth(); // offers to create a Claude token if it finds none

const config: BaseSessionConfig = { mode: "guided", projectDir: process.cwd() };

// Each run gets a folder of its own under .run/ (keep it out of git): its log, its
// transcript and the conversation, to pick it up again with --continue or /resume.
await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: { title: "My agent" },
  mode: config.mode, // Shift+Tab cycles through guided, step by step and plan
  fullscreen: true,
  theme: { toolResult: "gray", selection: "#ffb86c" }, // only the colors you want to change
});
```

Save it as `agent.ts` in a project with the kit and `tsx` installed and `"type": "module"` in its `package.json`, and run it with `npx tsx agent.ts`. Captain Whiskers is this same skeleton with more pieces: skills, subagents and its logo.

## Documentation

The full documentation is at **[falkenslab.github.io/agent-kit](https://falkenslab.github.io/agent-kit/)**: a tutorial, guides for every part of the kit (modes, human in the loop, security, tools, subagents, the knowledge base, the terminal UI, runs, languages, themes, hosts without a terminal), recipes, and an API reference generated from the source, for each released version.

For whoever works on the kit itself, the specification in [`.minispec/`](./.minispec/README.md) explains how each part is built and why, including the SDK behaviors checked by hand that motivate several of its safeguards.

## Development

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the kit into `dist/` |
| `npm run typecheck` | Checks the types without building |
| `npm run lint` | Checks the code style |
| `npm test` | Runs all the tests |
| `npm run docs:install` | Installs the documentation site's dependencies (once) |
| `npm run docs:start` | Serves the documentation site locally, reloading on changes |
| `npm run docs:build` | Builds the documentation site (fails on broken links) |

To run a single test file:

```
npx tsx --test test/tui/promptErrors.test.ts
```

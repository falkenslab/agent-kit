---
name: update-docs
description: Keep agent-kit's documentation site (docs/, Docusaurus) in step with the code - find what a change affects, update the matching guides and doc comments, and build the site. Use after ANY change to src/, examples/captain-whiskers/, assets/knowledge-plugin/ or the root package scripts, before every commit of such a change, and before a release. A change is not done until its documentation is.
---

# Keep docs/ up to date

The documentation site (`docs/`, published at https://falkenslab.github.io/agent-kit/) is how developers learn to build agents with the kit. It's part of every change: code that changes what an agent sees, can do or must write, and isn't documented, is unfinished work. Never commit such a change without its documentation, and never leave it "for later".

## 1. Find what changed

```
git status --short
git diff --stat
git diff -- src/index.ts
```

For each change, ask: would a developer building an agent notice it? Count as yes:

- a new, removed or renamed export, option, parameter, type field or event;
- a changed default, behavior, text the person sees, file the kit writes, or error message;
- a new guardrail or a change to an existing one;
- a fix that changes what someone could rely on (document the corrected behavior);
- Captain Whiskers changes that the walkthrough quotes;
- new or changed root scripts, requirements (Node version) or install steps.

Internal refactors, tests and comments with no visible effect need no guide change (but see doc comments below).

## 2. Find the pages

Guides live in `docs/content/`; `docs/sidebars.ts` is the map. Typical owners:

| Change in | Pages |
| --- | --- |
| `AgentSpec`, `BaseSessionConfig` | `core-concepts/agent-spec.md`, `core-concepts/session-config.md` |
| `buildSessionOptions()` (tools, hooks, settings, defaults) | `core-concepts/session-options.md`, and the topic page |
| Modes, `ModeControl` | `core-concepts/modes.md` |
| Tools, MCP, `tool()`, labels | `capabilities/tools-and-mcp.md`, `terminal-ui/tool-labels.md` |
| Skills, plugins, `skills`, `settingSources` | `capabilities/skills-and-plugins.md`, `security/permissions-and-isolation.md`, `sessions/context-and-cost.md` |
| Subagents and their gates | `capabilities/subagents.md`, `security/subagent-gates.md` |
| Knowledge base, sources | `capabilities/knowledge-base.md` |
| Checkpoints, ports, response file | `human-in-the-loop/*.md` |
| File scope, transcript, isolation | `security/*.md` |
| `runChatInk()`, `runChatTui()`, keys, commands, screen | `terminal-ui/ink-chat.md`, `terminal-ui/plain-chat.md` |
| `createProgressView()`, `runWizard()`, themes | `terminal-ui/progress-view.md`, `terminal-ui/wizard.md`, `terminal-ui/themes.md` |
| Runs, resuming, languages | `sessions/*.md` |
| `runQuery()`, events, hosts, hooks | `advanced/*.md` |
| An SDK behavior found or changed | `reference/sdk-behaviors.md` |
| A new pitfall | `reference/troubleshooting.md` |
| Captain Whiskers | `examples/captain-whiskers.md` |
| What the kit offers overall | `intro.md` and the home page (`docs/src/pages/index.tsx`) |

Search too: `grep -rn "<the option or function>" docs/content` finds every page that mentions it, so none keeps describing the old behavior.

## 3. Update them

- English, technical and concrete; one paragraph per line (no hard wraps).
- Every option or function gets: what it does, its default, an example that compiles against the kit, and what to watch out for.
- Change the existing explanation rather than appending a note that contradicts it.
- Pages are CommonMark (`.md`), not MDX: write `<placeholders>` inside backticks.
- A new page goes in `docs/sidebars.ts`, linked from the pages that lead to it.
- Never edit `docs/versioned_docs/`: those are released versions. The only exception is a factual error in what that version actually did.

## 4. Doc comments

The API reference is generated from the doc comments of everything exported from `src/index.ts`. Every new or changed export needs one that says what it is for (not how it's built). An export without one shows as "-":

```
npm run docs:build
grep -E "\| - \|$" docs/content/api/index.md docs/content/api/@falkenslab/namespaces/ui/index.md
```

The grep must print nothing.

## 5. Build

```
npm run docs:build
```

It fails on a broken link or anchor. If `docs/node_modules` is missing, run `npm run docs:install` first. Fix the cause; never turn the check off.

## 6. Commit with the code

The documentation goes in the same commit as the change it describes (or right next to it, `docs(site): …`, when one commit per concern reads better). When the change completes a MiniSpec feature or fix, its issue's closing comment mentions the pages updated.

Report which pages you changed, or why none needed to.

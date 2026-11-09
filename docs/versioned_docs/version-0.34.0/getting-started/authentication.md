---
sidebar_position: 2
title: Authentication
description: How an agent built on the kit reaches Claude - a sign-in with the person's Claude account, through Anthropic's own flow, or an API key.
---

# Authentication

The Claude Agent SDK runs Claude Code as a subprocess, and Claude Code finds its own credentials: an API key in the environment, or the Claude account signed in to it. The kit never sees, returns or stores a Claude account's token. It only asks whether the person is signed in, and when they aren't, it runs Claude Code's own sign-in.

## Why: Anthropic's terms

Anthropic's [legal and compliance terms](https://code.claude.com/docs/en/legal-and-compliance) ("Authentication and credential use") say that developers building on the Agent SDK may not collect, store or intermediate Claude.ai credentials or session tokens: signing in to a Claude account must complete through Anthropic's own flow. A person may sign in to the unmodified Claude Code binary with their own Claude subscription, and API keys are allowed.

So the kit runs the Claude Code binary that comes with the Agent SDK (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>`, unmodified; nobody needs Claude Code installed) and lets it do the sign-in: `claude auth login` opens Anthropic's page in the browser, and the binary keeps the credentials itself (in `~/.claude/`, or the Keychain on macOS), where every session of your agent finds them. Nothing in the kit reads that file.

## Where credentials come from

1. **`ANTHROPIC_API_KEY`**: an Anthropic API key (usage billed to the API account), set by the person or your host.
2. **`CLAUDE_CODE_OAUTH_TOKEN`**, when the person sets it in their own environment: it's their setting, and the kit doesn't ask for it, create it or keep it.
3. **The Claude account signed in to Claude Code**: what `claude auth status` reports.

## `claudeSignedIn()`: ask, headless

```ts
import { claudeSignedIn } from "@falkenslab/agent-kit";

if (!(await claudeSignedIn())) {
  // Offer a sign-in (startClaudeSignIn()) or an API key.
}
```

True when the environment has `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`; otherwise it runs `claude auth status --json` and returns its `loggedIn`. No console output: safe in a server or an Electron main process.

## `ensureClaudeAuth()`: sign in from a terminal

```ts
import { ensureClaudeAuth } from "@falkenslab/agent-kit";

await ensureClaudeAuth();
```

When the person isn't signed in, it:

1. says so, and that they can sign in with their Claude account on Anthropic's page or set `ANTHROPIC_API_KEY`;
2. asks whether to sign in now;
3. runs `claude auth login` on the terminal: the browser opens on Anthropic's page, and if the page shows a code, the person pastes it in the terminal;
4. checks `claudeSignedIn()` again.

It returns nothing, and nothing needs saving: Claude Code keeps the sign-in, so the next start goes straight in. It exits the process if the person declines, presses Ctrl+C, or the sign-in doesn't complete.

The texts follow the kit's language; pass `{ language }` to force one:

```ts
await ensureClaudeAuth({ language: "es" });
```

## `startClaudeSignIn()`: sign in from a window or a web page

A host without a terminal runs the same sign-in with plain pipes, and shows what the person needs on its own screen:

```ts
import { startClaudeSignIn } from "@falkenslab/agent-kit";

const signIn = startClaudeSignIn(); // { console: true } for an Anthropic Console account
const url = await signIn.url;       // Anthropic's page: show it as a link, in case the browser didn't open
// When the person pastes the code that page shows:
signIn.sendCode(code);
if (await signIn.done) openTheChat(); // done: the binary ended, and the person is signed in
// signIn.cancel() stops it.
```

The binary opens the browser itself. `url` is `undefined` if it ended without printing one, and `done` resolves with `claudeSignedIn()` once it has ended. Captain Whiskers' web page does exactly this: see [Captain Whiskers](../examples/captain-whiskers.md).

## An API key

An API key is allowed: set `ANTHROPIC_API_KEY` before the session starts. An agent may take one from the person (a settings field) and keep it, as Captain Whiskers keeps the one pasted on his page. Node doesn't read `.env` files by itself: load one with `process.loadEnvFile()`.

:::warning Keep secrets out of version control
Add `.env` to your `.gitignore`. The kit redacts `CLAUDE_CODE_OAUTH_TOKEN` from its own [transcript](../security/transcript.md) when the environment has one, but a `.env` committed by mistake is public for good.
:::

## Your Claude Code sign-in is your agent's

The sign-in lives in `~/.claude/`, the same place Claude Code keeps it: if you also use Claude Code on the same machine, your agent uses the account it's signed in to, and signing in from either serves both. The kit keeps the rest of that folder (settings, skills, `CLAUDE.md`) away from your agent (see [Permissions and isolation](../security/permissions-and-isolation.md)), but the CLI still adds the signed-in account's name and e-mail to the context. That can nudge the language of the replies; see [Languages](../sessions/languages.md#limits).

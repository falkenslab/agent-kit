---
sidebar_position: 2
title: Authentication
description: How an agent built on the kit authenticates against Claude, and how to get a token interactively.
---

# Authentication

The Claude Agent SDK runs the Claude Code CLI as a subprocess, and that subprocess reads its credentials from the environment. The kit never stores a token itself: it only looks one up, and in a terminal it can help the person get one.

## Where credentials come from

In this order:

1. **`ANTHROPIC_API_KEY`**: an Anthropic API key (usage billed to the API account). When it's set, nothing else is checked.
2. **`CLAUDE_CODE_OAUTH_TOKEN`**: a long-lived token of a Claude Pro/Max subscription, created with `claude setup-token`.
3. **A token your code passes in** (`claudeCodeOAuthToken`), which the kit copies into `CLAUDE_CODE_OAUTH_TOKEN` for the subprocess.

## `resolveClaudeAuth()`: look it up, headless

```ts
import { resolveClaudeAuth } from "@falkenslab/agent-kit";

if (!resolveClaudeAuth({ claudeCodeOAuthToken: await myVault.get("claude") })) {
  throw new Error("No Claude credentials");
}
```

It's a pure lookup with no I/O and no console output, safe in a server or an Electron main process. It returns `true` when one of the three sources has credentials.

## `ensureClaudeAuth()`: look it up, or get one in a terminal

```ts
import { ensureClaudeAuth } from "@falkenslab/agent-kit";

const newToken = await ensureClaudeAuth();
if (newToken) {
  // A token was just generated: save it wherever you keep secrets, for next time.
}
```

When no credentials are found, it:

1. explains that no token was found;
2. asks whether to generate one now with `claude setup-token` (it runs `npx @anthropic-ai/claude-code setup-token`, which opens a browser to log in);
3. sets `CLAUDE_CODE_OAUTH_TOKEN` for this process and returns the token.

It exits the process if the person declines or presses Ctrl+C: there's no agent to run without a token. It returns `undefined` when credentials were already there.

The texts follow the kit's language; pass `{ language }` as the second argument to force one:

```ts
await ensureClaudeAuth({}, { language: "es" });
```

## Keeping the token in a `.env` file

Node doesn't read `.env` files by itself. Captain Whiskers loads its own at startup and saves a freshly generated token to it:

```ts title="agent.ts"
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureClaudeAuth } from "@falkenslab/agent-kit";

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, ".env");

// What's already in the environment wins over the file; without a file nothing changes.
try {
  process.loadEnvFile(envPath);
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const newToken = await ensureClaudeAuth();
if (newToken) {
  const previous = await readFile(envPath, "utf8").catch(() => "");
  const separator = previous && !previous.endsWith("\n") ? "\n" : "";
  await appendFile(envPath, `${separator}CLAUDE_CODE_OAUTH_TOKEN=${newToken}\n`);
}
```

:::warning Keep secrets out of version control
Add `.env` to your `.gitignore`. The kit redacts `CLAUDE_CODE_OAUTH_TOKEN` from its own [transcript](../security/transcript.md), but a `.env` committed by mistake is public for good.
:::

## Your Claude Code login is not your agent's

If you also use Claude Code on the same machine, its login and configuration live in `~/.claude/`. The kit keeps most of it away from your agent (see [Permissions and isolation](../security/permissions-and-isolation.md)), but the CLI still adds the logged-in account's name and e-mail to the context. That can nudge the language of the replies; see [Languages](../sessions/languages.md#limits).

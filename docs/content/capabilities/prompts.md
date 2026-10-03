---
sidebar_position: 5
title: Prompts
description: Keep system prompts as files with createPromptLoader(), and write prompts that work well with the kit.
---

# Prompts

## Prompt files with `createPromptLoader()`

A system prompt of more than a few lines is easier to read, review and diff as a markdown file. `createPromptLoader(rootDir)` returns a function that loads a file relative to `rootDir` and replaces `{{name}}` placeholders:

```md title="prompts/system.md"
You are Scout, a research assistant for {{team}}.

## How you work

- Answer in short paragraphs, with sources.
- Keep your notes in the knowledge base.
```

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPromptLoader } from "@falkenslab/agent-kit";

const here = path.dirname(fileURLToPath(import.meta.url));
const loadPrompt = createPromptLoader(path.join(here, "prompts"));

const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => loadPrompt("system.md", { team: config.team }),
  // …
};
```

- A placeholder without a value throws (`Prompt "system.md": missing variable "team"`), so a typo fails at startup, not silently in the model's context.
- Placeholders are `{{word}}` (letters, digits, underscore). Extra variables are ignored.
- Trailing whitespace is trimmed.
- Files are read synchronously on every call: cheap, and edits take effect on the next session without a restart of your code.

Compose prompts from parts:

```ts
buildSystemPrompt: (config) =>
  [
    loadPrompt("role.md", { team: config.team }),
    config.mode === "autonomous" ? loadPrompt("autonomous.md") : loadPrompt("supervised.md"),
    loadPrompt("style.md"),
  ].join("\n\n"),
```

## What the kit adds to your prompt

Don't repeat these in your prompt; they're appended for you:

- the [knowledge base section](knowledge-base.md#the-rules-the-agent-follows), with `knowledgeDir`;
- the [reply language](../sessions/languages.md) line.

The approval tool's description (guided mode) already tells the model when to call it; your prompt can say what counts as "publishing" in your domain, or set that in [`humanApprovalTexts`](../core-concepts/agent-spec.md#humanapprovaltexts).

## Writing prompts that work well

- **Say who the agent is and what it's for** in the first lines.
- **Describe its tools' workflow**, not only their existence: "before telling a joke the finder brought, pass it to the critic".
- **Name the subagents** and say when to use each one.
- **Ask for a task list on long jobs.** Every session has `TodoWrite`; the model uses it on its own for multi-step work, but a line such as "for anything with more than three steps, keep a task list" makes it reliable, and the person sees the progress above the prompt.
- **Don't rely on the prompt for safety.** A prompt that says "never delete files" is a wish; the [file scope](../security/file-scope.md), `disallowedTools` and [hooks](../advanced/hooks.md) are guarantees.
- **Write it in English** (or in the language the agent should reply in). A prompt in another language pulls the replies to that language even when the kit asks for another. See [Languages](../sessions/languages.md#limits).
- **Keep it short.** Every token of the prompt is sent on every call; put rarely needed detail in a skill, which the model loads only when it applies.

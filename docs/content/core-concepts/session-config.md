---
sidebar_position: 3
title: Session config
description: BaseSessionConfig, field by field, and how to extend it with your own fields.
---

# Session config

`BaseSessionConfig` is the minimum a config needs to drive `buildSessionOptions()`. Your agent extends it with whatever its domain needs; the kit only reads its own fields, and passes the whole object to your [`AgentSpec`](agent-spec.md) methods.

```ts
import type { BaseSessionConfig } from "@falkenslab/agent-kit";

interface Config extends BaseSessionConfig {
  courseUrl: string;
  password: string;
}
```

## Fields

| Field | Type | Required | What it does |
| --- | --- | --- | --- |
| `mode` | `"interactive" \| "guided" \| "autonomous" \| "plan"` | yes | How much a human is in the loop. See [Modes](modes.md). |
| `projectDir` | `string` | yes | The project root: the session's working directory when the agent has file tools or plugins, and the base for relative paths in the file scope. |
| `knowledgeDir` | `string` | no | The agent's notes: by default, the [knowledge base](../capabilities/knowledge-base.md), reached through its own tools. |
| `sourcesDir` | `string` | no | Originals, kept as obtained: readable and searchable, never writable. Gives the file tools and the [sources tools](../capabilities/knowledge-base.md#sources-originals-kept-as-obtained). |
| `extraWritableDirs` | `string[]` | no | More folders where `Write`/`Edit` are allowed (and `Grep` searches). |
| `extraReadableDirs` | `string[]` | no | More folders the agent may read and search (`Read`, `Glob`, `Grep`), never write. With [`restrictReads`](../security/file-scope.md#restricting-reads), the only other places it reads. |
| `deniedPaths` | `string[]` | no | Files or folders the agent must never read, search or write, e.g. a config file holding a password. |
| `secrets` | `string[]` | no | Values scrubbed from the transcript log, e.g. a password. |
| `language` | `string` | no | The language of the kit's texts and of the agent's replies (`"en"`, `"es"`, `"fr"`, `"de"`). `--language` on the command line wins over it. |
| `timeZone` | `string` | no | The IANA time zone (`"Europe/Madrid"`) the [date and time tools](../capabilities/tools-and-mcp.md#date-and-time) answer in; the system's if not given. |

## Examples

### A chat with no files

```ts
const config: BaseSessionConfig = { mode: "autonomous", projectDir: process.cwd() };
```

No `knowledgeDir` and no `sourcesDir`: the agent gets no file tools at all.

### Notes and originals

```ts
const workspace = path.resolve(process.argv[2] ?? ".");

const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: workspace,
  knowledgeDir: path.join(workspace, "knowledge"),
  sourcesDir: path.join(workspace, "sources"),
};
```

The agent can read everything under `workspace` that isn't denied, write only inside `knowledge/`, search inside `knowledge/` and `sources/`, and add to `sources/` only through the sources tools (`save_to_sources`, `download_to_sources`, `request_file`).

### Protecting a secret

```ts
interface Config extends BaseSessionConfig {
  password: string;
}

const configFile = path.join(workspace, "agent.config.json");
const { password } = JSON.parse(await readFile(configFile, "utf8"));

const config: Config = {
  mode: "guided",
  projectDir: workspace,
  knowledgeDir: path.join(workspace, "knowledge"),
  deniedPaths: [configFile], // never readable, searchable or writable
  secrets: [password], // never written to transcript.jsonl in clear
  password,
};
```

`deniedPaths` is enforced by the [file scope hook](../security/file-scope.md); `secrets` by the [transcript logger](../security/transcript.md). Use both: one keeps the agent from reading the file, the other keeps the value out of the log if it ever reaches a tool call another way (the agent typing it into a login form, say).

### Extra writable folders

```ts
const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: workspace,
  knowledgeDir: path.join(workspace, "knowledge"),
  extraWritableDirs: [path.join(workspace, "drafts")],
};
```

### Forcing a language

```ts
const config: BaseSessionConfig = { mode: "guided", projectDir: workspace, language: "fr" };
```

The person running the agent can still override it with `--language=de`. See [Languages](../sessions/languages.md).

:::tip Mode is not "chat vs one-shot"
`mode` is only about supervision. Whether a session is a multi-turn chat or a one-shot run depends on how you start it (`runChatInk()` or `runQuery()` with a string). If your agent needs to know it's in a chat (to pick a different prompt, say), add your own field to the config.
:::

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
| `extensionDirs` | `{ agent?: string; project?: string }` | no | Where [extensions are installed](../capabilities/extensions.md#installing-extensions) for this agent: `agent` for all its projects, `project` for this one (it wins). The enabled ones whose files match their lock run with the session. |
| `extraWritableDirs` | `string[]` | no | Folders the agent reads, searches and writes with the file tools (all five), e.g. a folder of its own notes. |
| `extraReadableDirs` | `string[]` | no | More folders the agent may read and search (`Read`, `Glob`, `Grep`), never write. Besides them, `extraWritableDirs` and its extensions' folders (the sources), the agent reads nothing on the disk (see [What the agent can read](../security/file-scope.md#what-the-agent-can-read)). |
| `deniedPaths` | `string[]` | no | Files or folders the agent must never read, search or write, e.g. a config file holding a password. |
| `secrets` | `string[]` | no | Values scrubbed from the transcript log, e.g. a password. |
| `language` | `string` | no | The language of the kit's texts and of the agent's replies (`"en"`, `"es"`, `"fr"`, `"de"`). `--language` on the command line wins over it. |
| `timeZone` | `string` | no | The IANA time zone (`"Europe/Madrid"`) the [date and time tools](../capabilities/tools-and-mcp.md#date-and-time) answer in; the system's if not given. |

## Examples

### A chat with no files

```ts
const config: BaseSessionConfig = { mode: "autonomous", projectDir: process.cwd() };
```

No folders (and no extension asking for file tools): the agent gets no file tools at all.

### Notes and originals

The folders of the kit's extensions are their options, in the spec, often worked out from the config's `projectDir`:

```ts
const workspace = path.resolve(process.argv[2] ?? ".");

const config: BaseSessionConfig = { mode: "guided", projectDir: workspace };

const spec: AgentSpec<BaseSessionConfig> = {
  // …
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }),
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
  ],
};
```

The agent keeps its notes in `knowledge/` through the `knowledge_*` tools only, reads and searches `sources/`, and adds to `sources/` only through the sources tools (`save_to_sources`, `download_to_sources`, `request_file`). See [Extensions](../capabilities/extensions.md).

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
  extraReadableDirs: [workspace],
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
  extraWritableDirs: [path.join(workspace, "notes"), path.join(workspace, "drafts")],
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

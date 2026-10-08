---
sidebar_position: 2
title: File scope
description: How the file scope hook limits Read, Write, Edit, Grep and Glob to the agent's own folders, with every rule and its denial message.
---

# File scope

Without it, the SDK's file tools can reach the whole working directory, and keeping the agent out of your own files would rest on the prompt alone. The file scope gate is a `PreToolUse` hook, registered whenever the session has file tools, that checks every `Read`, `Write`, `Edit`, `Grep` and `Glob` call against the folders in the [session config](../core-concepts/session-config.md).

## The scope

| Scope | Built from |
| --- | --- |
| Writable | `extraWritableDirs`, and `knowledgeDir` when it's the agent's own notes (without the `knowledge` extension) |
| Searchable (`Grep`) | `knowledgeDir` (likewise), `sourcesDir`, `extraWritableDirs`, `extraReadableDirs` |
| Readable (`Read`, `Glob`) | the searchable folders, plus what the kit knows the agent needs: its run folder, the plugins it loads, the project's `.claude/` (with the `"project"` setting source) and the SDK's large tool results (`~/.claude/projects/<project>/<session>/tool-results/`) |
| Read-only | `sourcesDir` (only changes the wording of the denial) |
| Denied | `deniedPaths`, and always the SDK's credentials (`~/.claude/.credentials.json`, or under `CLAUDE_CONFIG_DIR`) |
| Tools only | `knowledgeDir`, when the built-in knowledge base is reached through its `knowledge_*` tools (the default) |

Relative paths are resolved against `projectDir`. A path is inside a folder when it's the folder itself or anything under it (case-insensitively on Windows).

## The rules

| Tool | Allowed when | Denied with |
| --- | --- | --- |
| `Read` | the file is inside a readable folder and not in a denied path | denied: `"<path>" is off limits: it can't be read.`; outside the readable folders: `"<path>" can't be read: reading is only allowed inside sources/ and your own plugins and run folder.` |
| `Glob` | where it starts (its `path` plus the pattern's fixed folders) is inside a readable folder and not in a denied path, and the pattern has no `..` | denied: `"<path>" is off limits: it can't be listed.`; outside: `Glob can't list "<path>": listing is only allowed inside sources/ and your own plugins and run folder.` |
| `Write`, `Edit` | the file is inside a writable folder and not denied | read-only folder: `"<path>" is read-only: originals are never modified — write your own notes inside knowledge/ instead.`; anywhere else: `"<path>" can't be written: writing is only allowed inside knowledge/.` |
| `Grep` | its `path` (the project directory if omitted) is inside a searchable folder, isn't denied and doesn't contain a denied path | `Grep only searches inside knowledge/, sources/ — pass one of them (or a folder inside) as "path".` |
| Any file tool, in a tools-only folder | never: `Read`, `Write`, `Edit` inside it; `Grep` or `Glob` starting inside it or above it (a `Glob` pattern's fixed folders count: `sources/**` starts in `sources/`) | `"<path>" is in knowledge/, which is reached only through the knowledge_* tools, not the file tools.` |
| Every other tool | always (not judged here) | |

Notes:

- **`Read` and `Glob` are an allow-list, not a deny-list**: a deny-list never names every secret (`~/.ssh`, other projects' `.env`, browser profiles, documents with personal data), and an agent that reads untrusted content (web pages, submissions, forum posts) can be talked into reading a file and putting it in a reply. See [What the agent can read](#what-the-agent-can-read).
- **`Grep` is scoped** because it prints file contents: a `Grep` over the whole project could leak a denied file's lines. For the same reason a folder that merely *contains* a denied file can't be searched.
- **`Glob` lists names, not contents**, but names can leak too (`grades_3B_<student>.xlsx`), so it follows `Read`'s rules.
- A call without a path is left for the tool itself to reject.
- The rules apply to subagents too: the hook runs for every call in the session.

## What the agent can read

`Read` and `Glob` work as an allow-list, like `Write` and `Grep`: the agent reads its own folders and nothing else on the disk. You widen it with `extraReadableDirs`:

```ts
const config: Config = {
  // …
  sourcesDir: "/work/course/sources",
  extraReadableDirs: ["/work/shared/rubrics"], // read and searched, never written
};
```

The kit adds what it knows the agent needs without you declaring it: the run folder, the plugins it loads, the project's `.claude/`, and the SDK's large tool results, which agents `Read` when an output is too big for the context. `deniedPaths` still wins inside all of it. The project folder itself isn't readable: whatever else lives there (a config file with a token, a `.env`) stays out. The knowledge folder stays reachable only through the `knowledge_*` tools. Subagents go through the same hook.

`Bash`, when a subagent has it, is outside the gate: it can reach any path.

## Examples

```ts
const config: BaseSessionConfig = {
  mode: "guided",
  projectDir: "/work/course",
  knowledgeDir: "/work/course/knowledge",
  sourcesDir: "/work/course/sources",
  extraWritableDirs: ["/work/course/drafts"],
  deniedPaths: ["/work/course/agent.config.json"],
};
```

| Call | Result |
| --- | --- |
| `Write knowledge/index.md` | denied: the knowledge folder is reached only through the `knowledge_*` tools |
| `Edit drafts/newsletter.md` | allowed |
| `Edit sources/syllabus.pdf` | denied: read-only |
| `Write README.md` | denied: not writable |
| `Read sources/syllabus.md` | allowed |
| `Read README.md` | denied: the project root isn't readable |
| `Read agent.config.json` | denied: off limits |
| `Grep "exam" in sources/` | allowed |
| `Grep "exam"` (no path) | denied: the project root isn't searchable |
| `Grep "password" in .` | denied |

## Using it outside `buildSessionOptions()`

`createFileScopeGate(scope)` builds the hook, and `checkFileScope(scope, toolName, input)` gives the decision as a string (the denial reason) or `undefined`, handy for tests:

```ts
import { checkFileScope, type FileScope } from "@falkenslab/agent-kit";

const scope: FileScope = {
  projectDir: "/work",
  writableDirs: ["/work/notes"],
  searchableDirs: ["/work/notes"],
  readOnlyDirs: [],
  deniedPaths: ["/work/.env"],
};

checkFileScope(scope, "Write", { file_path: "notes/a.md" }); // undefined: allowed
checkFileScope(scope, "Read", { file_path: ".env" }); // '".env" is off limits: it can't be read.'
```

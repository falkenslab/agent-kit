---
sidebar_position: 2
title: File scope
description: How the file scope hook limits Read, Write, Edit, Grep and Glob, with every rule and its denial message.
---

# File scope

Without it, the SDK's file tools can reach the whole working directory, and keeping the agent out of your own files would rest on the prompt alone. The file scope gate is a `PreToolUse` hook, registered whenever the session has file tools, that checks every `Read`, `Write`, `Edit` and `Grep` call (and `Glob`, near a knowledge folder reached through its tools) against the folders in the [session config](../core-concepts/session-config.md).

## The scope

| Scope | Built from |
| --- | --- |
| Writable | `knowledgeDir` (only with `knowledgeTools: "files"`), `extraWritableDirs` |
| Searchable (`Grep`) | `knowledgeDir` (likewise), `sourcesDir`, `extraWritableDirs` |
| Read-only | `sourcesDir` (only changes the wording of the denial) |
| Denied | `deniedPaths` |
| Tools only | `knowledgeDir`, when the built-in knowledge base is reached through its `knowledge_*` tools (the default) |

Relative paths are resolved against `projectDir`. A path is inside a folder when it's the folder itself or anything under it (case-insensitively on Windows).

## The rules

| Tool | Allowed when | Denied with |
| --- | --- | --- |
| `Read` | the file isn't in a denied path | `"<path>" is off limits: it can't be read.` |
| `Write`, `Edit` | the file is inside a writable folder and not denied | read-only folder: `"<path>" is read-only: originals are never modified — write your own notes inside knowledge/ instead.`; anywhere else: `"<path>" can't be written: writing is only allowed inside knowledge/.` |
| `Grep` | its `path` (the project directory if omitted) is inside a searchable folder, isn't denied and doesn't contain a denied path | `Grep only searches inside knowledge/, sources/ — pass one of them (or a folder inside) as "path".` |
| Any file tool, in a tools-only folder | never: `Read`, `Write`, `Edit` inside it; `Grep` or `Glob` starting inside it or above it (a `Glob` pattern's fixed folders count: `sources/**` starts in `sources/`) | `"<path>" is in knowledge/, which is reached only through the knowledge_* tools, not the file tools.` |
| `Glob` elsewhere, and every other tool | always (not judged here) | |

Notes:

- **`Read` is allowed anywhere but denied paths.** The agent can read the project's files (to learn from them), but not the ones you protected.
- **`Grep` is scoped** because it prints file contents: a `Grep` over the whole project could leak a denied file's lines. For the same reason a folder that merely *contains* a denied file can't be searched.
- **`Glob` isn't scoped**: it lists names, not contents.
- A call without a path is left for the tool itself to reject.
- The rules apply to subagents too: the hook runs for every call in the session.

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
| `Write knowledge/index.md` | allowed |
| `Edit drafts/newsletter.md` | allowed |
| `Edit sources/syllabus.pdf` | denied: read-only |
| `Write README.md` | denied: not writable |
| `Read syllabus.md` | allowed |
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

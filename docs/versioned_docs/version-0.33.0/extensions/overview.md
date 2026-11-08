---
sidebar_position: 1
title: Overview
description: What an extension is - the kit's own, your agent's, and installed ones from a folder, a repository or a marketplace - what the agent sees of them, capabilities, and where each kind runs.
---

# Extensions

An agent is the kit's core (the chat, the modes and their gates, subagents, the transcript, languages) plus the **extensions** it runs with. An extension is a [Claude Code plugin](https://code.claude.com/docs/en/plugins) (a manifest, skills, commands, subagents) plus what it brings to a session: its tools, what the model needs to know about them, which of its tools only read, how the chat shows them, the settings it asks for.

There are two kinds, resolved the same way in a session:

- **Internal**, shipped in a package: the kit's four (`awareness`, `sources`, `knowledge`, `memory`) and any your agent writes in its own code. They run in the agent's process, with the kit's internals at hand. The agent enables them in its spec: see [The kit's own](the-kits-own.md).
- **Installed**: a Claude Code plugin as it is, from a folder, a git repository or a marketplace, into the agent (for all its projects) or into one project. Any agent on the kit can use one, and so can Claude Code. Its tools are its own MCP server, which the kit runs in a separate process with a clean environment. The person installs, configures, enables and disables them.

## Where to go

| You want to | Read |
| --- | --- |
| 🧩 Turn on the kit's knowledge base, sources, memory or awareness, or write an extension in your agent's code | [The kit's own](the-kits-own.md) |
| 📦 Let your agent's users install extensions: scopes, the command, marketplaces, the catalog in the chat | [Installing and the catalog](installing.md) |
| ⚙️ Understand how an extension's settings are asked, kept and changed | [Configuring](configuring.md) |
| 🗂️ Share a project whose extensions travel with it, and trust them on each computer | [Workspaces](workspaces.md) |
| 🛠️ Build an installable extension, step by step | [Writing one](writing.md) |
| 🧪 Try it while you build it, validate it and version it | [Developing and testing](developing.md) |
| 🚀 Publish a marketplace, its catalog and its page | [Publishing a marketplace](publishing.md) |
| 📖 Look up a field of a manifest, an option or a lock | [Manifest reference](reference.md) |

## What the agent sees

With any extension on, the system prompt gets an **Extensions** section after the agent's own prompt and identity, then each internal extension's own section:

```text
## Extensions
What you can do besides your own tools comes from these extensions; their sections below say how to use them.
- **sources**: The sources folder: originals kept as obtained, … Provides: sources.
- **knowledge**: Built-in knowledge base workflows (an LLM wiki) … Provides: knowledge-base.
- **weather**: The weather in your city, for an agent that plans with you … 
```

An extension that's off is listed too, with why ("it needs a folder (`dir`)", "it requires memory, which no enabled extension provides", "it needs city (Your city) set"). With the [awareness](../capabilities/awareness.md) extension, `about_me` tells the agent the same at any moment, so it can tell the person. An installed extension's own rules reach the model through its server's `instructions`; its procedures, through its skills.

## Capabilities

An extension's manifest says what it **provides** and what it **requires**, as capabilities: names, not other extensions.

- An extension that requires a capability no enabled extension provides is left out, and so is any that depended on it in turn.
- A **skill** can require capabilities too, in its frontmatter; it's only offered when they're there:

```markdown
---
name: rank-jokes
description: Rank the jokes in the knowledge base by their score…
requires: knowledge-base
---
```

`requires: a`, `requires: [a, b]` and a YAML list all work. A skill left out this way isn't listed to the model and is refused by the `Skill` tool. Since the SDK's `skillOverrides` doesn't reach plugin skills, leaving one out makes the session's `skills` a list (the plugins' skills and the project's) even when the spec says `"all"`.

The kit's capabilities are `self-awareness`, `sources`, `knowledge-base` and `person-memory`; an agent names its own (miyagi's classroom capabilities, say), and two extensions may provide the same one.

A capability can also be **described for the person**, in the manifest's `capabilities`: what the agent does well with the extension, made of the skills that say how and the tools that do it, with a label and a description per language. moodle-teacher's "Grading with rubrics" is its `grading` skill with `get_rubric`, `get_submissions` and `grade_submission`. A described capability's id counts as provided, so `requires` works the same; `/extensions`, `about_me`, `extension info` and the catalog show them as "what your agent can do". Give it a neutral id (`lms-grading`, not `moodle-grading`): an agent's skills then depend on what can be done, and another extension (Google Classroom's) can provide it tomorrow. How to write them is in [Writing one](writing.md#4-agent-kits-data). A capability that needs a program this computer lacks ([requirements](writing.md#programs-it-needs)) isn't provided, its skills are left out, and the agent says what to install.

## Where they run

- **Internal extensions** run in the agent's process: the kit's are reviewed with it, and an agent's own are its author's code.
- **Installed extensions** run apart, because their code may come from anyone. Their server is a separate Node process, started through the kit's launcher, which removes every environment variable but the system's and those the manifest declares (the SDK merges a server's `env` with the agent's own, so passing `env` alone wouldn't hide the agent's credentials). Their files are checked against a hash before every session; a workspace's need the person's trust ([Workspaces](workspaces.md)); their hooks never run; their subagents get no `Bash`. Their tools go through the same gates as any other: the approval in interactive mode, [plan mode](../core-concepts/modes.md#plan), the transcript.

The decisions behind all this are in [ADR-025](https://github.com/falkenslab/agent-kit/blob/main/.minispec/decisions/ADR-025-extensions.md).

---
sidebar_position: 4
title: Serving an agent over MCP
description: Run an agent as an MCP server, so Claude Code or another agent can ask it things, with its own prompt, extensions and guardrails.
---

# Serving an agent over MCP

An agent on the kit can run as an MCP server over stdio. Another agent (Claude Code, Claude Desktop, another one on the kit) then drives it whole: it asks and gets a reply, while the prompt, the extensions and the guardrails stay in the served agent's own process.

```ts
import { serveMcp } from "@falkenslab/agent-kit/mcp";

const config: BaseSessionConfig = { mode: "autonomous", projectDir: process.cwd() };

await serveMcp((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  identity: { name: "my-agent", version: "1.0.0", description: "an assistant that reads invoices" },
});
```

It comes from its own subpath, not the package root: an agent that doesn't serve itself never loads it. The promise resolves when the client disconnects.

Add it to Claude Code like any stdio server:

```bash
claude mcp add my-agent -- node /path/to/agent.js
```

## The `ask` tool

The server has one tool. It exposes the agent, not the agent's tools, so a caller can't get them without its judgment and gates.

| Input | What it is |
| --- | --- |
| `message` | What to ask, in plain words. |
| `session_id` | Optional. The `session_id` of an earlier reply, to go on with that conversation. Without it, a new conversation starts. |

The result has two text blocks: the agent's reply, and a line `session_id: <id>`. A `session_id` is the name of a folder under `runsDir`, so a conversation survives the server: a client can pick it up after a restart. An id that isn't a run of this agent's is an error.

A `message` always goes to the agent as it is. It's never read as one of the chat's commands, so a caller can't install an extension or switch runs by writing `/extensions` or `/resume`.

A failed turn comes back as a tool error, with what went wrong. A second `ask` on a session that is still in a turn is an error too, not a queue: a caller's retries would otherwise pile up turns nobody waits for. Different sessions can run at the same time.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `runsDir` | required | Where the runs are. |
| `identity` | required | The server's name and version, and what the `ask` tool says the agent does (`AgentIdentity`). |
| `maxDepth` | `3` | How many served agents may chain before `ask` refuses. |
| `progressIntervalMs` | `15000` | How often a running turn reports that it's still alive. |
| `transport` | stdio | Another MCP transport. |
| `runQuery` | the SDK's | Another way to run the agent, for tests. |

## Autonomous mode only

`serveMcp()` fails at the start if the session opens in any other mode. Nobody can answer a checkpoint over this connection, and the calling model must never answer for the human: an approval returned to the caller as a tool result would be the model approving itself. Choose what the agent may do alone with the guardrails of [autonomous mode](../core-concepts/modes.md), since its hooks are all that stands between the caller and its tools.

## What to watch out for

- **Long turns.** While a turn runs, the server sends MCP progress notifications with the label of the agent's latest action, and one every `progressIntervalMs` in between. They only keep a call alive if the client asked for progress and resets its timeout on it. If it doesn't, raise the client's tool timeout.
- **Cancelling.** A client that cancels the call interrupts the turn.
- **stdout belongs to the protocol.** Over stdio, `console.log`, `console.info` and `console.debug` are sent to stderr while serving. Code that writes to `process.stdout` directly breaks the connection.
- **Open sessions.** Each one is a Claude Code process. The server keeps the four most recently used and closes the rest; a closed one opens again from its `session_id`.
- **Cost and sign-in.** Each served agent has its own context and cost, and signs in on its own: over stdio it inherits the caller's environment.
- **Loops.** The depth travels in the environment to the agent's own MCP servers, one higher at each hop, and `ask` fails at `maxDepth`. An installed extension's server starts with a stripped environment and doesn't receive it, so a chain that goes through an extension starts counting again.

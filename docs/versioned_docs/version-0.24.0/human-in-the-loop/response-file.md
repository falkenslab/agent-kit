---
sidebar_position: 6
title: Response file
description: Answer checkpoints from outside the process by writing a file.
---

# Response file

Every checkpoint can be answered by writing to `<runDir>/approval-response.txt`. It's how something other than a person at the keyboard drives an agent: a script, a test, another program, or Claude Code piloting the agent.

## How it works

1. When a checkpoint starts, the kit deletes any stale response file in the run folder.
2. It checks the file once a second.
3. As soon as the file has non-blank content, that content (trimmed and lowercased) is the answer; the file is deleted and the port's question withdrawn.

| Checkpoint | Write | Means |
| --- | --- | --- |
| Decision | `y` or `yes` | Yes |
| Decision | `n` | No |
| Decision | `q` | Stop |
| Manual intervention | anything | Done |

An empty or blank file is not an answer: the kit keeps waiting.

```bash
# The run folder is the newest folder under .run/ (or wherever your agent keeps runs).
echo y > .run/2026-09-29T10-15-00-000Z/approval-response.txt
```

## Without a TTY the file is the only channel

When standard input isn't a terminal (a background process, a CI job, a pipe), the terminal port prints nothing and never answers: every checkpoint waits for the file. The agent keeps running meanwhile; nothing times out.

## Knowing a checkpoint is waiting

The run's [transcript](../security/transcript.md) (`<runDir>/transcript.jsonl`) gets a `pre_tool_use` line before every tool call, before any gate runs, and a `post_tool_use` line when the call ends. So:

- an **approval** is waiting when the last line is a `pre_tool_use` of `mcp__approvals__request_human_approval` (its `input.summary` says what for);
- a **manual intervention** is waiting after a `pre_tool_use` of `mcp__manualLogin__request_manual_login`;
- in **interactive** mode, the step gate is waiting on every `pre_tool_use` that has no `post_tool_use` yet.

A supervisor that approves by a policy of its own:

```ts title="supervise.ts"
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface TranscriptLine {
  event: "pre_tool_use" | "post_tool_use";
  tool: string;
  input?: { summary?: string };
}

export async function supervise(runDir: string, decide: (summary: string) => "y" | "n"): Promise<never> {
  let answered = 0; // how many approvals we already answered
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const lines = (await readFile(path.join(runDir, "transcript.jsonl"), "utf8").catch(() => ""))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as TranscriptLine);
    const approvals = lines.filter((l) => l.event === "pre_tool_use" && l.tool === "mcp__approvals__request_human_approval");
    if (approvals.length > answered) {
      const summary = approvals[answered].input?.summary ?? "";
      answered++;
      await writeFile(path.join(runDir, "approval-response.txt"), `${decide(summary)}\n`);
    }
  }
}

// supervise(runDir, (summary) => (/delete|remove/i.test(summary) ? "n" : "y"));
```

## Hosts without a terminal

A desktop app usually installs its own [interaction port](interaction-port.md) instead; it can still use the file (for a "remote approval" feature, say), or install `null` as the port to answer through the file alone.

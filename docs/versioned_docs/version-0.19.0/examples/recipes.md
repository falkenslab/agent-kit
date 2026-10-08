---
sidebar_position: 2
title: Recipes
description: Short, complete solutions to common needs when building an agent with the kit.
---

# Recipes

## A setup wizard, then the chat

Ask for the workspace and the mode once, remember them, then start the chat.

```ts
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSessionOptions, ensureClaudeAuth, isExitPromptError, runChatInk, runWizard, type Mode } from "@falkenslab/agent-kit";

const settingsFile = path.resolve(".agent-settings.json");
const saved = JSON.parse(await readFile(settingsFile, "utf8").catch(() => "{}")) as { workspace?: string; mode?: Mode };

let answers;
try {
  answers = await runWizard(
    [
      { type: "input", name: "workspace", message: "Workspace folder", default: saved.workspace ?? process.cwd() },
      {
        type: "select",
        name: "mode",
        message: "Supervision",
        choices: [
          { name: "Guided", value: "guided" },
          { name: "Step by step", value: "interactive" },
          { name: "Autonomous", value: "autonomous" },
        ],
        default: saved.mode ?? "guided",
      },
    ],
    { title: "My agent" },
  );
} catch (error) {
  if (isExitPromptError(error)) process.exit(0);
  throw error;
}
await writeFile(settingsFile, JSON.stringify(answers, null, 2));

await ensureClaudeAuth();
const workspace = path.resolve(String(answers.workspace));
const config = { mode: answers.mode as Mode, projectDir: workspace, knowledgeDir: path.join(workspace, "knowledge") };

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.join(workspace, ".run"),
  fullscreen: true,
  mode: config.mode,
});
```

## A browser agent with manual login

Playwright's MCP server drives a browser; the person logs in by hand when the agent can't; downloads go to the run folder and are kept with `save_to_sources`.

```ts
const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => loadPrompt("system.md", { site: config.siteUrl }),
  buildMcpServers: (config, runDir) => ({
    playwright: { command: "npx", args: ["@playwright/mcp@latest", "--output-dir", runDir] },
  }),
  pluginRoots: () => [path.join(here, "plugin")],
  buildSubagents: () => undefined,
  disallowedTools: ["mcp__playwright__browser_run_code_unsafe"],
  manualInterventionTexts: {
    toolDescription: "Call this when you can't log in by yourself. A person logs in by hand in the browser window.",
    confirmedMessage: "The person is done. Check you're logged in, then continue.",
    checkpointTitle: "Log in by hand",
    checkpointLines: ["Log in in the browser window the agent opened, then confirm here."],
  },
  saveToSourcesDescription:
    "Keep a document you downloaded from the site (it lands in this run's folder) in sources/, to study it in later sessions.",
  extensions: ["sources", "knowledge"],
};

const config: Config = {
  mode: "guided",
  projectDir: workspace,
  knowledgeDir: path.join(workspace, "knowledge"),
  sourcesDir: path.join(workspace, "sources"),
  siteUrl: "https://intranet.example.com",
};

const formatAction = createFriendlyToolLabel({
  describe: (tool, input) =>
    tool === "browser_navigate" ? `Opening ${truncate(String(input.url), 70)}` : tool === "browser_click" ? `Clicking "${truncate(String(input.element), 50)}"` : undefined,
  extraLocalServers: ["playwright"],
});
```

## A dangerous tool that always asks

```ts
tool("delete_page", "Delete a page of the site.", { pageId: z.string() }, async ({ pageId }) => {
  const answer = await askForDecision(runDir, { title: "Delete a page", lines: [`Page: ${pageId}`] });
  if (!["", "y", "yes"].includes(answer)) return { content: [{ type: "text" as const, text: "Not approved." }], isError: true };
  await site.deletePage(pageId);
  return { content: [{ type: "text" as const, text: `Deleted ${pageId}.` }] };
});
```

In every mode, the person confirms before the page is deleted. Build the server inside `buildMcpServers(config, runDir)` so it has the run folder.

## A chat for a non-technical audience

The tools' output is written for the model; a teacher or a client only needs to know what the agent is doing. Show the calls without their results, hide the raw lines of the tools that still show one when unfolded, and keep the labels friendly:

```ts
await runChatInk(opener, {
  runsDir,
  toolDetail: "calls", // "● Searching the web for …", no "Web search results for query: …" under it
  formatResult: (tool) => (tool.startsWith("mcp__playwright__") ? null : undefined),
  formatAction: createFriendlyToolLabel({ describe: (tool) => (tool === "mcp__playwright__browser_navigate" ? "Opening the page" : undefined) }),
});
```

Ctrl+O still unfolds everything for whoever needs to see it, and `session.log` keeps the full detail.

## A different prompt per mode

```ts
buildSystemPrompt: (config) =>
  [loadPrompt("role.md"), loadPrompt(config.mode === "autonomous" ? "autonomous.md" : "supervised.md")].join("\n\n"),
```

## Testing an agent

Answer checkpoints through the response file only, with a fixed language, and assert on the events:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildSessionOptions, runQuery, setInteractionPort, setLanguage } from "@falkenslab/agent-kit";

test("the agent asks before publishing", async () => {
  setLanguage("en");
  setInteractionPort(null); // checkpoints wait for the response file
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-"));
  const { options } = await buildSessionOptions({ mode: "guided", projectDir: runDir }, runDir, spec);

  const run = runQuery("Publish the weekly summary", options);
  const tools: string[] = [];
  for await (const event of run.events) {
    if (event.type === "action") {
      tools.push(event.toolName);
      if (event.toolName === "mcp__approvals__request_human_approval") {
        await writeFile(path.join(runDir, "approval-response.txt"), "n\n");
      }
    }
  }
  assert.ok(tools.includes("mcp__approvals__request_human_approval"));
});
```

These tests call the real model: keep them few and run them apart from your unit tests.

## Keeping a secret out of reach

```ts
const configFile = path.join(workspace, "agent.config.json");
const { password } = JSON.parse(await readFile(configFile, "utf8"));

const config: Config = {
  mode: "guided",
  projectDir: workspace,
  knowledgeDir: path.join(workspace, "knowledge"),
  deniedPaths: [configFile, path.join(workspace, ".env")],
  secrets: [password],
  password,
};
```

The agent can't read or search the file, and the value is redacted from `transcript.jsonl` if it ever shows up in a tool call.

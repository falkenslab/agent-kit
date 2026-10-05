import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const config: BaseSessionConfig = { mode: "guided", projectDir: path.resolve("/workspace") };
const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "subagent-tools-test-"));

function specWith(agents: Record<string, AgentDefinition> | undefined): AgentSpec<BaseSessionConfig> {
  return {
    buildSystemPrompt: () => "BASE PROMPT",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => (agents ? { agents, allowedSubagentTypes: Object.keys(agents) } : undefined),
    replyInLanguage: false,
  };
}

const researcher: AgentDefinition = { description: "Searches the web.", prompt: "…", tools: ["WebSearch", "WebFetch"] };
const runner: AgentDefinition = { description: "Runs things.", prompt: "…", tools: ["Bash", "Read"] };
const inheritor: AgentDefinition = { description: "Inherits every tool.", prompt: "…" };

async function sessionTools(agents?: Record<string, AgentDefinition>) {
  const { options } = await buildSessionOptions(config, runDir, specWith(agents));
  return { tools: options.tools as string[], allowed: options.allowedTools ?? [], hooks: options.hooks?.PreToolUse?.length ?? 0 };
}

test("subagents that don't list Bash: Agent and the three gates, but no Bash", async () => {
  const none = await sessionTools();
  const session = await sessionTools({ researcher });
  assert.ok(session.tools.includes("Agent"));
  assert.ok(!session.tools.includes("Bash"));
  assert.ok(!session.allowed.includes("Bash"));
  assert.equal(session.hooks, none.hooks + 3);
});

test("a subagent that lists Bash, or one without tools (it inherits them all), gets Bash in the session", async () => {
  for (const agents of [{ researcher, runner }, { inheritor }]) {
    const session = await sessionTools(agents);
    assert.ok(session.tools.includes("Agent") && session.tools.includes("Bash"), Object.keys(agents).join(", "));
    assert.ok(session.allowed.includes("Bash"));
  }
});

test("no subagents: neither Agent nor Bash", async () => {
  const session = await sessionTools();
  assert.ok(!session.tools.includes("Agent") && !session.tools.includes("Bash"));
});

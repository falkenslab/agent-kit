import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { HookCallbackMatcher } from "@anthropic-ai/claude-agent-sdk";
import { buildSessionOptions, claudeProjectDir } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "restrict-reads-test-"));
const sourcesDir = path.join(projectDir, "sources");
const config: BaseSessionConfig = {
  mode: "autonomous",
  projectDir,
  knowledgeDir: path.join(projectDir, "knowledge"),
  sourcesDir,
  extraReadableDirs: [path.join(projectDir, "reference")],
};
const pluginRoot = path.join(projectDir, "plugin");
const home = os.homedir();
const claudeHome = process.env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");

function makeSpec(overrides: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> {
  return {
    buildSystemPrompt: () => "BASE PROMPT",
    buildMcpServers: () => ({}),
    pluginRoots: () => [pluginRoot],
    buildSubagents: () => ({ agents: { reader: { description: "Reads.", prompt: "…", tools: ["Read", "Glob"] } }, allowedSubagentTypes: ["reader"] }),
    replyInLanguage: false,
    ...overrides,
  };
}

/** Every PreToolUse hook's verdict on a call: the first denial's reason, or undefined. */
async function verdict(hooks: HookCallbackMatcher[], tool_name: string, tool_input: Record<string, unknown>, agent_id?: string) {
  for (const matcher of hooks) {
    for (const hook of matcher.hooks) {
      const input = { hook_event_name: "PreToolUse", tool_name, tool_input, tool_use_id: "t1", session_id: "s", transcript_path: "", cwd: projectDir, ...(agent_id ? { agent_id } : {}) };
      const result = (await hook(input as never, "t1", { signal: new AbortController().signal })) as { hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string } };
      if (result.hookSpecificOutput?.permissionDecision === "deny") return result.hookSpecificOutput.permissionDecisionReason;
    }
  }
  return undefined;
}

async function sessionHooks(spec: AgentSpec<BaseSessionConfig>) {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "restrict-reads-run-"));
  const { options } = await buildSessionOptions(config, runDir, spec);
  return { hooks: options.hooks?.PreToolUse ?? [], runDir };
}

test("the main agent and its subagents read only the agent's folders and what the kit knows they need", async () => {
  const { hooks, runDir } = await sessionHooks(makeSpec());
  for (const agent of [undefined, "subagent-1"]) {
    const read = (file_path: string) => verdict(hooks, "Read", { file_path }, agent);
    assert.equal(await read(path.join(sourcesDir, "syllabus.pdf")), undefined);
    assert.equal(await read(path.join(projectDir, "reference", "rubric.md")), undefined);
    assert.equal(await read(path.join(pluginRoot, "skills", "joke", "SKILL.md")), undefined);
    assert.equal(await read(path.join(runDir, "transcript.jsonl")), undefined);
    assert.equal(await read(path.join(claudeProjectDir(projectDir), "0f1e2d3c", "tool-results", "output.txt")), undefined);

    assert.ok(await read(path.join(home, ".ssh", "id_ed25519")), "~/.ssh");
    assert.ok(await read(path.join(path.dirname(projectDir), "other-project", ".env")), "a sibling project's .env");
    assert.ok(await read(path.join(claudeHome, ".credentials.json")), "the SDK's credentials");
    assert.ok(await read(path.join(projectDir, "agent.config.json")), "the project root");
    assert.ok(await verdict(hooks, "Glob", { pattern: "*", path: path.join(home, "Documents") }, agent), "~/Documents");
    assert.equal(await verdict(hooks, "Glob", { pattern: "**/*.pdf", path: sourcesDir }, agent), undefined);
  }
});

test("extraReadableDirs gives the file tools with the knowledge base on its tools, and is searchable but not writable", async () => {
  const runDir = fs.mkdtempSync(path.join(os.tmpdir(), "restrict-reads-run-"));
  const { options } = await buildSessionOptions({ mode: "autonomous", projectDir, knowledgeDir: config.knowledgeDir, extraReadableDirs: config.extraReadableDirs }, runDir, makeSpec());
  const tools = options.tools as string[];
  assert.ok(["Read", "Glob", "Grep"].every((tool) => tools.includes(tool)));
  assert.ok(!tools.includes("Write"));
  const hooks = options.hooks?.PreToolUse ?? [];
  assert.equal(await verdict(hooks, "Grep", { pattern: "x", path: path.join(projectDir, "reference") }), undefined);
});

test("the CLI's folder for a project is its path with every character but letters and digits as -", () => {
  // The same on every system: "/work/my agent.v2" is "-work-my-agent-v2" on Linux and macOS,
  // "C--work-my-agent-v2" on Windows (the drive's "C:" plus the separator).
  const folder = path.basename(claudeProjectDir(path.resolve("/work/my agent.v2")));
  assert.match(folder, /^[A-Za-z]?-+work-my-agent-v2$/);
  assert.equal(path.dirname(claudeProjectDir(path.resolve("/work/x"))), path.join(claudeHome, "projects"));
});

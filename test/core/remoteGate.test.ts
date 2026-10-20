import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chooseConnectors, isConnectorTool, serverToolPrefix } from "../../src/core/claudeAiConnectors.js";
import { createRemoteGate } from "../../src/core/hooks/remoteGate.js";
import { setInteractionPort, type ApprovalPrompt } from "../../src/core/interaction.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { addExtension } from "../../src/core/externalExtensions.js";
import { describeSession } from "../../src/extensions/awareness/tools.js";
import { chatExtensionsCommand } from "../../src/chat/extensions.js";
import { setLanguage } from "../../src/core/messages/index.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

// The claude.ai connectors an agent lets in, and what a call to a remote server does (#70).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "remote-gate-test-"));
afterEach(() => setInteractionPort(null));

test("the connectors asked for are let in by the name claude.ai shows, the rest denied, and the missing said", () => {
  const found = ["claude.ai Claude Docs", "claude.ai Canva", "claude.ai Google Drive"];
  assert.deepEqual(chooseConnectors(found, ["canva", "Notion"]), { allowed: ["claude.ai Canva"], denied: ["claude.ai Claude Docs", "claude.ai Google Drive"], missing: ["Notion"] });
  assert.deepEqual(chooseConnectors(found, []), { allowed: [], denied: found, missing: [] });
  assert.equal(serverToolPrefix("claude.ai Claude Docs"), "mcp__claude_ai_Claude_Docs__");
  assert.equal(isConnectorTool("mcp__claude_ai_Canva__create_design"), true);
  assert.equal(isConnectorTool("mcp__campus-api__get_time"), false);
});

/** A PreToolUse call of the gate for `tool_name`: its decision, or none. */
const decide = async (gate: ReturnType<typeof createRemoteGate>, tool_name: string) =>
  ((await gate({ hook_event_name: "PreToolUse", tool_name, tool_input: { id: 1 }, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal })) as {
    hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
  }).hookSpecificOutput;

test("the remote gate blocks a connector not chosen, and lets remote calls go on, asks first, or blocks them as the agent says", async () => {
  setLanguage("en");
  const options = (policy: "allow" | "ask" | "deny", canAsk = true) => ({
    runDir: temp(),
    policy,
    destination: (tool: string) => (tool.startsWith("mcp__campus-api__") ? "mcp.example.com" : tool.startsWith("mcp__claude_ai_Canva__") ? "claude.ai Canva" : undefined),
    allowedConnectors: [serverToolPrefix("claude.ai Canva")],
    canAsk: () => canAsk,
  });
  const allow = createRemoteGate(options("allow"));
  assert.equal(await decide(allow, "mcp__campus-api__get_time"), undefined);
  assert.equal(await decide(allow, "mcp__claude_ai_Canva__create_design"), undefined);
  assert.equal(await decide(allow, "Read"), undefined);
  // A connector the agent didn't choose (one the account gained since): blocked, whatever the policy.
  assert.equal((await decide(allow, "mcp__claude_ai_Notion__search"))?.permissionDecision, "deny");

  const deny = createRemoteGate(options("deny"));
  assert.match((await decide(deny, "mcp__campus-api__get_time"))?.permissionDecisionReason ?? "", /calling mcp\.example\.com isn't allowed/);
  assert.equal(await decide(deny, "mcp__time__current_time"), undefined);

  // Asking: the person is told where it goes; yes goes on (the other gates still judge), no is blocked.
  const asked: ApprovalPrompt[] = [];
  let answer = "y";
  setInteractionPort({ askDecision: async (prompt) => (asked.push(prompt), answer), askManualIntervention: async () => "" });
  const ask = createRemoteGate(options("ask"));
  assert.equal(await decide(ask, "mcp__campus-api__get_time"), undefined);
  assert.equal(asked[0]?.title, "Send this to mcp.example.com? It leaves this computer");
  answer = "n";
  assert.match((await decide(ask, "mcp__claude_ai_Canva__create_design"))?.permissionDecisionReason ?? "", /didn't let this call go to claude\.ai Canva/);
  // No one to ask (autonomous): blocked.
  assert.equal((await decide(createRemoteGate(options("ask", false)), "mcp__campus-api__get_time"))?.permissionDecision, "deny");
});

test("a session with remoteServers: deny blocks an installed extension's remote server, and none asked keeps the connectors out", async () => {
  const dir = path.join(temp(), "campus");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "campus", description: "A campus." }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { api: { type: "http", url: "https://mcp.example.com/mcp" } } }));
  const projectDir = temp();
  const dirs = { agent: path.join(projectDir, "extensions") };
  await addExtension(dir, dirs.agent);
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false };
  const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs, remoteServers: "deny" }, temp(), spec);
  assert.equal((built.options.settings as { disableClaudeAiConnectors?: boolean }).disableClaudeAiConnectors, true);
  assert.equal(built.extensions.connectors, undefined);
  const hooks = built.options.hooks!.PreToolUse!.flatMap((matcher) => matcher.hooks);
  const denied = async (tool_name: string) => {
    for (const hook of hooks) {
      const output = (await hook({ hook_event_name: "PreToolUse", tool_name, tool_input: {}, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal })) as {
        hookSpecificOutput?: { permissionDecision?: string };
      };
      if (output.hookSpecificOutput?.permissionDecision === "deny") return true;
    }
    return false;
  };
  assert.equal(await denied("mcp__campus-api__get_time"), true);
  assert.equal(await denied("mcp__time__current_time"), false);
});

test("/extensions and about_me say which connectors are let in, and which the account hasn't", async () => {
  setLanguage("en");
  const status = { dirs: {}, untrusted: [], installed: [], active: [], about: {}, inactive: [], connectors: { allowed: ["claude.ai Canva"], missing: ["Notion"] } };
  const lines = (await chatExtensionsCommand("/extensions", status, true))?.lines ?? [];
  assert.ok(lines.includes("claude.ai connectors: Canva"), lines.join("\n"));
  assert.ok(lines.some((line) => line.startsWith("Not in your claude.ai account: Notion")), lines.join("\n"));
  const text = describeSession({
    kitVersion: "0.26.0",
    language: "en",
    mode: "guided",
    switchableModes: ["guided"],
    extensions: { active: [], inactive: [], connectors: { allowed: ["claude.ai Canva"], missing: ["Notion"] } },
    subagents: [],
    tools: [],
    skills: [],
    commands: [],
    runDir: "/run",
  });
  assert.match(text, /## claude\.ai connectors\n\nclaude\.ai Canva: their tools are the person's claude\.ai integrations; what you send them leaves the computer\. Asked for but not in the person's claude\.ai account: Notion/);
});

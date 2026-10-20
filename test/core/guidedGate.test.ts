import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createGuidedGate, type GuidedDecision } from "../../src/core/hooks/guidedGate.js";
import { setInteractionPort, type ApprovalPrompt } from "../../src/core/interaction.js";
import { addExtension, listInstalled, readLock, setExtensionConfirm } from "../../src/core/externalExtensions.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { chatExtensionsCommand } from "../../src/chat/extensions.js";
import { setLanguage } from "../../src/core/messages/index.js";
import type { Mode, AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

// Guided mode asks before an installed extension's tools that change things (#74, #76).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "guided-gate-test-"));
afterEach(() => setInteractionPort(null));

/** A scope with `canva` installed in its lock (nothing else is read). */
const scope = () => {
  const dir = temp();
  fs.writeFileSync(path.join(dir, "extensions.lock.json"), JSON.stringify({ canva: { source: "x", sha256: "", enabled: true, installed: "2026-10-20T00:00:00Z" } }));
  return dir;
};

/** A port that answers each choice with the option named `pick` (or the person's own words), keeping what it was asked. */
const port = () => {
  const asked: { prompt: ApprovalPrompt; options: readonly string[] }[] = [];
  const state = { pick: "Yes" };
  setInteractionPort({
    askDecision: async () => "y",
    askManualIntervention: async () => "",
    askChoice: async (prompt, choice) => {
      asked.push({ prompt, options: choice.options });
      const index = choice.options.indexOf(state.pick);
      return index >= 0 ? String(index + 1) : state.pick;
    },
  });
  return { asked, state };
};

const gateFor = (scopeDir: string, overrides: { mode?: Mode; destructive?: string[]; confirmTools?: string[]; autonomous?: "deny" | "allow"; decisions?: GuidedDecision[] } = {}) => {
  const mode = { now: overrides.mode ?? "guided" };
  const gate = createGuidedGate({
    runDir: temp(),
    mode: () => mode.now,
    extensions: [{ name: "canva", scopeDir, servers: ["canva"], confirmTools: overrides.confirmTools ?? [] }],
    isReadOnly: async (tool) => tool === "mcp__canva__search",
    isDestructive: async (tool) => (overrides.destructive ?? []).includes(tool),
    ...(overrides.autonomous ? { autonomous: overrides.autonomous } : {}),
    labels: () => ({ mcp__canva__create: { label: (input) => `Creating ${String(input.title)}` } }),
    record: async (decision) => void overrides.decisions?.push(decision),
  });
  return { gate, mode };
};

/** The gate's decision for a call to `tool_name`: "deny" with its reason, or undefined (no decision: the call goes on). */
const decide = async (gate: ReturnType<typeof createGuidedGate>, tool_name: string) => {
  const output = (await gate.preToolUse({ hook_event_name: "PreToolUse", tool_name, tool_input: { title: "Poster" }, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal })) as {
    hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
  };
  return output.hookSpecificOutput;
};

test("in guided mode an extension's tool that changes things asks; read-only ones, other tools and the other modes don't", async () => {
  setLanguage("en");
  const { asked } = port();
  const { gate, mode } = gateFor(scope());
  assert.equal(await decide(gate, "mcp__canva__create"), undefined);
  assert.equal(asked.length, 1);
  assert.equal(asked[0]!.prompt.title, "Let canva do this?");
  assert.equal(asked[0]!.prompt.lines[0], "Creating Poster");
  assert.deepEqual(asked[0]!.options, ["Yes", "Yes, for this session", "Yes, always", "No", "No, never"]);
  assert.equal(await decide(gate, "mcp__canva__search"), undefined);
  assert.equal(await decide(gate, "mcp__other__create"), undefined);
  assert.equal(await decide(gate, "Write"), undefined);
  assert.equal(asked.length, 1);
  // Interactive mode's step gate asks before everything; plan mode's gate denies: not this one's to decide.
  for (const other of ["interactive", "plan"] as const) {
    mode.now = other;
    assert.equal(await decide(gate, "mcp__canva__create"), undefined);
  }
  assert.equal(asked.length, 1);
});

test("a no denies the call, telling the model not to retry without asking, with the person's own words", async () => {
  setLanguage("en");
  const { state } = port();
  const decisions: GuidedDecision[] = [];
  const { gate } = gateFor(scope(), { decisions });
  state.pick = "No";
  assert.match((await decide(gate, "mcp__canva__create"))?.permissionDecisionReason ?? "", /didn't approve this call\. Don't retry it without asking them first/);
  state.pick = "not with that title";
  assert.match((await decide(gate, "mcp__canva__create"))?.permissionDecisionReason ?? "", /They said: not with that title/);
  assert.deepEqual(decisions.map((decision) => decision.answer), ["no", "no"]);
});

test("an approved batch lets calls through until the person's next message or the next approval request, except those that always ask", async () => {
  setLanguage("en");
  const { asked } = port();
  const { gate } = gateFor(scope(), { confirmTools: ["mcp__canva__publish"], destructive: ["mcp__canva__delete"] });
  gate.approvalAnswered(true);
  assert.equal(await decide(gate, "mcp__canva__create"), undefined);
  assert.equal(await decide(gate, "mcp__canva__create"), undefined);
  assert.equal(asked.length, 0);
  // confirmTools and a destructiveHint still ask, and aren't offered "always".
  await decide(gate, "mcp__canva__publish");
  await decide(gate, "mcp__canva__delete");
  assert.equal(asked.length, 2);
  assert.deepEqual(asked[0]!.options, ["Yes", "Yes, for this session", "No", "No, never"]);
  // The person's next message ends the batch.
  await gate.userPromptSubmit({ hook_event_name: "UserPromptSubmit", prompt: "more", session_id: "s", transcript_path: "", cwd: "" } as never, undefined, { signal: new AbortController().signal });
  await decide(gate, "mcp__canva__create");
  assert.equal(asked.length, 3);
  // So does a new approval request, whatever its answer.
  gate.approvalAnswered(true);
  await decide(gate, "mcp__approvals__request_human_approval");
  await decide(gate, "mcp__canva__create");
  assert.equal(asked.length, 4);
  // A rejected approval starts none.
  gate.approvalAnswered(false);
  await decide(gate, "mcp__canva__create");
  assert.equal(asked.length, 5);
});

test("yes this session holds for the session; yes always and no never are kept in the extension's lock for later sessions", async () => {
  setLanguage("en");
  const { asked, state } = port();
  const scopeDir = scope();
  const decisions: GuidedDecision[] = [];
  const { gate } = gateFor(scopeDir, { decisions });
  state.pick = "Yes, for this session";
  await decide(gate, "mcp__canva__create");
  await decide(gate, "mcp__canva__create");
  assert.equal(asked.length, 1);
  // Not in another session.
  await decide(gateFor(scopeDir).gate, "mcp__canva__create");
  assert.equal(asked.length, 2);

  state.pick = "Yes, always";
  await decide(gate, "mcp__canva__edit");
  assert.deepEqual((await readLock(scopeDir)).canva?.confirm, { tools: { edit: "always" } });
  assert.equal(await decide(gateFor(scopeDir).gate, "mcp__canva__edit"), undefined);
  assert.equal(asked.length, 3);

  state.pick = "No, never";
  assert.match((await decide(gate, "mcp__canva__share"))?.permissionDecisionReason ?? "", /never lets canva run share/);
  assert.equal((await decide(gateFor(scopeDir).gate, "mcp__canva__share"))?.permissionDecision, "deny");
  assert.equal(asked.length, 4);
  assert.deepEqual(decisions.map((decision) => decision.answer), ["session", "always", "never"]);
  assert.deepEqual((await readLock(scopeDir)).canva?.confirm, { tools: { edit: "always", share: "never" } });
});

test("a kept always doesn't cover a tool that always asks, and an extension the person turned the gate off for runs without asking", async () => {
  setLanguage("en");
  const { asked } = port();
  const scopeDir = scope();
  await setExtensionConfirm(scopeDir, "canva", { tool: { name: "publish", answer: "always" } });
  await decide(gateFor(scopeDir, { confirmTools: ["mcp__canva__publish"] }).gate, "mcp__canva__publish");
  assert.equal(asked.length, 1);
  await setExtensionConfirm(scopeDir, "canva", { off: true });
  assert.equal(await decide(gateFor(scopeDir, { confirmTools: ["mcp__canva__publish"] }).gate, "mcp__canva__publish"), undefined);
  assert.equal(asked.length, 1);
});

test("in autonomous mode, where no one can be asked, those tools are denied unless the agent says they run", async () => {
  setLanguage("en");
  const { asked } = port();
  const decisions: GuidedDecision[] = [];
  assert.match((await decide(gateFor(scope(), { mode: "autonomous", decisions }).gate, "mcp__canva__create"))?.permissionDecisionReason ?? "", /Autonomous mode: no one can approve/);
  assert.equal(await decide(gateFor(scope(), { mode: "autonomous" }).gate, "mcp__canva__search"), undefined);
  assert.equal(await decide(gateFor(scope(), { mode: "autonomous", autonomous: "allow" }).gate, "mcp__canva__create"), undefined);
  assert.equal(asked.length, 0);
  assert.deepEqual(decisions.map((decision) => decision.answer), ["autonomous-deny"]);
});

/** An installed extension with a remote server (nothing to start), `campus-api` in the session, and `confirmTools`. */
const installCampus = async () => {
  const dir = path.join(temp(), "campus");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "campus", description: "A campus.", metadata: { "agent-kit": { readOnlyTools: ["list"], confirmTools: ["publish"] } } }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { api: { type: "http", url: "https://mcp.example.com/mcp" } } }));
  const projectDir = temp();
  const dirs = { agent: path.join(projectDir, "extensions") };
  await addExtension(dir, dirs.agent);
  return { projectDir, dirs };
};

const spec = (extra: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> => ({ buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false, ...extra });

test("a session asks before an installed extension's tools, leaves out those the person said never to, and the agent can turn the gate off", async () => {
  setLanguage("en");
  const { asked } = port();
  const { projectDir, dirs } = await installCampus();
  await setExtensionConfirm(dirs.agent, "campus", { tool: { name: "erase", answer: "never" } });
  const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec());
  assert.ok(built.options.disallowedTools?.includes("mcp__campus-api__erase"));
  assert.equal(built.options.hooks?.UserPromptSubmit?.length, 1);
  const call = async (hooks: typeof built.options.hooks, tool_name: string) => {
    for (const hook of hooks!.PreToolUse!.flatMap((matcher) => matcher.hooks)) {
      await hook({ hook_event_name: "PreToolUse", tool_name, tool_input: {}, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal });
    }
  };
  await call(built.options.hooks, "mcp__campus-api__list");
  assert.equal(asked.length, 0);
  await call(built.options.hooks, "mcp__campus-api__publish");
  assert.equal(asked.length, 1);
  // publish is in the manifest's confirmTools, so "always" isn't offered.
  assert.ok(!asked[0]!.options.includes("Yes, always"));
  // The agent's own list adds to it, and it can turn the gate off.
  const own = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec({ extensionGate: { confirmTools: { campus: ["post"] } } }));
  await call(own.options.hooks, "mcp__campus-api__post");
  assert.ok(!asked[1]!.options.includes("Yes, always"));
  const off = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec({ extensionGate: { enabled: false } }));
  await call(off.options.hooks, "mcp__campus-api__publish");
  assert.equal(asked.length, 2);
  assert.equal(off.options.hooks?.UserPromptSubmit, undefined);
});

test("/extensions config lists what's kept about an extension's tools, and confirm=reset, off and on change it", async () => {
  setLanguage("en");
  const { dirs } = await installCampus();
  await setExtensionConfirm(dirs.agent, "campus", { tool: { name: "erase", answer: "never" } });
  const status = async () => ({ dirs, untrusted: [], installed: await listInstalled(dirs), active: [], about: {}, inactive: [] });
  const lines = async (line: string) => (await chatExtensionsCommand(line, await status(), true))?.lines ?? [];
  const listed = await lines("/extensions config campus");
  assert.ok(listed.includes("In guided mode, campus's tools that change things ask first (confirm=off runs them without asking):"), listed.join("\n"));
  assert.ok(listed.includes("  erase: never"), listed.join("\n"));
  assert.ok((await lines("/extensions config campus confirm=reset")).includes("  (no kept answers; confirm=reset forgets them)"));
  assert.deepEqual(await lines("/extensions config campus confirm=off"), ["In guided mode, campus's tools run without asking (confirm=on asks again)."]);
  assert.equal((await readLock(dirs.agent)).campus?.confirm?.off, true);
  assert.equal((await lines("/extensions config campus confirm=on"))[0], "In guided mode, campus's tools that change things ask first (confirm=off runs them without asking):");
  assert.equal((await readLock(dirs.agent)).campus?.confirm, undefined);
  assert.deepEqual(await lines("/extensions config campus confirm=maybe"), ["(confirm takes on, off or reset)"]);
});

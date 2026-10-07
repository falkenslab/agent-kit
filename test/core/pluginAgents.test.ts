import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { frontmatter, pluginAgents } from "../../src/core/pluginAgents.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "plugin-agents-test-"));

/** A plugin named `name` with `agents` (file → content). */
function makePlugin(name: string, agents: Record<string, string>): string {
  const root = temp();
  fs.mkdirSync(path.join(root, ".claude-plugin"));
  fs.writeFileSync(path.join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ name }));
  fs.mkdirSync(path.join(root, "agents"));
  for (const [file, content] of Object.entries(agents)) fs.writeFileSync(path.join(root, "agents", file), content);
  return root;
}

const parrot = "---\nname: parrot\ndescription: Scores a joke from 1 to 10.\ntools: []\nmodel: haiku\nmaxTurns: 1\n---\n\nYou are the parrot. Score the joke.\n";
const runner = "---\nname: runner\ndescription: Runs things.\ntools: Bash, Read\n---\nRun it.\n";
const heir = "---\nname: heir\ndescription: Inherits every tool.\n---\nDo it.\n";

test("frontmatter: values, inline and YAML lists, and the body", () => {
  assert.deepEqual(frontmatter("---\nname: x\ntools: [Read, \"Glob\"]\nalso:\n  - a\n  - b\n---\n\nBody.\n"), { fields: { name: "x", tools: ["Read", "Glob"], also: ["a", "b"] }, body: "Body." });
  assert.deepEqual(frontmatter("No frontmatter."), { fields: {}, body: "No frontmatter." });
});

test("a plugin's subagents are read as the SDK names them, by their frontmatter name, not their file", async () => {
  const root = makePlugin("jokebook", { "the-parrot-file.md": parrot, "runner.md": runner, "heir.md": heir });
  const agents = await pluginAgents([root, temp()]);
  assert.deepEqual(Object.keys(agents).sort(), ["jokebook:heir", "jokebook:parrot", "jokebook:runner"]);
  assert.deepEqual(agents["jokebook:parrot"], { description: "Scores a joke from 1 to 10.", prompt: "You are the parrot. Score the joke.", tools: [], model: "haiku", maxTurns: 1 });
  assert.deepEqual(agents["jokebook:runner"].tools, ["Bash", "Read"]);
  assert.equal(agents["jokebook:heir"].tools, undefined);
});

function makeSpec(overrides: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> {
  return { buildSystemPrompt: () => "BASE PROMPT", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false, ...overrides };
}

test("a plugin's subagents are registered like the spec's: Agent, allowed to be spawned, with the reply line, and Bash only if one uses it", async () => {
  const config: BaseSessionConfig = { mode: "guided", projectDir: temp() };
  const onlyParrot = makePlugin("jokebook", { "parrot.md": parrot });
  const { options } = await buildSessionOptions(config, temp(), makeSpec({ pluginRoots: () => [onlyParrot], replyInLanguage: true }));
  assert.ok((options.tools as string[]).includes("Agent"));
  assert.ok(!(options.tools as string[]).includes("Bash"));
  assert.match(options.agents?.["jokebook:parrot"].prompt ?? "", /^You are the parrot\. Score the joke\.\n\nLanguage: /);

  // The type gate lets it be spawned, and still refuses what isn't declared.
  const typeGate = options.hooks!.PreToolUse!.flatMap((matcher) => matcher.hooks);
  const spawn = async (subagent_type: string) => {
    for (const hook of typeGate) {
      const result = (await hook({ hook_event_name: "PreToolUse", tool_name: "Agent", tool_input: { subagent_type, prompt: "x", description: "x" } } as unknown as PreToolUseHookInput, "t", { signal: new AbortController().signal })) as {
        hookSpecificOutput?: { permissionDecision?: string };
      };
      if (result.hookSpecificOutput?.permissionDecision === "deny") return "deny";
    }
    return "allow";
  };
  assert.equal(await spawn("jokebook:parrot"), "allow");
  assert.equal(await spawn("general-purpose"), "deny");

  const withRunner = await buildSessionOptions(config, temp(), makeSpec({ pluginRoots: () => [makePlugin("crew", { "runner.md": runner })] }));
  assert.ok((withRunner.options.tools as string[]).includes("Bash"));
});

test("the spec's subagents and the plugins' together", async () => {
  const spec = makeSpec({
    pluginRoots: () => [makePlugin("jokebook", { "parrot.md": parrot })],
    buildSubagents: () => ({ agents: { kitten: { description: "Finds jokes.", prompt: "Find.", tools: ["WebSearch"] } }, allowedSubagentTypes: ["kitten"] }),
  });
  const { options } = await buildSessionOptions({ mode: "guided", projectDir: temp() }, temp(), spec);
  assert.deepEqual(Object.keys(options.agents ?? {}).sort(), ["jokebook:parrot", "kitten"]);
});

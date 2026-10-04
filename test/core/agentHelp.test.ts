import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { agentHelpSkillPath, identityPromptSection } from "../../src/core/agentHelp.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { agentKitVersion } from "../../src/core/version.js";
import { en } from "../../src/core/messages/en.js";
import { DEFAULT_EXIT_COMMANDS, LOCAL_COMMANDS } from "../../src/tui/ink/runChatInk.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const projectDir = path.resolve("/workspace");

function makeSpec(overrides: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> {
  return {
    buildSystemPrompt: () => "BASE PROMPT",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
    replyInLanguage: false,
    ...overrides,
  };
}

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "agent-help-test-"));
const identity = { name: "padawan", version: "1.2.3", description: "an agent that takes a Moodle course as a student" };

test("with an identity, the system prompt says who the agent is and both versions", async () => {
  const { options } = await buildSessionOptions({ mode: "guided", projectDir }, tempDir(), makeSpec({ identity }));
  const prompt = options.systemPrompt as string;
  assert.ok(prompt.startsWith("BASE PROMPT\n\n## Who you are\n"));
  assert.match(prompt, /You are padawan 1\.2\.3: an agent that takes a Moodle course as a student\./);
  assert.ok(prompt.includes(`agent-kit ${agentKitVersion()}`));
  assert.match(prompt, /`agent-help` skill/);
});

test("only the name is required", () => {
  assert.match(identityPromptSection({ name: "miyagi" }), /You are miyagi\. You are built on agent-kit/);
});

test("without an identity, the prompt and the plugins don't change", async () => {
  const { options } = await buildSessionOptions({ mode: "guided", projectDir }, tempDir(), makeSpec());
  assert.equal(options.systemPrompt, "BASE PROMPT");
  assert.equal(options.plugins, undefined);
});

test("with an identity, the agent-help skill is offered, with this session's facts and the agent's own guide", async () => {
  const runDir = tempDir();
  const guide = path.join(runDir, "guide.md");
  fs.writeFileSync(guide, "## Commands\n\n- `/padawan:enrol` signs up for a course.\n");
  const config: BaseSessionConfig = { mode: "guided", projectDir, knowledgeDir: path.join(projectDir, "notes"), sourcesDir: path.join(projectDir, "course") };
  const { options } = await buildSessionOptions(config, runDir, makeSpec({ identity, helpGuide: guide, skills: ["own:skill"] }));

  const root = path.join(runDir, "agent-help");
  assert.ok(options.plugins?.some((plugin) => plugin.path === root));
  assert.ok(options.tools && (options.tools as string[]).includes("Skill"));
  assert.ok((options.skills as string[]).includes("agent-kit:agent-help"));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8")).name, "agent-kit");

  const skill = fs.readFileSync(path.join(root, "skills", "agent-help", "SKILL.md"), "utf8");
  assert.ok(skill.startsWith("---\nname: agent-help\n"));
  assert.match(skill, /started in \*\*guided\*\* mode/);
  assert.match(skill, /goes through: guided, interactive, plan/);
  assert.match(skill, /\/knowledge:ingest/);
  assert.match(skill, /Originals go in `course\/`/);
  assert.match(skill, /## This agent\n[\s\S]*`\/padawan:enrol` signs up for a course/);
});

test("without a guide, the skill says the agent's domain isn't documented; an autonomous session can't switch modes", async () => {
  const runDir = tempDir();
  await buildSessionOptions({ mode: "autonomous", projectDir }, runDir, makeSpec({ identity }));
  const skill = fs.readFileSync(path.join(runDir, "agent-help", "skills", "agent-help", "SKILL.md"), "utf8");
  assert.match(skill, /has no guide of its own/);
  assert.match(skill, /can't be switched during this session/);
  assert.doesNotMatch(skill, /\/knowledge:/);
});

test("the skill's slash commands are exactly the chat's own", () => {
  const skill = fs.readFileSync(agentHelpSkillPath(), "utf8");
  const commandsSection = skill.split("## Commands")[1]!.split("\n## ")[0]!;
  const listed = new Set([...commandsSection.matchAll(/^- `(\/[a-z]+)`(?: or `(\/[a-z]+)`)?/gm)].flatMap((m) => [m[1], m[2]].filter(Boolean)));
  assert.deepEqual([...listed].sort(), [...DEFAULT_EXIT_COMMANDS, ...Object.values(LOCAL_COMMANDS)].sort());
});

test("every key in the chat's shortcuts panel is in the skill", () => {
  const skill = fs.readFileSync(agentHelpSkillPath(), "utf8");
  const keys = new Set(en.shortcuts.flatMap((line) => [...line.matchAll(/(?:Ctrl|Shift)\+[A-Za-z←→]+|\bEsc\b|PgUp|PgDn|--continue/g)].map((m) => m[0])));
  assert.ok(keys.size > 8);
  for (const key of keys) assert.ok(skill.includes(key), `the skill doesn't mention ${key}`);
});

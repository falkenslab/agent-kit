import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { McpServerConfig } from "@anthropic-ai/claude-agent-sdk";
import { awarenessPluginRoot, identityPromptSection } from "../../../src/extensions/awareness/index.js";
import { buildSessionOptions } from "../../../src/core/session.js";
import { sessionViewOf } from "../../../src/core/sessionFacts.js";
import { agentKitVersion } from "../../../src/core/version.js";
import { en } from "../../../src/core/messages/en.js";
import { DEFAULT_EXIT_COMMANDS, LOCAL_COMMANDS } from "../../../src/tui/ink/runChatInk.js";
import type { AgentSpec, BaseSessionConfig } from "../../../src/core/agentSpec.js";

const projectDir = path.resolve("/workspace");
const skillPath = path.join(awarenessPluginRoot(), "skills", "help", "SKILL.md");

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

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "awareness-test-"));
const identity = { name: "padawan", version: "1.2.3", description: "an agent that takes a Moodle course as a student" };

type Handler = (args: unknown, extra: unknown) => Promise<{ content: { text: string }[] }>;
const aboutMe = (server: McpServerConfig | undefined): Handler =>
  (server as unknown as { instance: { _registeredTools: Record<string, { handler: Handler }> } }).instance._registeredTools.about_me!.handler;

test("with awareness, the prompt says who the agent is and where to look; its tool and help skill are offered", async () => {
  const { options } = await buildSessionOptions({ mode: "guided", projectDir }, tempDir(), makeSpec({ identity, extensions: ["awareness"] }));
  const prompt = options.systemPrompt as string;
  assert.match(prompt, /## Who you are\nYou are padawan 1\.2\.3: an agent that takes a Moodle course as a student\./);
  assert.ok(prompt.includes(`agent-kit ${agentKitVersion()}`));
  assert.match(prompt, /call `about_me`/);
  assert.match(prompt, /load the `help` skill/);
  assert.ok(options.mcpServers?.awareness);
  assert.ok(options.plugins?.some((plugin) => plugin.path === awarenessPluginRoot()));
  assert.equal(options.skills, "all");
  assert.ok((options.tools as string[]).includes("Skill"));
});

test("only the name is required", () => {
  assert.match(identityPromptSection({ name: "miyagi" }), /You are miyagi\. You are built on agent-kit/);
});

test("without awareness there's no section, tool or skill, identity or not; without identity it's off, with why", async () => {
  const { options } = await buildSessionOptions({ mode: "guided", projectDir }, tempDir(), makeSpec({ identity }));
  assert.equal(options.systemPrompt, "BASE PROMPT");
  assert.equal(options.mcpServers?.awareness, undefined);
  assert.equal(options.plugins, undefined);

  const off = await buildSessionOptions({ mode: "guided", projectDir }, tempDir(), makeSpec({ extensions: ["awareness"] }));
  assert.equal(off.options.mcpServers?.awareness, undefined);
  assert.deepEqual(off.extensions.inactive, [{ name: "awareness", reason: "needs `identity` in the spec" }]);
});

test("about_me answers with the session as it is now: the mode after a switch, the extensions' tools, what's off and why, subagents, commands, context", async () => {
  const runDir = tempDir();
  const config: BaseSessionConfig = { mode: "guided", projectDir, knowledgeDir: path.join(projectDir, "notes") };
  const spec = makeSpec({
    identity,
    extensions: ["awareness", "knowledge", "memory"],
    buildSubagents: () => ({ agents: { "quiz-checker": { description: "Checks a quiz's answers", prompt: "…", tools: ["Read"] } }, allowedSubagentTypes: ["quiz-checker"] }),
  });
  const { options, modeControl } = await buildSessionOptions(config, runDir, spec);
  const ask = aboutMe(options.mcpServers?.awareness);

  let now = (await ask({}, {})).content[0]!.text;
  assert.match(now, /You are padawan 1\.2\.3/);
  assert.match(now, /## Mode\n\n\*\*guided\*\*/);
  assert.match(now, /\*\*knowledge\*\*: .*Tools: \*/); // before the session starts: its server, not its tools yet
  assert.match(now, /\*\*memory\*\* is off: it needs `memoryDir` in the config\./);
  assert.match(now, /\*\*quiz-checker\*\*: Checks a quiz's answers/);

  // Shift+Tab, and the running session telling its tools, commands and context.
  modeControl.set("plan");
  sessionViewOf({ ...options })!.attach({
    tools: ["Read", "Skill", "mcp__knowledge__knowledge_create", "mcp__knowledge__knowledge_read", "mcp__awareness__about_me"],
    supportedCommands: async () => [{ name: "knowledge:query", description: "Answer from the knowledge base", argumentHint: "<question>" }],
    contextUsage: async () => ({ percentage: 12.4, totalTokens: 24_800, maxTokens: 200_000 }),
  });
  now = (await ask({ part: "now" }, {})).content[0]!.text;
  assert.match(now, /## Mode\n\n\*\*plan\*\*/);
  assert.match(now, /Tools: knowledge_create, knowledge_read\./);
  assert.match(now, /## Built-in tools\n\nRead, Skill\./);
  assert.match(now, /`\/knowledge:query <question>`: Answer from the knowledge base/);
  assert.match(now, /12% of the context window used \(25k of 200k tokens\)/);
});

test("about_me's guide part is the agent's own guide, or says there's none", async () => {
  const runDir = tempDir();
  const guide = path.join(runDir, "guide.md");
  fs.writeFileSync(guide, "## Commands\n\n- `/padawan:enrol` signs up for a course.\n");
  const withGuide = await buildSessionOptions({ mode: "guided", projectDir }, runDir, makeSpec({ identity, helpGuide: guide, extensions: ["awareness"] }));
  assert.match((await aboutMe(withGuide.options.mcpServers?.awareness)({ part: "guide" }, {})).content[0]!.text, /`\/padawan:enrol` signs up for a course/);
  const without = await buildSessionOptions({ mode: "autonomous", projectDir }, tempDir(), makeSpec({ identity, extensions: ["awareness"] }));
  const ask = aboutMe(without.options.mcpServers?.awareness);
  assert.match((await ask({ part: "guide" }, {})).content[0]!.text, /no guide of your own/);
  assert.match((await ask({}, {})).content[0]!.text, /can't be switched in this session/);
});

test("the help skill's slash commands are exactly the chat's own", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  const commandsSection = skill.split("## Commands")[1]!.split("\n## ")[0]!;
  const listed = new Set([...commandsSection.matchAll(/^- `(\/[a-z]+)`(?: or `(\/[a-z]+)`)?/gm)].flatMap((m) => [m[1], m[2]].filter(Boolean)));
  assert.deepEqual([...listed].sort(), [...DEFAULT_EXIT_COMMANDS, ...Object.values(LOCAL_COMMANDS)].sort());
});

test("every key in the chat's shortcuts panel is in the help skill", () => {
  const skill = fs.readFileSync(skillPath, "utf8");
  const keys = new Set(en.shortcuts.flatMap((line) => [...line.matchAll(/(?:Ctrl|Shift)\+[A-Za-z←→]+|\bEsc\b|PgUp|PgDn|--continue/g)].map((m) => m[0])));
  assert.ok(keys.size > 8);
  for (const key of keys) assert.ok(skill.includes(key), `the skill doesn't mention ${key}`);
});

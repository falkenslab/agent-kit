import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSessionOptions, pluginSkills } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "plugin-skills-test-"));

/** A plugin named `name` with `skills`: folder name → SKILL.md content. */
function makePlugin(name: string, skills: Record<string, string>): string {
  const root = temp();
  fs.mkdirSync(path.join(root, ".claude-plugin"));
  fs.writeFileSync(path.join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ name }));
  for (const [folder, content] of Object.entries(skills)) {
    fs.mkdirSync(path.join(root, "skills", folder), { recursive: true });
    fs.writeFileSync(path.join(root, "skills", folder, "SKILL.md"), content);
  }
  return root;
}

const captainPlugin = makePlugin("captain", {
  "pirate-joke": "---\nname: pirate-joke\ndescription: A pun.\n---\n\nTell one.\n",
  renamed: "---\ndescription: No name: the folder's.\nname: \"miau\"\n---\n",
  untitled: "Just text, no frontmatter.\n",
});

test("a plugin's skills are named as the SDK names them: plugin:folder, whatever the frontmatter's name", async () => {
  assert.deepEqual((await pluginSkills([captainPlugin])).sort(), ["captain:pirate-joke", "captain:renamed", "captain:untitled"]);
});

test("a folder that isn't a plugin, or a plugin without skills, adds nothing", async () => {
  assert.deepEqual(await pluginSkills([temp(), makePlugin("empty", {})]), []);
});

test('skills: "plugins" offers the skills of every plugin the session loads, the kit\'s included', async () => {
  const projectDir = temp();
  const spec: AgentSpec<BaseSessionConfig> = {
    buildSystemPrompt: () => "BASE PROMPT",
    buildMcpServers: () => ({}),
    pluginRoots: () => [captainPlugin],
    buildSubagents: () => undefined,
    replyInLanguage: false,
    identity: { name: "captain" },
    skills: "plugins",
  };
  const config: BaseSessionConfig = { mode: "guided", projectDir, knowledgeDir: path.join(projectDir, "logbook") };
  const { options } = await buildSessionOptions(config, temp(), spec);
  assert.deepEqual(
    [...(options.skills as string[])].sort(),
    ["agent-kit:agent-help", "captain:pirate-joke", "captain:renamed", "captain:untitled", "knowledge:knowledge-ingest", "knowledge:knowledge-lint", "knowledge:knowledge-query"],
  );
});

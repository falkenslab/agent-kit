import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { capabilitiesProblem, describeCapability, extensionsPromptSection, readExtensionManifest, requiredCapabilities, resolveExtensions, type Extension, type ExtensionContext } from "../../src/core/extensions.js";
import { buildSessionOptions } from "../../src/core/session.js";
import { knowledge } from "../../src/extensions/knowledge/index.js";
import { sources } from "../../src/extensions/sources/index.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const noSession = () => Promise.reject(new Error("no session in this test"));

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "extensions-test-"));

/** A plugin named `name` whose manifest provides and requires capabilities, with `skills` (folder → SKILL.md). */
function makePlugin(name: string, kit: { provides?: string[]; requires?: string[]; capabilities?: unknown[] } = {}, skills: Record<string, string> = {}): string {
  const root = temp();
  fs.mkdirSync(path.join(root, ".claude-plugin"));
  fs.writeFileSync(path.join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ name, description: `The ${name} extension.`, metadata: { "agent-kit": kit } }));
  for (const [folder, content] of Object.entries(skills)) {
    fs.mkdirSync(path.join(root, "skills", folder), { recursive: true });
    fs.writeFileSync(path.join(root, "skills", folder, "SKILL.md"), content);
  }
  return root;
}

const extension = (name: string, plugin: string, extra: Partial<Extension> = {}): Extension => ({ name, plugin, contribute: async () => ({}), ...extra });

function makeSpec(overrides: Partial<AgentSpec<BaseSessionConfig>> = {}): AgentSpec<BaseSessionConfig> {
  return { buildSystemPrompt: () => "BASE PROMPT", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false, ...overrides };
}

const projectDir = temp();
const context: ExtensionContext = { config: { mode: "guided", projectDir }, spec: makeSpec(), runDir: temp(), mode: "guided", interactive: true, capabilities: new Set(), session: noSession };

test("an extension's manifest gives its name, description and capabilities, under the kit's key", () => {
  const manifest = readExtensionManifest(makePlugin("jokebook", { provides: ["jokes"], requires: ["knowledge-base"] }));
  assert.deepEqual(manifest, { name: "jokebook", description: "The jokebook extension.", provides: ["jokes"], requires: ["knowledge-base"], capabilities: [] });
  // The kit's own declare theirs.
  const kit = resolveExtensions([sources({ dir: projectDir }), knowledge({ dir: projectDir })], context);
  assert.deepEqual([...kit.capabilities].sort(), ["knowledge-base", "sources"]);
});

/** moodle-teacher's grading, as #62 writes it: a neutral id, its skill and tools, texts in two languages. */
const grading = {
  id: "lms-grading",
  skills: ["grading"],
  tools: ["get_rubric", "grade_submission"],
  texts: { en: { label: "Grading with rubrics", description: "Grades submissions with the course's rubrics." }, es: { label: "Corregir con rúbricas", description: "Corrige entregas con las rúbricas del curso." } },
};

test("an extension's capabilities are read, provided by their ids, and described in the person's language, English when it's missing", () => {
  const manifest = readExtensionManifest(makePlugin("moodle-teacher", { provides: ["moodle"], capabilities: [grading, { id: "" }, { skills: ["x"] }, { id: "lms-forums", texts: { xx: { label: "?" } } }] }));
  // What has no id is dropped; a language the kit doesn't speak too.
  assert.deepEqual(manifest.capabilities.map(({ id }) => id), ["lms-grading", "lms-forums"]);
  assert.deepEqual(manifest.provides, ["moodle", "lms-grading", "lms-forums"]);
  assert.deepEqual(describeCapability(manifest.capabilities[0]!, "es"), { id: "lms-grading", label: "Corregir con rúbricas", description: "Corrige entregas con las rúbricas del curso." });
  assert.deepEqual(describeCapability(manifest.capabilities[0]!, "de"), { id: "lms-grading", label: "Grading with rubrics", description: "Grades submissions with the course's rubrics." });
  // Without a text, its id.
  assert.deepEqual(describeCapability(manifest.capabilities[1]!, "es"), { id: "lms-forums", label: "lms-forums", description: "" });
});

test("a skill requiring a neutral capability is offered when an extension provides it as a capability, and the prompt names it with its label", async () => {
  const teacher = extension("moodle-teacher", makePlugin("moodle-teacher", { capabilities: [grading] }, { grading: "---\nname: grading\n---\n" }));
  const planner = extension("planner", makePlugin("planner", { requires: ["lms-grading"] }));
  const resolved = resolveExtensions([teacher, planner], context);
  assert.deepEqual(resolved.active.map(({ extension }) => extension.name), ["moodle-teacher", "planner"]);
  assert.match(extensionsPromptSection(resolved), /Provides: lms-grading \(Grading with rubrics\)\./);
  assert.deepEqual(resolveExtensions([planner], context).inactive, [{ name: "planner", reason: "requires lms-grading, which no enabled extension provides" }]);
});

test("capabilities that name a skill the extension doesn't have, or the same id twice, don't hold", async () => {
  const root = makePlugin("moodle-teacher", {}, { grading: "---\nname: grading\n---\n" });
  assert.equal(await capabilitiesProblem(root, [{ ...grading, texts: {} }]), undefined);
  assert.equal(await capabilitiesProblem(root, [{ ...grading, skills: ["grading", "forums"], texts: {} }]), "names the skill forums in its capability lms-grading, and has no skills/forums/SKILL.md");
  assert.equal(await capabilitiesProblem(root, [{ ...grading, texts: {} }, { ...grading, texts: {} }]), "declares the capability lms-grading twice");
});

test("enabled extensions run in order; one the session lacks something for, or whose requirements nothing provides, is left out with why", () => {
  const memory = extension("memory", makePlugin("memory", { provides: ["memory"] }));
  const ranking = extension("ranking", makePlugin("ranking", { requires: ["memory"] }));
  const scoring = extension("scoring", makePlugin("scoring", { provides: ["scores"], requires: ["ranking-data"] }));
  const judge = extension("judge", makePlugin("judge", { requires: ["scores"] }));
  const offline = extension("offline", makePlugin("offline"), { missing: () => "needs `cacheDir` in the config" });

  const resolved = resolveExtensions([memory, ranking, scoring, judge, offline, knowledge({ dir: () => undefined })], context);
  assert.deepEqual(resolved.active.map(({ extension }) => extension.name), ["memory", "ranking"]);
  assert.deepEqual(resolved.inactive, [
    { name: "offline", reason: "needs `cacheDir` in the config" },
    { name: "knowledge", reason: "needs a folder (`dir`)" },
    { name: "scoring", reason: "requires ranking-data, which no enabled extension provides" },
    // Dropping scoring starves judge: requirements are resolved until nothing more drops out.
    { name: "judge", reason: "requires scores, which no enabled extension provides" },
  ]);
  assert.deepEqual([...resolved.capabilities], ["memory"]);

  const section = extensionsPromptSection(resolved);
  assert.match(section, /^## Extensions\n/);
  assert.match(section, /- \*\*memory\*\*: The memory extension\. Provides: memory\./);
  assert.match(section, /- \*\*judge\*\* isn't available: it requires scores, which no enabled extension provides\. If the person asks for what it does, tell them why\./);
});

test("a plugin whose name isn't the extension's is an error", () => {
  assert.throws(() => resolveExtensions([extension("parrot", makePlugin("crow"))], context), /has the plugin "crow"/);
});

test("a skill's requires: inline, as a list, or none", () => {
  assert.deepEqual(requiredCapabilities("---\nname: x\nrequires: knowledge-base\n---\nBody"), ["knowledge-base"]);
  assert.deepEqual(requiredCapabilities("---\nrequires: [knowledge-base, \"sources\"]\ndescription: y\n---\n"), ["knowledge-base", "sources"]);
  assert.deepEqual(requiredCapabilities("---\nrequires:\n  - knowledge-base\n  - sources\ndescription: y\n---\n"), ["knowledge-base", "sources"]);
  assert.deepEqual(requiredCapabilities("---\nname: x\n---\n"), []);
  assert.deepEqual(requiredCapabilities("No frontmatter."), []);
});

test("a skill that requires a capability nothing enabled provides isn't offered, with skills: \"all\" or a list", async () => {
  const jokebook = makePlugin("jokebook", { provides: ["jokes"] }, {
    tell: "---\nname: tell\ndescription: Tell a joke.\n---\n",
    rank: "---\nname: rank\ndescription: Rank the jokes in the knowledge base.\nrequires: knowledge-base\n---\n",
  });
  const spec = (overrides: Partial<AgentSpec<BaseSessionConfig>>) => makeSpec({ extensions: [extension("jokebook", jokebook)], ...overrides });
  const config: BaseSessionConfig = { mode: "guided", projectDir };

  // "all" becomes a list without it (the SDK's skillOverrides doesn't reach plugin skills).
  const all = await buildSessionOptions(config, temp(), spec({}));
  assert.deepEqual(all.options.skills, ["jokebook:tell"]);
  const listed = await buildSessionOptions(config, temp(), spec({ skills: ["own:x"] }));
  assert.deepEqual([...(listed.options.skills as string[])].sort(), ["jokebook:tell", "own:x"]);

  // With the knowledge base on, it's offered, and "all" stays "all".
  const knowledgeDir = path.join(temp(), "kb");
  const withKnowledge = await buildSessionOptions(config, temp(), makeSpec({ extensions: [knowledge({ dir: knowledgeDir }), extension("jokebook", jokebook)] }));
  assert.equal(withKnowledge.options.skills, "all");
  assert.ok(withKnowledge.options.plugins?.some((plugin) => plugin.path === jokebook));
});

test("no extensions enabled: no Extensions section, and a writable folder is the agent's own notes", async () => {
  const { options } = await buildSessionOptions({ mode: "guided", projectDir, extraWritableDirs: [path.join(projectDir, "notes")] }, temp(), makeSpec());
  assert.equal(options.systemPrompt, "BASE PROMPT");
  assert.ok(["Read", "Write", "Edit", "Glob", "Grep"].every((tool) => (options.tools as string[]).includes(tool)));
  assert.equal(options.mcpServers?.knowledge, undefined);
});

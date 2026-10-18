import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createCatalogTool } from "../../../src/extensions/awareness/catalog.js";
import { awareness, identityPromptSection } from "../../../src/extensions/awareness/index.js";
import { addExtension, listInstalled } from "../../../src/core/externalExtensions.js";
import { addMarketplace } from "../../../src/core/marketplaces.js";
import { buildSessionOptions } from "../../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../../src/core/agentSpec.js";
import type { SessionFacts } from "../../../src/core/sessionFacts.js";

// The agent as an advisor on extensions (#64): what's installed, what its catalogs offer, what's new.

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "awareness-catalog-test-"));
const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", ...args], { cwd, stdio: "pipe" });

/** A plugin `name` in `root`, at `version`, with `topics` and one capability. */
function writePlugin(root: string, name: string, version: string, topics: string[], description: string): void {
  fs.mkdirSync(path.join(root, name, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(root, name, ".claude-plugin", "plugin.json"),
    JSON.stringify({
      name,
      version,
      description,
      keywords: topics,
      metadata: { "agent-kit": { capabilities: [{ id: `${name}-things`, texts: { en: { label: `Doing ${name} things` }, es: { label: `Hacer cosas de ${name}` } } }] } },
    }),
  );
}

/** A marketplace `harbor` in a folder, offering `plugins` ([name, version, topics, description]). */
function makeMarketplace(plugins: [string, string, string[], string][]): string {
  const root = path.join(temp(), "harbor");
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  const write = () =>
    fs.writeFileSync(path.join(root, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: "harbor", owner: { name: "Ada" }, plugins: plugins.map(([name, version, , description]) => ({ name, source: `./${name}`, version, description })) }));
  for (const [name, version, topics, description] of plugins) writePlugin(root, name, version, topics, description);
  write();
  return root;
}

const noSession = async () => ({ extensions: { active: [], inactive: [] } }) as unknown as SessionFacts;
const call = async (tool: ReturnType<typeof createCatalogTool>, args: { words?: string; refresh?: boolean } = {}): Promise<string> =>
  ((await tool.handler(args, {})) as { content: { text: string }[] }).content[0]!.text;

test("with a folder for extensions the agent has the catalog and its rules; without one, neither", async () => {
  assert.match(identityPromptSection({ name: "miyagi" }, { catalog: true }), /call `extensions_catalog` with a few words of the task.*never install, enable or configure an extension yourself; once the person declines one, don't suggest it again in this conversation/s);
  assert.doesNotMatch(identityPromptSection({ name: "miyagi" }), /extensions_catalog/);
  const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false, identity: { name: "captain" }, extensions: [awareness()] };
  const projectDir = temp();
  const without = await buildSessionOptions({ mode: "guided", projectDir }, temp(), spec);
  assert.doesNotMatch(String(without.options.systemPrompt), /extensions_catalog/);
  const withDirs = await buildSessionOptions({ mode: "plan", projectDir, extensionDirs: { agent: path.join(projectDir, "extensions") } }, temp(), spec);
  assert.match(String(withDirs.options.systemPrompt), /extensions_catalog/);
  // Read-only: plan mode lets it through.
  const hooks = withDirs.options.hooks!.PreToolUse!.flatMap((matcher) => matcher.hooks);
  for (const hook of hooks) {
    const output = (await hook({ hook_event_name: "PreToolUse", tool_name: "mcp__awareness__extensions_catalog", tool_input: {}, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal })) as {
      hookSpecificOutput?: { permissionDecision?: string };
    };
    assert.notEqual(output.hookSpecificOutput?.permissionDecision, "deny");
  }
});

test("the catalog tells what's installed and how it stands from what the catalogs offer, filtered by words and by the agent's topics", async () => {
  const root = makeMarketplace([
    ["weather", "1.0.0", ["planning", "captain"], "The weather in your city."],
    ["grades", "2.0.0", ["miyagi"], "Grading with rubrics."],
  ]);
  const dirs = { agent: path.join(temp(), "extensions") };
  await addMarketplace(root, dirs.agent);
  await addExtension(path.join(root, "weather"), dirs.agent);
  const [weather] = await listInstalled(dirs);
  const session = async () => ({ extensions: { active: [{ name: "weather" }], inactive: [] } }) as unknown as SessionFacts;

  const all = await call(createCatalogTool({ mode: "guided", projectDir: temp(), extensionDirs: dirs }, session));
  assert.match(all, /## Installed here\n\n- \*\*weather\*\* 1\.0\.0 \(agent scope\): running\. Can: Doing weather things\./);
  assert.match(all, /From their copies on this computer: harbor, copied today\./);
  assert.match(all, /- \*\*grades@harbor\*\* 2\.0\.0: Grading with rubrics\. Can: Doing grades things \(grades-things\)\..*Not installed: `\/extensions install grades@harbor`\./);
  assert.match(all, /- \*\*weather@harbor\*\* 1\.0\.0: The weather in your city\..*Installed\./);
  assert.ok(weather);

  // Words narrow it; the agent's topics keep it to what it offers (a captain never sees miyagi's).
  const rubrics = await call(createCatalogTool({ mode: "guided", projectDir: temp(), extensionDirs: dirs }, session), { words: "rubrics" });
  assert.match(rubrics, /grades@harbor/);
  assert.doesNotMatch(rubrics, /weather@harbor/);
  const captain = await call(createCatalogTool({ mode: "guided", projectDir: temp(), extensionDirs: dirs, catalogTopics: ["captain"] }, session));
  assert.match(captain, /weather@harbor/);
  assert.doesNotMatch(captain, /grades@harbor/);
  // No folder for extensions: it says it can't install any.
  assert.match(await call(createCatalogTool({ mode: "guided", projectDir: temp() }, noSession)), /no folder for extensions/);
});

test("refresh fetches a git catalog again and says what's new, once per session; without the source it answers from the copy", async () => {
  const source = makeMarketplace([["weather", "1.0.0", ["planning"], "The weather in your city."]]);
  git(source, "init", "-q", "-b", "main");
  git(source, "add", "-A");
  git(source, "commit", "-q", "-m", "weather");
  const url = pathToFileURL(source).href;
  const dirs = { agent: path.join(temp(), "extensions") };
  await addMarketplace(url, dirs.agent);
  await addExtension(path.join(source, "weather"), dirs.agent, { marketplace: "weather@harbor" });

  // Published since the copy: a new extension, and a newer weather.
  writePlugin(source, "notes", "0.1.0", ["writing"], "Your notes.");
  writePlugin(source, "weather", "1.1.0", ["planning"], "The weather in your city.");
  fs.writeFileSync(
    path.join(source, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "harbor", owner: { name: "Ada" }, plugins: [{ name: "weather", source: "./weather", version: "1.1.0", description: "The weather in your city." }, { name: "notes", source: "./notes", version: "0.1.0", description: "Your notes." }] }),
  );
  git(source, "add", "-A");
  git(source, "commit", "-q", "-m", "notes, weather 1.1.0");

  const tool = createCatalogTool({ mode: "guided", projectDir: temp(), extensionDirs: dirs }, noSession);
  assert.doesNotMatch(await call(tool), /notes@harbor/);
  const fresh = await call(tool, { refresh: true });
  assert.match(fresh, /## What's new online\n\n- New: \*\*notes@harbor\*\* 0\.1\.0: Your notes\.\n- A newer version of \*\*weather\*\*: 1\.1\.0\./);
  // What's installed is untouched.
  assert.equal((await listInstalled(dirs))[0]?.manifest?.version, "1.0.0");
  // A second refresh in the session doesn't fetch: nothing new since.
  assert.match(await call(tool, { refresh: true }), /## What's new online\n\n- A newer version of \*\*weather\*\*: 1\.1\.0\./);

  // In another session, with the source gone (no network), the copy answers.
  fs.rmSync(source, { recursive: true, force: true });
  const offline = await call(createCatalogTool({ mode: "guided", projectDir: temp(), extensionDirs: dirs }, noSession), { refresh: true });
  assert.match(offline, /Couldn't fetch harbor \(no network, or it's unavailable\): what's above is its copy on this computer\./);
  assert.match(offline, /notes@harbor/);
});

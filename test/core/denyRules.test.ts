import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { buildSessionOptions, denyRules } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "BASE PROMPT",
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
  replyInLanguage: false,
};

test("a denied path becomes the SDK's Read and Edit rules, for it and what's inside, in its // POSIX form", () => {
  const denied = path.resolve("/srv/agent/.env");
  const posix = denied.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`);
  assert.deepEqual(denyRules([denied]), [`Read(/${posix})`, `Read(/${posix}/**)`, `Edit(/${posix})`, `Edit(/${posix}/**)`]);
  if (process.platform === "win32") assert.deepEqual(denyRules(["C:\\Users\\ada\\.ssh"]).slice(0, 2), ["Read(//c/Users/ada/.ssh)", "Read(//c/Users/ada/.ssh/**)"]);
});

test("a session denies the agent's denied paths and the SDK's credentials through its own rules too", async () => {
  const projectDir = path.join(os.tmpdir(), "deny-rules-project");
  const secret = path.join(projectDir, "secrets");
  const { options } = await buildSessionOptions({ mode: "guided", projectDir, deniedPaths: [secret] }, os.tmpdir(), spec);
  const deny = (options.settings as { permissions?: { deny?: string[] } }).permissions?.deny ?? [];
  for (const rule of denyRules([secret])) assert.ok(deny.includes(rule), rule);
  assert.ok(deny.some((rule) => rule.startsWith("Read(") && rule.endsWith("/.credentials.json)")));
});

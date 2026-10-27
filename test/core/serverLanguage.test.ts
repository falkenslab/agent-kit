import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addExtension, loadExternalExtensions } from "../../src/core/externalExtensions.js";
import { setLanguage } from "../../src/core/messages/index.js";

// Extensions' servers get the session's language as their locale, the standard way, knowing nothing of the kit (#86).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "server-language-test-"));

test("an extension's server gets LANG and LC_MESSAGES in the session's language, through the launcher", async () => {
  const dir = path.join(temp(), "lab");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "lab", description: "A lab." }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { lab: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs"] } } }));
  fs.writeFileSync(path.join(dir, "server.mjs"), "process.stdout.write(JSON.stringify({ lang: process.env.LANG, messages: process.env.LC_MESSAGES }));");
  const scope = path.join(temp(), "extensions");
  await addExtension(dir, scope);
  setLanguage("es");
  try {
    const [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
    const server = (await extension!.contribute({} as never)).mcpServers!.lab as { command: string; args: string[]; env: Record<string, string> };
    assert.equal(server.env.LANG, "es_ES.UTF-8");
    assert.equal(server.env.LC_MESSAGES, "es_ES.UTF-8");
    // Started as the session starts it, through the launcher with its clean environment.
    const seen = JSON.parse(execFileSync(server.command, server.args, { env: { ...process.env, ...server.env }, encoding: "utf8" })) as { lang: string; messages: string };
    assert.deepEqual(seen, { lang: "es_ES.UTF-8", messages: "es_ES.UTF-8" });
  } finally {
    setLanguage("en");
  }
});

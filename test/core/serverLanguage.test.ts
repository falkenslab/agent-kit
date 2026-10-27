import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { addExtension, loadExternalExtensions } from "../../src/core/externalExtensions.js";
import { setLanguage } from "../../src/core/messages/index.js";

// Extensions' servers know the person's language (#86).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "server-language-test-"));

test("an extension's server gets AGENT_KIT_LANGUAGE and ${agent_kit.language}, and the launcher passes it on", async () => {
  const dir = path.join(temp(), "lab");
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "lab", description: "A lab." }));
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { lab: { command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/server.mjs", "--lang=${agent_kit.language}"] } } }));
  fs.writeFileSync(path.join(dir, "server.mjs"), "process.stdout.write(JSON.stringify({ env: process.env.AGENT_KIT_LANGUAGE, argv: process.argv.slice(2) }));");
  const scope = path.join(temp(), "extensions");
  await addExtension(dir, scope);
  setLanguage("es");
  try {
    const [extension] = (await loadExternalExtensions({ agent: scope })).extensions;
    const server = (await extension!.contribute({} as never)).mcpServers!.lab as { command: string; args: string[]; env: Record<string, string> };
    assert.equal(server.env.AGENT_KIT_LANGUAGE, "es");
    assert.ok(server.args.includes("--lang=es"), server.args.join(" "));
    // Started as the session starts it, through the launcher with its clean environment.
    const seen = JSON.parse(execFileSync(server.command, server.args, { env: { ...process.env, ...server.env }, encoding: "utf8" })) as { env: string; argv: string[] };
    assert.deepEqual(seen, { env: "es", argv: ["--lang=es"] });
  } finally {
    setLanguage("en");
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createLanguageReminder } from "../../src/core/hooks/languageReminder.js";
import { buildSessionOptions } from "../../src/core/session.js";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";

// The reply language said again next to what the model reads, so its narration doesn't drift to English (#85).

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "language-reminder-test-"));
const context = async (hook: (input: never, id: undefined, options: { signal: AbortSignal }) => Promise<unknown>, input: Record<string, unknown>) =>
  ((await hook(input as never, undefined, { signal: new AbortController().signal })) as { hookSpecificOutput?: { additionalContext?: string } }).hookSpecificOutput?.additionalContext;

test("after the main agent's tool calls and with the person's message, one line says the reply language; not for a subagent's call", async () => {
  const reminder = createLanguageReminder("es");
  assert.equal(await context(reminder.postToolUse, { hook_event_name: "PostToolUse", tool_name: "Read" }), "Reply language: Spanish, your narration between tool calls too.");
  assert.equal(await context(reminder.postToolUse, { hook_event_name: "PostToolUse", tool_name: "Read", agent_id: "a1" }), undefined);
  assert.equal(await context(reminder.userPromptSubmit, { hook_event_name: "UserPromptSubmit", prompt: "hola" }), "Reply language: Spanish, your narration between tool calls too.");
});

test("a session in another language than English has the reminder; English or prompt-only doesn't", async () => {
  const spec = (replyInLanguage?: AgentSpec<BaseSessionConfig>["replyInLanguage"]): AgentSpec<BaseSessionConfig> => ({
    buildSystemPrompt: () => "P",
    buildMcpServers: () => ({}),
    pluginRoots: () => [],
    buildSubagents: () => undefined,
    ...(replyInLanguage !== undefined ? { replyInLanguage } : {}),
  });
  const postHooks = async (language: string, replyInLanguage?: AgentSpec<BaseSessionConfig>["replyInLanguage"]) =>
    (await buildSessionOptions({ mode: "guided", projectDir: temp(), language }, temp(), spec(replyInLanguage))).options.hooks!.PostToolUse!.length;
  assert.equal(await postHooks("es"), 2);
  assert.equal(await postHooks("en"), 1);
  assert.equal(await postHooks("es", "prompt-only"), 1);
  assert.equal(await postHooks("es", false), 1);
  // prompt-only keeps the prompt's line.
  const built = await buildSessionOptions({ mode: "guided", projectDir: temp(), language: "es" }, temp(), spec("prompt-only"));
  assert.match(String(built.options.systemPrompt), /Language: use Spanish/);
});

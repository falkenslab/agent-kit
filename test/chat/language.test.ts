import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createChatController } from "../../src/chat/chatController.js";
import { chooseLanguage, getLanguage, setLanguage, t } from "../../src/core/messages/index.js";
import type { AgentEvent, AgentRun } from "../../src/core/runner.js";

// In a file of its own: a language switched to on purpose stays for the whole process.

const temp = () => mkdtempSync(path.join(tmpdir(), "chat-language-test-"));
const sent: string[] = [];
const idle = (prompt: AsyncIterable<SDKUserMessage>): AgentRun => ({
  events: (async function* (): AsyncGenerator<AgentEvent> {
    for await (const message of prompt) {
      sent.push(String(message.message.content));
      yield { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" };
    }
  })(),
  interrupt: async () => undefined,
  close: () => undefined,
  supportedCommands: async () => [{ name: "knowledge:query", description: "Answer from the knowledge base", argumentHint: "<question>" }],
  contextUsage: async () => null,
});

test("the language switches for a running chat: the session opened again in it, and kept over options and --language", async () => {
  setLanguage("en");
  const languages: string[] = [];
  const controller = await createChatController(
    async () => {
      languages.push(chooseLanguage("es")); // what buildSessionOptions() does with config.language
      return { options: {} as Options };
    },
    { runsDir: temp(), promptSuggestions: false, runQuery: idle },
  );
  assert.deepEqual(languages, ["es"]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  // The commands, with what each does: the session's and the chat's own, in the kit's language.
  const details = controller.getState().commandDetails;
  assert.deepEqual(details.find((command) => command.name === "knowledge:query"), { name: "knowledge:query", description: "Answer from the knowledge base", argumentHint: "<question>" });
  assert.equal(details.find((command) => command.name === "extensions")?.description, t().commandExtensions);

  await controller.setLanguage("fr");
  assert.equal(getLanguage(), "fr");
  assert.equal(controller.getState().language, "fr");
  assert.deepEqual(languages, ["es", "fr"]); // opened again, and "es" from the config no longer wins
  assert.equal(chooseLanguage("de"), "fr");
  // The model is told with the next message; the person's line stays as typed.
  await controller.send("who are you?");
  assert.match(sent.at(-1) ?? "", /^<system-reminder>The user switched the chat's language to French[\s\S]*\n\nwho are you\?$/);
  assert.equal(controller.getState().transcript.at(-2)?.kind, "user");
  await controller.send("and now?");
  assert.equal(sent.at(-1), "and now?");
  controller.close();
});

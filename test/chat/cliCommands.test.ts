import { test } from "node:test";
import assert from "node:assert/strict";
import type { Options, SDKUserMessage, SlashCommand } from "@anthropic-ai/claude-agent-sdk";
import { createChatController, type ChatSettings } from "../../src/chat/chatController.js";
import type { AgentRun } from "../../src/core/runner.js";

// The chat's / menu offers the agent's commands, not Claude Code's own (#87).

const supported: SlashCommand[] = [
  { name: "batch", description: "Claude Code's", argumentHint: "", builtin: true },
  { name: "compact", description: "Claude Code's", argumentHint: "", builtin: true },
  { name: "mcp", description: "Claude Code's", argumentHint: "", builtin: true },
  { name: "captain-whiskers:joke", description: "A classic joke", argumentHint: "" },
  { name: "mine", description: "The project's", argumentHint: "" },
];

/** The state's commands once the chat has listed them, with `settings`. */
async function commands(settings: Partial<ChatSettings> = {}): Promise<string[]> {
  const controller = await createChatController({} as Options, {
    promptSuggestions: false,
    ...settings,
    runQuery: (prompt: AsyncIterable<SDKUserMessage>): AgentRun => ({
      events: {
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            for await (const _ of prompt) void _;
            return { done: true as const, value: undefined };
          },
        }),
      },
      interrupt: async () => undefined,
      close: () => undefined,
      supportedCommands: async () => supported,
      contextUsage: async () => null,
    }),
  });
  await controller.start();
  for (let i = 0; i < 50 && !controller.getState().commands.length; i++) await new Promise((resolve) => setTimeout(resolve, 10));
  const names = controller.getState().commands;
  controller.close();
  return names;
}

test("the / menu leaves Claude Code's own commands out, and keeps the agent's, the project's and the kit's", async () => {
  const names = await commands();
  assert.ok(names.includes("captain-whiskers:joke") && names.includes("mine") && names.includes("extensions"), names.join(" "));
  for (const builtin of ["batch", "compact", "mcp"]) assert.ok(!names.includes(builtin), builtin);
});

test("an agent can offer them all, or the ones it names", async () => {
  assert.ok((await commands({ cliCommands: "all" })).includes("batch"));
  const named = await commands({ cliCommands: ["compact"] });
  assert.ok(named.includes("compact") && !named.includes("batch"), named.join(" "));
});

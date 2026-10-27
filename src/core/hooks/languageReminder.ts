import type { HookCallback } from "@anthropic-ai/claude-agent-sdk";
import { LANGUAGE_NAMES, type Language } from "../language.js";

/**
 * The reply language, said again next to what the model just read (#85): with only the system
 * prompt's line, far from the turn, its narration between tool calls drifted to English after an
 * English result (a source, a skill, the kit's own messages). One short line, about fifteen tokens.
 */
export function languageReminderLine(language: Language): string {
  return `Reply language: ${LANGUAGE_NAMES[language]}, your narration between tool calls too.`;
}

/**
 * Its hooks: after each of the main agent's tool calls (a subagent has its own prompt line, and
 * its narration isn't the person's), and with the person's message.
 */
export function createLanguageReminder(language: Language): { postToolUse: HookCallback; userPromptSubmit: HookCallback } {
  const line = languageReminderLine(language);
  return {
    postToolUse: async (input) => {
      if ((input as { agent_id?: string }).agent_id) return {};
      return { hookSpecificOutput: { hookEventName: "PostToolUse" as const, additionalContext: line } };
    },
    userPromptSubmit: async () => ({ hookSpecificOutput: { hookEventName: "UserPromptSubmit" as const, additionalContext: line } }),
  };
}

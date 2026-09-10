import { appendFile } from "node:fs/promises";
import type {
  HookCallback,
  PreToolUseHookInput,
  PostToolUseHookInput,
} from "@anthropic-ai/claude-agent-sdk";

export interface TranscriptLogger {
  preToolUse: HookCallback;
  postToolUse: HookCallback;
}

function redact(text: string, secrets: readonly string[]): string {
  let redacted = text;
  for (const secret of secrets) {
    if (secret) redacted = redacted.split(secret).join("***");
  }
  return redacted;
}

/**
 * Logs every tool call (request + result) as one JSON line, redacting `secrets` (e.g. a
 * domain-specific password — see `BaseSessionConfig.secrets`) plus
 * `CLAUDE_CODE_OAUTH_TOKEN`, which this kit always scrubs regardless of domain since it
 * owns the auth-token concept (see claudeAuth.ts).
 */
export function createTranscriptLogger(transcriptPath: string, secrets: readonly string[] = []): TranscriptLogger {
  const allSecrets = [...secrets, process.env.CLAUDE_CODE_OAUTH_TOKEN].filter((s): s is string => Boolean(s));

  const write = async (entry: Record<string, unknown>): Promise<void> => {
    const line = redact(JSON.stringify(entry), allSecrets);
    await appendFile(transcriptPath, `${line}\n`, "utf-8");
  };

  const preToolUse: HookCallback = async (input) => {
    const pre = input as PreToolUseHookInput;
    await write({
      ts: new Date().toISOString(),
      event: "pre_tool_use",
      tool: pre.tool_name,
      input: pre.tool_input,
    });
    return {};
  };

  const postToolUse: HookCallback = async (input) => {
    const post = input as PostToolUseHookInput;
    await write({
      ts: new Date().toISOString(),
      event: "post_tool_use",
      tool: post.tool_name,
      result: summarizeToolResponse(post.tool_response),
    });
    return {};
  };

  return { preToolUse, postToolUse };
}

/** Avoids bloating the transcript with large payloads (browser-tool screenshots/base64). */
export function summarizeToolResponse(response: unknown): unknown {
  const truncate = (text: string): string =>
    text.length > 2000 ? `${text.slice(0, 2000)}... [truncated]` : text;

  if (typeof response === "string") {
    return truncate(response);
  }

  if (Array.isArray(response)) {
    return response.map((block) => {
      if (block && typeof block === "object" && "type" in block) {
        const typed = block as { type: string; text?: string; data?: string };
        if (typed.type === "text" && typeof typed.text === "string") {
          return truncate(typed.text);
        }
        if (typeof typed.data === "string") {
          return `[${typed.type} omitted, ${typed.data.length} bytes base64]`;
        }
        return typed;
      }
      return block;
    });
  }

  return response;
}

import type { HookCallback, McpServerStatus } from "@anthropic-ai/claude-agent-sdk";

/**
 * What the model is told about signing in to an installed extension (#82): an extension whose
 * remote server waits for the person to sign in has no tools yet, nor the skill that would say
 * how, so the model fell back on Claude Code's `/mcp`, `claude mcp` or claude.ai's connectors,
 * none of which applies in an agent on the kit.
 */
export function signInInstruction(name: string): string {
  return `The ${name} extension needs the person to sign in before its tools are available: ask them to run \`/extensions sign-in ${name}\` (it opens their browser). Never suggest \`/mcp\`, \`claude mcp\` or claude.ai's connectors: they don't apply here.`;
}

/** The system prompt's rule, for a session with installed extensions behind a sign-in. */
export const SIGN_IN_RULE =
  "An installed extension whose remote server needs the person to sign in has no tools until they do: when one does, ask them to run `/extensions sign-in <extension>` (it opens their browser). Never suggest `/mcp`, `claude mcp` or claude.ai's connectors: they don't apply here.";

/**
 * A `UserPromptSubmit` hook (#82): with the person's message, tells the model which installed
 * extensions now wait for a sign-in (at the start, after `/extensions sign-out`), once each until
 * it's signed in again.
 */
export function createSignInReminder(options: {
  /** Each installed extension's remote servers, by session name. */
  extensions: () => readonly { name: string; remoteServers: readonly string[] }[];
  /** The running session's servers, as they are now. */
  status: () => (() => Promise<McpServerStatus[]>) | undefined;
}): HookCallback {
  const reminded = new Set<string>();
  return async (input) => {
    const read = options.status();
    if (!read) return {};
    const statuses = await within(read(), []);
    const waiting = new Set(statuses.filter((server) => server.status === "needs-auth").map((server) => server.name));
    const notes: string[] = [];
    for (const { name, remoteServers } of options.extensions()) {
      if (!remoteServers.some((server) => waiting.has(server))) {
        reminded.delete(name); // signed in (or off): a later sign-out reminds again
        continue;
      }
      if (reminded.has(name)) continue;
      reminded.add(name);
      notes.push(signInInstruction(name));
    }
    if (!notes.length) return {};
    return { hookSpecificOutput: { hookEventName: input.hook_event_name as "UserPromptSubmit", additionalContext: notes.join("\n") } };
  };
}

// A call to the session made from a hook: never let it hold the person's message up.
const TIMEOUT_MS = 3000;
const within = <T>(promise: Promise<T>, fallback: T): Promise<T> =>
  Promise.race([promise.catch(() => fallback), new Promise<T>((resolve) => setTimeout(() => resolve(fallback), TIMEOUT_MS).unref())]);

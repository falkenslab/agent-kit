import path from "node:path";
import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

/**
 * Where the built-in file tools may act. Without this, the only boundary is the SDK's own
 * working-directory scope — the whole project directory — so keeping the agent out of the
 * user's own files (a config file holding a password, the originals in sources/) would rest on the system
 * prompt alone.
 */
export interface FileScope {
  /** Base for relative paths: the session's cwd. */
  projectDir: string;
  /** Write/Edit are only allowed inside these. */
  writableDirs: string[];
  /** Readable and searchable but never writable; only affects the wording of the denial. */
  readOnlyDirs?: string[];
  /** Grep is only allowed inside these — it prints file contents, so it isn't let loose on the whole project. */
  searchableDirs: string[];
  /** Never readable, searchable or writable. */
  deniedPaths: string[];
}

/** Whether `candidate` is `base` itself or somewhere inside it (case-insensitive on Windows, like path.relative). */
export function isWithin(base: string, candidate: string): boolean {
  const relative = path.relative(base, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function describeDirs(scope: FileScope, dirs: string[]): string {
  return dirs.map((dir) => `${path.relative(scope.projectDir, dir) || "."}/`).join(", ");
}

/**
 * The reason to deny `toolName` with `input` under `scope`, or `undefined` to let it
 * through. Tools other than Read/Write/Edit/Grep are never judged here, and a call
 * without a path is left for the tool itself to reject.
 */
export function checkFileScope(scope: FileScope, toolName: string, input: Record<string, unknown>): string | undefined {
  const resolve = (value: unknown): string | undefined =>
    typeof value === "string" && value !== "" ? path.resolve(scope.projectDir, value) : undefined;
  const isDenied = (target: string) => scope.deniedPaths.some((denied) => isWithin(denied, target));

  switch (toolName) {
    case "Read": {
      const target = resolve(input.file_path);
      return target && isDenied(target) ? `"${input.file_path}" is off limits: it can't be read.` : undefined;
    }
    case "Write":
    case "Edit": {
      const target = resolve(input.file_path);
      if (!target) return undefined;
      if (!isDenied(target) && scope.writableDirs.some((dir) => isWithin(dir, target))) return undefined;
      if (!isDenied(target) && scope.readOnlyDirs?.some((dir) => isWithin(dir, target))) {
        return `"${input.file_path}" is read-only: originals are never modified — write your own notes inside ${describeDirs(scope, scope.writableDirs)} instead.`;
      }
      return `"${input.file_path}" can't be written: writing is only allowed inside ${describeDirs(scope, scope.writableDirs)}.`;
    }
    case "Grep": {
      const target = resolve(input.path) ?? scope.projectDir;
      const inside = scope.searchableDirs.some((dir) => isWithin(dir, target));
      // A folder that merely *contains* a denied file would still leak it through a match.
      const containsDenied = scope.deniedPaths.some((denied) => isWithin(target, denied));
      if (inside && !isDenied(target) && !containsDenied) return undefined;
      return `Grep only searches inside ${describeDirs(scope, scope.searchableDirs)} — pass one of them (or a folder inside) as "path".`;
    }
    default:
      return undefined;
  }
}

/**
 * PreToolUse hook enforcing `scope` on Read/Write/Edit/Grep, for the main agent and its
 * subagents alike. Bash, when a subagent has it, is not covered: it can reach any path,
 * which is why Bash-granting features stay opt-in.
 */
export function createFileScopeGate(scope: FileScope): HookCallback {
  return async (input) => {
    const pre = input as PreToolUseHookInput;
    const toolInput = pre.tool_input && typeof pre.tool_input === "object" ? (pre.tool_input as Record<string, unknown>) : {};
    const reason = checkFileScope(scope, pre.tool_name, toolInput);
    if (!reason) return {};

    return {
      hookSpecificOutput: {
        hookEventName: pre.hook_event_name,
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
  };
}

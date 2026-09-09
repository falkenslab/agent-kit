import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Builds a `loadPrompt(relativePath, vars)` bound to `rootDir` — the generalized version
 * of moodle-agent's own `agent/prompts.ts`, which always resolved against its own
 * installed package's `prompts/` folder. A different agent built on this kit supplies its
 * own prompts directory (its own domain content) and gets the same `{{key}}`
 * substitution/fail-loudly behavior for free.
 */
export function createPromptLoader(rootDir: string): (relativePath: string, vars?: Record<string, string>) => string {
  return (relativePath: string, vars: Record<string, string> = {}): string => {
    const raw = readFileSync(path.join(rootDir, relativePath), "utf-8");
    return raw
      .replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
        if (!(key in vars)) {
          throw new Error(`Prompt "${relativePath}": missing variable "${key}"`);
        }
        return vars[key];
      })
      .trimEnd();
  };
}

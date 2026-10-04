import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cached: string | undefined;

/**
 * The version of agent-kit in use, read from its own `package.json` (next to `dist/`, or
 * `src/` under tsx), e.g. to show it in an agent's header or log.
 */
export function agentKitVersion(): string {
  cached ??= (JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json"), "utf8")) as { version: string }).version;
  return cached;
}

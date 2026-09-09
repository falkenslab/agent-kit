import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Fields every agent built on this kit needs in its global (not per-project) config file. */
export interface BaseGlobalConfig {
  claudeCodeOAuthToken?: string;
  /** Agent SDK session autocompact when the context fills up. Enabled by default (same
   * as the Claude Code CLI) unless set to false here. */
  autoCompactEnabled?: boolean;
}

export interface GlobalConfigStore<TConfig extends BaseGlobalConfig> {
  /** Absolute path to `~/.<appName>/config.json`. */
  path(): string;
  read(): Promise<TConfig>;
  write(config: TConfig): Promise<void>;
  isAutoCompactEnabled(): Promise<boolean>;
}

/**
 * `~/.<appName>/config.json` — a single file unrelated to any one project, holding the
 * Claude OAuth token (see claudeAuth.ts) plus whatever else the host agent wants to
 * default globally (moodle-agent's own globalConfig.ts adds `defaultHeadless`/
 * `defaultLanguage` on top of `BaseGlobalConfig`, for instance).
 */
export function createGlobalConfigStore<TConfig extends BaseGlobalConfig>(appName: string): GlobalConfigStore<TConfig> {
  const configPath = (): string => path.join(os.homedir(), `.${appName}`, "config.json");

  const read = async (): Promise<TConfig> => {
    try {
      const raw = await readFile(configPath(), "utf-8");
      return JSON.parse(raw) as TConfig;
    } catch {
      return {} as TConfig;
    }
  };

  const write = async (config: TConfig): Promise<void> => {
    const p = configPath();
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, JSON.stringify(config, null, 2), "utf-8");
    // The token is as sensitive as a password. chmod is a silent no-op on Windows, no
    // harm if it "fails".
    await chmod(p, 0o600).catch(() => {});
  };

  return {
    path: configPath,
    read,
    write,
    isAutoCompactEnabled: async () => (await read()).autoCompactEnabled ?? true,
  };
}

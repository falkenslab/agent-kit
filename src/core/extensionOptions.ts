import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * An installed extension's options (#55): what its `plugin.json` declares under `userConfig`, as
 * Claude Code does, and the values the person gives them. Its servers take them as
 * `${user_config.KEY}` in their `args` and `env`; the launcher puts the values in when it starts a
 * server, read from disk then, so a value changed while a session runs reaches the server when
 * it starts again (the chat restarts it: `reconnectMcpServer()`). Non-sensitive values live in the
 * scope's lock; sensitive ones in a file of the scope's `.secrets/` folder, which the session's
 * file tools never reach: neither is ever in the prompt, the transcript or a tool's result.
 */

/** A value an option takes: by its type, a list when it's `multiple`. */
export type OptionValue = string | number | boolean | string[];

/** One of an extension's options, as Claude Code's `userConfig` declares it. */
export interface ExtensionOption {
  type: "string" | "number" | "boolean" | "directory" | "file";
  /** What it's called where the person is asked. */
  title: string;
  description: string;
  /** Without a value (its own or a default), the extension doesn't run. */
  required?: boolean;
  default?: OptionValue;
  /** A secret (a token, a password): asked without echo, kept apart, never shown back. */
  sensitive?: boolean;
  /** The values it may take, when it's a choice. */
  options?: (string | number)[];
  /** Several values (comma-separated where they're typed). */
  multiple?: boolean;
  /** A number's bounds. */
  min?: number;
  max?: number;
}

const TYPES = new Set(["string", "number", "boolean", "directory", "file"]);
const FIELDS = new Set(["type", "title", "description", "required", "default", "sensitive", "options", "multiple", "min", "max"]);

/**
 * A manifest's `userConfig`, checked as Claude Code checks it (an option with an unknown field
 * makes the plugin fail to load there): throws saying what's wrong.
 */
export function parseUserConfig(raw: unknown): Record<string, ExtensionOption> {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("its userConfig isn't an object");
  const options: Record<string, ExtensionOption> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`its userConfig option "${key}" isn't a valid name (letters, digits and _)`);
    if (!value || typeof value !== "object") throw new Error(`its userConfig option "${key}" isn't an object`);
    const option = value as Record<string, unknown>;
    const unknown = Object.keys(option).filter((field) => !FIELDS.has(field));
    if (unknown.length) throw new Error(`its userConfig option "${key}" has unknown fields (${unknown.join(", ")})`);
    if (typeof option.type !== "string" || !TYPES.has(option.type)) throw new Error(`its userConfig option "${key}" has no valid type (string, number, boolean, directory or file)`);
    if (typeof option.description !== "string") throw new Error(`its userConfig option "${key}" has no description`);
    options[key] = { ...(option as unknown as ExtensionOption), title: typeof option.title === "string" ? option.title : key };
  }
  return options;
}

/** A typed value for `option` from what the person typed; throws saying why it isn't one. */
export function parseOptionValue(option: ExtensionOption, typed: string): OptionValue {
  const one = (text: string): string | number | boolean => {
    const value = text.trim();
    if (option.type === "number") {
      const number = Number(value);
      if (!value || Number.isNaN(number)) throw new Error(`"${value}" isn't a number`);
      if (option.min !== undefined && number < option.min) throw new Error(`${number} is below ${option.min}`);
      if (option.max !== undefined && number > option.max) throw new Error(`${number} is above ${option.max}`);
      if (option.options && !option.options.includes(number)) throw new Error(`${number} isn't one of ${option.options.join(", ")}`);
      return number;
    }
    if (option.type === "boolean") {
      if (/^(true|yes|y|1|on)$/i.test(value)) return true;
      if (/^(false|no|n|0|off)$/i.test(value)) return false;
      throw new Error(`"${value}" isn't true or false`);
    }
    if (option.options && !option.options.map(String).includes(value)) throw new Error(`"${value}" isn't one of ${option.options.join(", ")}`);
    return option.type === "directory" || option.type === "file" ? path.resolve(value) : value;
  };
  if (option.multiple) return typed.split(",").filter((part) => part.trim()).map((part) => String(one(part)));
  return one(typed);
}

/** A value as it goes into a server's argument or variable: a list comma-separated. */
export function optionText(value: OptionValue | undefined): string {
  return value === undefined ? "" : Array.isArray(value) ? value.join(",") : String(value);
}

/** Where a scope keeps an extension's sensitive values: outside its plugin, its lock and its data. */
export function extensionSecretsPath(scopeDir: string, name: string): string {
  return path.join(scopeDir, ".secrets", `${name}.json`);
}

/** The folder of a scope's sensitive values, which the session's file tools never reach. */
export function secretsDir(scopeDir: string): string {
  return path.join(scopeDir, ".secrets");
}

async function readJson(file: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

/** The values an installed extension's options have now: what the person set (the lock's and the secrets'), else their defaults. */
export async function readOptionValues(scopeDir: string, name: string, declared: Record<string, ExtensionOption>, stored: Record<string, OptionValue> = {}): Promise<Record<string, OptionValue>> {
  const secrets = (await readJson(extensionSecretsPath(scopeDir, name))) as Record<string, OptionValue>;
  const values: Record<string, OptionValue> = {};
  for (const [key, option] of Object.entries(declared)) {
    const value = option.sensitive ? secrets[key] : stored[key];
    if (value !== undefined) values[key] = value;
    else if (option.default !== undefined) values[key] = option.default;
  }
  return values;
}

/** The required options without a value. */
export function missingOptions(declared: Record<string, ExtensionOption>, values: Record<string, OptionValue>): string[] {
  return Object.entries(declared)
    .filter(([key, option]) => option.required && (values[key] === undefined || values[key] === ""))
    .map(([key]) => key);
}

/**
 * Sets (or with `undefined`, clears) some of an extension's option values: the sensitive ones in
 * its secrets file, the others returned for its lock entry (the caller writes the lock).
 */
export async function storeOptionValues(
  scopeDir: string,
  name: string,
  declared: Record<string, ExtensionOption>,
  stored: Record<string, OptionValue>,
  changes: Record<string, OptionValue | undefined>,
): Promise<Record<string, OptionValue>> {
  const next = { ...stored };
  const file = extensionSecretsPath(scopeDir, name);
  const secrets = (await readJson(file)) as Record<string, OptionValue>;
  let secretsChanged = false;
  for (const [key, value] of Object.entries(changes)) {
    const option = declared[key];
    if (!option) throw new Error(`${name} has no option "${key}"`);
    const target = option.sensitive ? secrets : next;
    if (value === undefined) delete target[key];
    else target[key] = value;
    if (option.sensitive) secretsChanged = true;
  }
  if (secretsChanged) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(secrets, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await chmod(file, 0o600).catch(() => undefined);
  }
  return next;
}

/** Removes an extension's sensitive values. */
export async function removeSecrets(scopeDir: string, name: string): Promise<void> {
  await rm(extensionSecretsPath(scopeDir, name), { force: true });
}

/** The `${user_config.KEY}` a server's values name. */
export function optionsNamed(values: readonly string[]): string[] {
  return [...new Set(values.flatMap((value) => [...value.matchAll(/\$\{user_config\.([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((match) => match[1]!)))];
}

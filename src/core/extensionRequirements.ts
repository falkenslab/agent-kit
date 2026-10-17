import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";

/**
 * The programs an extension needs on the computer (#63): Docker for a lab, ffmpeg for videos.
 * The kit installs an extension's files and never a program (ADR-025): it checks them, says what's
 * missing, what for and how to install it on this system, and keeps off only what needs them.
 */

/** A program an extension needs on the computer, and how the person installs it. */
export interface ExtensionRequirement {
  /** What the person reads: "Docker". */
  name: string;
  /** The program, by its bare name, found on the `PATH` (`docker`; on Windows with `PATHEXT`'s extensions). */
  program: string;
  /** How to check its version: its arguments (options or `version` only) and the oldest it works with. */
  version?: { args: string[]; min: string };
  /** How to install it on each system: a command, or a link. */
  install: { windows?: string; macos?: string; linux?: string; url?: string };
  /** The capabilities that need it (its manifest's ids); without them, the whole extension does. */
  for: string[];
}

/** What checking a requirement found. */
export interface RequirementCheck {
  requirement: ExtensionRequirement;
  /** On the `PATH`. */
  found: boolean;
  /** The version it said, when it was asked and said one. */
  version?: string;
  /** There, and new enough (or its version couldn't be read). */
  ok: boolean;
}

/** A program's name: a bare one, never a path, so the check can only find it on the `PATH`. */
const PROGRAM = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
/** A version check's arguments: options and `version`, never what would do something (`docker run …`). */
const VERSION_ARG = /^(--?[A-Za-z][A-Za-z0-9-]*|version)$/;
const VERSION = /^\d+(\.\d+){0,2}$/;

/** A manifest's `requirements`: each as given, for `requirementsProblem()` to judge. */
export function parseRequirements(raw: unknown): ExtensionRequirement[] {
  if (!Array.isArray(raw)) return [];
  const text = (value: unknown): string | undefined => (typeof value === "string" && value ? value : undefined);
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { name, program, version, install, for: needed } = item as Record<string, unknown>;
    const programName = text(program);
    if (!programName) return [];
    const check = version && typeof version === "object" ? (version as Record<string, unknown>) : undefined;
    const how = install && typeof install === "object" ? (install as Record<string, unknown>) : {};
    return [
      {
        name: text(name) ?? programName,
        program: programName,
        ...(check ? { version: { args: Array.isArray(check.args) ? check.args.map(String) : [], min: String(check.min ?? "") } } : {}),
        install: Object.fromEntries((["windows", "macos", "linux", "url"] as const).flatMap((key) => (text(how[key]) ? [[key, text(how[key])]] : []))),
        for: Array.isArray(needed) ? needed.filter((id): id is string => typeof id === "string") : [],
      },
    ];
  });
}

/**
 * Why an extension's requirements can't be checked safely or don't hold together (a program given
 * as a path, a version argument that isn't an option, a capability it doesn't provide), or nothing.
 */
export function requirementsProblem(requirements: readonly ExtensionRequirement[], provides: readonly string[]): string | undefined {
  for (const requirement of requirements) {
    if (!PROGRAM.test(requirement.program)) return `needs the program "${requirement.program}", which isn't a bare name found on the PATH`;
    if (requirement.version) {
      const unsafe = requirement.version.args.find((arg) => !VERSION_ARG.test(arg));
      if (unsafe !== undefined) return `checks ${requirement.program}'s version with "${unsafe}": only options (--version, -v) or version`;
      if (!VERSION.test(requirement.version.min)) return `wants ${requirement.program} ${requirement.version.min || "(no version)"}, which isn't a version like 24.0.0`;
    }
    const unknown = requirement.for.find((id) => !provides.includes(id));
    if (unknown) return `needs ${requirement.program} for ${unknown}, a capability it doesn't provide`;
  }
  return undefined;
}

/** Where a program is on the `PATH`, as a shell would find it (with `PATHEXT`'s extensions on Windows), or nothing. */
export async function findOnPath(program: string, env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? ["", ...(env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").map((extension) => extension.toLowerCase())] : [""];
  for (const dir of dirs) {
    for (const extension of extensions) {
      const file = path.join(dir, `${program}${extension}`);
      if (await stat(file).then((entry) => entry.isFile(), () => false)) return file;
    }
  }
  return undefined;
}

/** Whether `version` is `min` or later, comparing x.y.z (missing parts are 0). */
export function atLeast(version: string, min: string): boolean {
  const parts = (value: string) => value.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parts(version), parts(min)];
  for (let index = 0; index < 3; index++) if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0);
  return true;
}

/**
 * Checks one requirement: finds its program on the `PATH` and, when it says how, runs it with its
 * version arguments only: no shell, nothing else on the command line, and stopped after
 * `timeoutMs`. A Windows script (`.cmd`, `.bat`) can't run without a shell, and a program that
 * says no version can't be compared: either counts as there.
 */
export async function checkRequirement(requirement: ExtensionRequirement, options: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}): Promise<RequirementCheck> {
  const file = PROGRAM.test(requirement.program) ? await findOnPath(requirement.program, options.env) : undefined;
  if (!file) return { requirement, found: false, ok: false };
  if (!requirement.version || /\.(cmd|bat)$/i.test(file)) return { requirement, found: true, ok: true };
  const said = await new Promise<string>((resolve) => {
    execFile(file, requirement.version!.args, { timeout: options.timeoutMs ?? 5000, windowsHide: true, shell: false, ...(options.env ? { env: options.env } : {}) }, (_error, stdout, stderr) => resolve(`${stdout ?? ""}\n${stderr ?? ""}`));
  });
  const version = said.match(/\d+\.\d+(?:\.\d+)?/)?.[0];
  return { requirement, found: true, ...(version ? { version } : {}), ok: !version || atLeast(version, requirement.version.min) };
}

/** Checks an extension's requirements, all at once. */
export function checkRequirements(requirements: readonly ExtensionRequirement[], options: { timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}): Promise<RequirementCheck[]> {
  return Promise.all(requirements.map((requirement) => checkRequirement(requirement, options)));
}

/** How to install a requirement on this system: its command, else its link. */
export function installHint(requirement: ExtensionRequirement, platform: NodeJS.Platform = process.platform): string | undefined {
  const system = platform === "win32" ? requirement.install.windows : platform === "darwin" ? requirement.install.macos : requirement.install.linux;
  return system ?? requirement.install.url;
}

/** What's missing, as a reason reads ("Docker (docker 24.0.0 or later), which isn't on this computer: install it with …"). */
export function describeMissing(check: RequirementCheck, platform: NodeJS.Platform = process.platform): string {
  const { requirement } = check;
  const wanted = `${requirement.name} (${requirement.program}${requirement.version ? ` ${requirement.version.min} or later` : ""})`;
  const state = check.found ? `, and this computer has ${check.version}` : ", which isn't on this computer";
  const hint = installHint(requirement, platform);
  const how = !hint ? "" : /^https?:\/\//.test(hint) ? `: see ${hint}` : `: install it with \`${hint}\``;
  return `${wanted}${state}${how}`;
}

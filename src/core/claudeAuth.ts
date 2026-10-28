import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { claudeBinaryRequests, unpackedClaudeExecutable } from "./packaged.js";

/*
 * Signing in to Claude without ever touching a credential (ADR-009, #90). Anthropic's terms
 * (https://code.claude.com/docs/en/legal-and-compliance, "Authentication and credential use")
 * say an Agent SDK developer may not collect, store or intermediate Claude.ai credentials or
 * session tokens: a Claude account signs in through Anthropic's own flow, in the unmodified
 * Claude Code binary. The SDK ships that binary, so the kit runs its `auth status` and
 * `auth login` and nothing else: the binary opens Anthropic's page and keeps the credentials
 * itself (`~/.claude/.credentials.json`, the Keychain on macOS), where the SDK's sessions find
 * them. The kit never reads, returns or stores a token. An API key (`ANTHROPIC_API_KEY`) is
 * allowed, and so is a person's own `CLAUDE_CODE_OAUTH_TOKEN`: both are their setting, not
 * something the kit collects.
 */

/**
 * The Claude Code binary the Agent SDK ships (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>`),
 * unmodified: the copy unpacked next to the archive when the agent runs packaged, or else the
 * one resolved from `node_modules` as the SDK resolves it. `undefined` when it isn't installed.
 * `resolve` and the platform are replaceable for tests.
 */
export function claudeExecutable(
  resolve: (request: string) => string = createRequire(import.meta.url).resolve,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string | undefined {
  const unpacked = unpackedClaudeExecutable(resolve, platform, arch);
  if (unpacked) return unpacked;
  for (const request of claudeBinaryRequests(platform, arch)) {
    try {
      const file = resolve(request);
      if (existsSync(file)) return file;
    } catch {
      // That package isn't installed: the next one.
    }
  }
  return undefined;
}

/** What `claudeSignedIn()` and `startClaudeSignIn()` accept. */
export interface ClaudeAuthOptions {
  /** The binary to run instead of the SDK's own (`claudeExecutable()`); a `.js`/`.mjs` file runs with Node, as the SDK runs one. */
  executable?: string;
}

/** The binary and its arguments as a process to spawn: a JavaScript file runs with this Node. */
export function claudeCommand(executable: string, args: string[]): { file: string; args: string[] } {
  return /\.(c|m)?js$/i.test(executable) ? { file: process.execPath, args: [executable, ...args] } : { file: executable, args };
}

/**
 * Whether the agent can reach Claude: true when the person's environment has `ANTHROPIC_API_KEY`
 * or `CLAUDE_CODE_OAUTH_TOKEN` (their own setting); otherwise what the Claude Code binary says
 * (`claude auth status --json`, its `loggedIn`). Never reads the credentials file, and prints
 * nothing: safe from a server or an Electron main process. False when there is no binary.
 */
export async function claudeSignedIn(options: ClaudeAuthOptions = {}): Promise<boolean> {
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN) return true;
  const executable = options.executable ?? claudeExecutable();
  if (!executable) return false;
  const command = claudeCommand(executable, ["auth", "status", "--json"]);
  // Exit code 1 when signed out, with the same JSON (confirmed empirically): read it either way.
  const output = await new Promise<string>((resolve) => {
    execFile(command.file, command.args, { timeout: 30_000, windowsHide: true }, (_error, stdout) => resolve(String(stdout ?? "")));
  });
  try {
    return (JSON.parse(output) as { loggedIn?: unknown }).loggedIn === true;
  } catch {
    return false;
  }
}

/** A sign-in in progress (`startClaudeSignIn()`): Claude Code's own `auth login`, which keeps the credentials itself. */
export interface ClaudeSignIn {
  /** Anthropic's sign-in page, to show as a link in case the browser didn't open; `undefined` if the binary ended without printing one. */
  url: Promise<string | undefined>;
  /** The code Anthropic's page shows after signing in, when it shows one: handed to the binary, which waits for it. */
  sendCode(code: string): void;
  /** Once the binary has ended: whether the person is signed in (`claudeSignedIn()`). */
  done: Promise<boolean>;
  /** Stops the sign-in; `done` then resolves with whether the person is signed in anyway. */
  cancel(): void;
}

/**
 * Signs the person in to their Claude account through Anthropic's own flow, for a host without a
 * terminal (a web page, a desktop app): runs `claude auth login` (`console: true` for an
 * Anthropic Console account, billed by API usage) with plain pipes. The binary opens the browser
 * itself; the host shows `url` as a link in case it didn't, and a box for the code Anthropic's
 * page shows (`sendCode`). The binary keeps the credentials: the kit never sees a token. Throws
 * when the binary isn't installed.
 *
 * Confirmed empirically (Claude Code 2.1.310): without a TTY, `auth login` prints "If the browser
 * didn't open, visit: <url>" (the URL may come wrapped in OSC 8 hyperlink escapes) and then waits
 * at "Paste code here if prompted >".
 */
export function startClaudeSignIn(options: ClaudeAuthOptions & { console?: boolean } = {}): ClaudeSignIn {
  const executable = options.executable ?? claudeExecutable();
  if (!executable) throw new Error("Claude Code's binary, which the Agent SDK ships (@anthropic-ai/claude-agent-sdk-<platform>-<arch>), isn't installed.");
  const command = claudeCommand(executable, ["auth", "login", ...(options.console ? ["--console"] : [])]);
  const child: ChildProcess = spawn(command.file, command.args, { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });

  let output = "";
  let resolveUrl!: (url: string | undefined) => void;
  const url = new Promise<string | undefined>((resolve) => (resolveUrl = resolve));
  const read = (chunk: Buffer): void => {
    output += chunk.toString("utf8");
    // Anthropic's page as soon as it's all there; any other URL only once the binary has ended.
    const found = signInUrl(output);
    if (found?.includes("/oauth/authorize")) resolveUrl(found);
  };
  child.stdout?.on("data", read);
  child.stderr?.on("data", read);
  // A write after the binary ended fails on the stream: nothing to tell then.
  child.stdin?.on("error", () => {});

  const ended = new Promise<void>((resolve) => {
    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });
  const done = ended.then(() => {
    resolveUrl(signInUrl(output, true));
    return claudeSignedIn(options);
  });

  return {
    url,
    sendCode(code) {
      if (child.stdin?.writable) child.stdin.write(`${code.trim()}\n`);
    },
    done,
    cancel() {
      if (child.exitCode === null && child.signalCode === null) child.kill();
    },
  };
}

// An OSC sequence (a hyperlink's `ESC ] 8 ; ; URL ESC \`, a title), ended by BEL or ST.
// eslint-disable-next-line no-control-regex -- ESC and BEL delimit terminal escapes, on purpose
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
// A CSI sequence (colors, cursor moves).
// eslint-disable-next-line no-control-regex -- ESC starts the sequence
const CSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
// eslint-disable-next-line no-control-regex -- an OSC 8 hyperlink's target, between ESC/BEL delimiters
const HYPERLINK_TARGET = /\x1b\]8;[^;\x07\x1b]*;(https:\/\/[^\x07\x1b]+)(?:\x07|\x1b\\)/g;

/**
 * The sign-in URL in what `claude auth login` printed so far: an OSC 8 hyperlink's target, or a
 * URL in the text with its escapes removed, Anthropic's authorize page (`/oauth/authorize`)
 * first. A URL in the text counts only once whitespace follows it (the rest may still be on its
 * way), unless `complete` says the output is all there is.
 */
export function signInUrl(output: string, complete = false): string | undefined {
  const targets = [...output.matchAll(HYPERLINK_TARGET)].map((match) => match[1]!);
  const text = output.replace(OSC, " ").replace(CSI, "");
  const inText = [...text.matchAll(complete ? /https:\/\/\S+/g : /https:\/\/\S+(?=\s)/g)].map((match) => match[0]);
  const urls = [...targets, ...inText];
  return urls.find((url) => url.includes("/oauth/authorize")) ?? urls[0];
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { claudeExecutable, claudeSignedIn, signInUrl, startClaudeSignIn } from "../../src/core/claudeAuth.js";

const temp = () => mkdtempSync(path.join(tmpdir(), "claude-auth-test-"));
const AUTHORIZE = "https://claude.com/cai/oauth/authorize?code=true&client_id=abc&state=xyz";

/**
 * A stand-in for Claude Code's binary: `auth status --json` prints the status kept in a file next
 * to it (exit 1 when signed out, as the real one); `auth login` prints what the real one prints
 * without a TTY (the URL in an OSC 8 hyperlink), records its arguments, and waits for a code on
 * stdin: "good" signs in, anything else fails.
 */
function fakeClaude(signedIn = false): { executable: string; state: string; args: string } {
  const dir = temp();
  const state = path.join(dir, "state.json");
  const args = path.join(dir, "args.json");
  writeFileSync(state, JSON.stringify({ loggedIn: signedIn, authMethod: signedIn ? "claude.ai" : "none", apiProvider: "firstParty" }));
  const executable = path.join(dir, "claude.mjs");
  writeFileSync(executable, `
import { readFileSync, writeFileSync } from "node:fs";
const [command, sub, ...rest] = process.argv.slice(2);
const state = ${JSON.stringify(state)};
if (command === "auth" && sub === "status") {
  const status = readFileSync(state, "utf8");
  process.stdout.write(status);
  process.exit(JSON.parse(status).loggedIn ? 0 : 1);
}
if (command === "auth" && sub === "login") {
  writeFileSync(${JSON.stringify(args)}, JSON.stringify(rest));
  const url = ${JSON.stringify(AUTHORIZE)};
  process.stdout.write("Opening browser to sign in…\\n");
  process.stdout.write("If the browser didn't open, visit: \\x1b]8;;" + url + "\\x1b\\\\" + url + "\\x1b]8;;\\x1b\\\\\\n");
  process.stdout.write("Paste code here if prompted > ");
  let input = "";
  process.stdin.on("data", (chunk) => {
    input += chunk;
    if (!input.includes("\\n")) return;
    const ok = input.trim() === "good";
    if (ok) writeFileSync(state, JSON.stringify({ loggedIn: true, authMethod: "claude.ai" }));
    process.stdout.write(ok ? "Login successful.\\n" : "Invalid code.\\n");
    process.exit(ok ? 0 : 1);
  });
}
`);
  return { executable, state, args };
}

/** Runs `body` with neither ANTHROPIC_API_KEY nor CLAUDE_CODE_OAUTH_TOKEN in the environment. */
async function withoutKeys(body: () => Promise<void>): Promise<void> {
  const saved = { api: process.env.ANTHROPIC_API_KEY, oauth: process.env.CLAUDE_CODE_OAUTH_TOKEN };
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  try {
    await body();
  } finally {
    if (saved.api !== undefined) process.env.ANTHROPIC_API_KEY = saved.api;
    if (saved.oauth !== undefined) process.env.CLAUDE_CODE_OAUTH_TOKEN = saved.oauth;
  }
}

test("the binary is the SDK's from node_modules, or the unpacked copy when packaged", () => {
  const root = temp();
  const installed = path.join(root, "node_modules", "@anthropic-ai", "claude-agent-sdk-linux-x64", "claude");
  mkdirSync(path.dirname(installed), { recursive: true });
  writeFileSync(installed, "");
  assert.equal(claudeExecutable(() => installed, "linux", "x64"), installed);

  // Packaged: the copy next to the archive, never the one inside it.
  const inside = path.join(root, "resources", "app.asar", "node_modules", "@anthropic-ai", "claude-agent-sdk-win32-x64", "claude.exe");
  const unpacked = inside.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
  mkdirSync(path.dirname(unpacked), { recursive: true });
  writeFileSync(unpacked, "");
  assert.equal(claudeExecutable(() => inside, "win32", "x64"), unpacked);

  // Resolved but missing on disk, or not installed at all: none.
  assert.equal(claudeExecutable(() => path.join(root, "nowhere", "claude"), "darwin", "arm64"), undefined);
  assert.equal(claudeExecutable(() => {
    throw new Error("not installed");
  }, "linux", "arm64"), undefined);

  // The other libc's package when the first isn't installed.
  const musl = path.join(root, "musl", "claude");
  mkdirSync(path.dirname(musl), { recursive: true });
  writeFileSync(musl, "");
  assert.equal(claudeExecutable((request) => {
    if (!request.includes("-musl/")) throw new Error("not installed");
    return musl;
  }, "linux", "x64"), musl);
});

test("signed in is what the binary's auth status says, unless the environment has a key", async () => {
  await withoutKeys(async () => {
    assert.equal(await claudeSignedIn({ executable: fakeClaude(false).executable }), false);
    assert.equal(await claudeSignedIn({ executable: fakeClaude(true).executable }), true);
    assert.equal(await claudeSignedIn({ executable: path.join(temp(), "missing.mjs") }), false);

    // The person's own setting, without asking the binary (a missing one here).
    process.env.ANTHROPIC_API_KEY = "sk-ant-api03-own";
    assert.equal(await claudeSignedIn({ executable: path.join(temp(), "missing.mjs") }), true);
    delete process.env.ANTHROPIC_API_KEY;
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat01-own";
    assert.equal(await claudeSignedIn({ executable: path.join(temp(), "missing.mjs") }), true);
  });
});

test("a sign-in gives the URL, passes the code, and ends signed in", async () => {
  await withoutKeys(async () => {
    const fake = fakeClaude(false);
    const signIn = startClaudeSignIn({ executable: fake.executable });
    assert.equal(await signIn.url, AUTHORIZE);
    signIn.sendCode("  good  ");
    assert.equal(await signIn.done, true);
    assert.deepEqual(JSON.parse(readFileSync(fake.args, "utf8")), []);
  });
});

test("a wrong code ends signed out, and --console reaches the binary", async () => {
  await withoutKeys(async () => {
    const fake = fakeClaude(false);
    const signIn = startClaudeSignIn({ executable: fake.executable, console: true });
    await signIn.url;
    signIn.sendCode("bad");
    assert.equal(await signIn.done, false);
    assert.deepEqual(JSON.parse(readFileSync(fake.args, "utf8")), ["--console"]);
  });
});

test("a cancelled sign-in ends, signed out", async () => {
  await withoutKeys(async () => {
    const signIn = startClaudeSignIn({ executable: fakeClaude(false).executable });
    await signIn.url;
    signIn.cancel();
    assert.equal(await signIn.done, false);
    signIn.sendCode("good"); // after the end: ignored, never thrown
  });
});

test("a binary that ends without a URL gives none", async () => {
  await withoutKeys(async () => {
    const dir = temp();
    const executable = path.join(dir, "claude.mjs");
    writeFileSync(executable, `process.stdout.write("Something went wrong\\n"); process.exit(1);`);
    const signIn = startClaudeSignIn({ executable });
    assert.equal(await signIn.url, undefined);
    assert.equal(await signIn.done, false);
  });
});

test("the sign-in URL is found through hyperlinks, colors and partial output", () => {
  const osc = (url: string, text: string) => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
  // A hyperlink whose text isn't the URL: its target.
  assert.equal(signInUrl(`If the browser didn't open, visit: ${osc(AUTHORIZE, "this link")}\n`), AUTHORIZE);
  // BEL-ended hyperlinks and colors around a plain URL.
  assert.equal(signInUrl(`visit: \x1b[36m${AUTHORIZE}\x1b[39m\n`), AUTHORIZE);
  assert.equal(signInUrl(`visit: \x1b]8;;${AUTHORIZE}\x07${AUTHORIZE}\x1b]8;;\x07\n`), AUTHORIZE);
  // Anthropic's authorize page over any other URL.
  assert.equal(signInUrl(`See https://docs.example.com/help first.\nvisit: ${AUTHORIZE}\n`), AUTHORIZE);
  // A URL still arriving isn't taken, unless the output is complete.
  assert.equal(signInUrl(`visit: ${AUTHORIZE.slice(0, 40)}`), undefined);
  assert.equal(signInUrl(`visit: ${AUTHORIZE}`, true), AUTHORIZE);
  assert.equal(signInUrl("Opening browser to sign in…\n"), undefined);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import wrapAnsi from "wrap-ansi";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createChatController, type ChatSettings } from "../../src/chat/chatController.js";
import { canOpenBrowser } from "../../src/core/openBrowser.js";
import { hyperlink, linkedNotice, supportsHyperlinks } from "../../src/tui/hyperlink.js";
import { setLanguage } from "../../src/core/messages/index.js";
import type { ExtensionAuth } from "../../src/core/liveExtensions.js";
import type { AgentRun } from "../../src/core/runner.js";

// Signing in to an extension from the chat opens the browser, with a link that survives wrapping (#72).

const URL_ = "https://www.canva.com/api/oauth/authorize?client_id=abc&code_challenge=xyz&state=s1&redirect_uri=http%3A%2F%2Flocalhost%3A1234%2Fcallback&scope=design%3Awrite";

/** A chat whose session has one extension to sign in to, opening links as `openBrowser` says. */
const chat = async (openBrowser: ChatSettings["openBrowser"]) => {
  const auth: ExtensionAuth = {
    needed: async () => ["canva"],
    signIn: async () => ({ status: "open", links: [{ server: "canva-api", url: URL_ }] }),
    connected: () => new Promise<boolean>(() => {}),
    signOut: async () => true,
  } as ExtensionAuth;
  const controller = await createChatController(async () => ({ options: {} as Options, extensionAuth: auth }), {
    runsDir: mkdtempSync(path.join(tmpdir(), "sign-in-browser-test-")),
    promptSuggestions: false,
    openBrowser,
    // No agent: nothing is sent to it here.
    runQuery: (prompt: AsyncIterable<SDKUserMessage>): AgentRun => ({
      events: {
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            for await (const _ of prompt) void _;
            return { done: true as const, value: undefined };
          },
        }),
      },
      interrupt: async () => undefined,
      close: () => undefined,
      supportedCommands: async () => [],
      contextUsage: async () => ({ percentage: 0 }) as never,
    }),
  });
  await controller.start();
  return controller;
};
const notices = (controller: Awaited<ReturnType<typeof chat>>) => controller.getState().transcript.flatMap((entry) => (entry.kind === "notice" ? [entry.text] : []));

test("the sign-in link opens in the browser and is shown alone on its line, for another computer", async () => {
  setLanguage("en");
  const opened: string[] = [];
  const controller = await chat(async (url) => (opened.push(url), true));
  await controller.signInExtension("canva");
  assert.deepEqual(opened, [URL_]);
  const shown = notices(controller);
  assert.ok(shown.includes("(signing in to canva in your browser; when you're done there, it's connected here. The link, for another browser:)"), shown.join("\n"));
  assert.ok(shown.includes(URL_), shown.join("\n"));
  controller.close();
});

test("when it isn't opened (turned off, or no browser here), the link is still there to open", async () => {
  setLanguage("en");
  for (const openBrowser of [false, async () => false] as const) {
    const controller = await chat(openBrowser);
    await controller.signInExtension("canva");
    const shown = notices(controller);
    assert.ok(shown.includes("(to sign in to canva, open this link; when you're done there, it's connected here:)"), shown.join("\n"));
    assert.ok(shown.includes(URL_));
    controller.close();
  }
});

test("no browser is opened over SSH or on Linux without a display", () => {
  assert.equal(canOpenBrowser({}, "win32"), true);
  assert.equal(canOpenBrowser({}, "darwin"), true);
  assert.equal(canOpenBrowser({ SSH_CONNECTION: "1.2.3.4 22 5.6.7.8 22" }, "win32"), false);
  assert.equal(canOpenBrowser({}, "linux"), false);
  assert.equal(canOpenBrowser({ DISPLAY: ":0" }, "linux"), true);
  assert.equal(canOpenBrowser({ WAYLAND_DISPLAY: "wayland-0", SSH_TTY: "/dev/pts/1" }, "linux"), false);
});

test("an address alone becomes a terminal link that stays whole on every row it wraps into", () => {
  assert.equal(supportsHyperlinks({ WT_SESSION: "x" }, true), true);
  assert.equal(supportsHyperlinks({ TERM_PROGRAM: "vscode" }, true), true);
  assert.equal(supportsHyperlinks({}, true), false);
  assert.equal(supportsHyperlinks({ WT_SESSION: "x" }, false), false);
  assert.equal(supportsHyperlinks({ FORCE_HYPERLINK: "1" }, false), true);
  assert.equal(supportsHyperlinks({ FORCE_HYPERLINK: "0", WT_SESSION: "x" }, true), false);
  // Only a notice that is an address alone; a sentence stays as it is.
  assert.equal(linkedNotice(URL_, true), hyperlink(URL_));
  assert.equal(linkedNotice("(open this link:)", true), "(open this link:)");
  assert.equal(linkedNotice(URL_, false), URL_);
  // Wrapped as the full-screen chat wraps it, every row opens the whole address.
  const rows = wrapAnsi(linkedNotice(URL_, true), 40, { hard: true, trim: false }).split("\n");
  assert.ok(rows.length > 3);
  for (const row of rows) assert.ok(row.startsWith(`\x1b]8;;${URL_}\x07`) && row.endsWith("\x1b]8;;\x07"), JSON.stringify(row));
});

import { test } from "node:test";
import assert from "node:assert/strict";
import type { McpServerStatus, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";
import { createReadOnlyHints } from "../../src/core/readOnlyHints.js";
import { createPlanGate } from "../../src/core/hooks/planGate.js";

// As the CLI reports them (confirmed empirically): `readOnly` only where the server says `readOnlyHint: true`.
const dice: McpServerStatus = {
  name: "dice",
  status: "connected",
  tools: [
    { name: "peek", annotations: { readOnly: true } },
    { name: "roll", annotations: {} },
    { name: "flip", annotations: { destructive: true } },
  ],
};

test("a tool is read-only when its own server marks it, and only for the servers asked about", async () => {
  let statuses: McpServerStatus[] = [dice, { ...dice, name: "other" }];
  const hinted = createReadOnlyHints(["dice"], () => async () => statuses);
  assert.equal(await hinted("mcp__dice__peek"), true);
  assert.equal(await hinted("mcp__dice__roll"), false);
  assert.equal(await hinted("mcp__dice__flip"), false);
  assert.equal(await hinted("mcp__dice__missing"), false);
  // A server whose manifest lists its tools isn't asked, whatever it says.
  assert.equal(await hinted("mcp__other__peek"), false);

  // Not connected (still pending, or turned off): no.
  statuses = [{ ...dice, status: "pending" }];
  assert.equal(await hinted("mcp__dice__peek"), false);
});

test("no running session, or one that fails to answer, is no", async () => {
  assert.equal(await createReadOnlyHints(["dice"], () => undefined)("mcp__dice__peek"), false);
  assert.equal(await createReadOnlyHints(["dice"], () => () => Promise.reject(new Error("closed")))("mcp__dice__peek"), false);
});

test("plan mode lets a hinted tool through and denies the rest", async () => {
  const gate = createPlanGate({ projectDir: "/p", isReadOnlyHinted: createReadOnlyHints(["dice"], () => async () => [dice]) }, () => true);
  const call = (tool_name: string) => gate({ hook_event_name: "PreToolUse", tool_name, tool_input: {} } as unknown as PreToolUseHookInput, undefined, { signal: new AbortController().signal });
  assert.deepEqual(await call("mcp__dice__peek"), {});
  const denied = (await call("mcp__dice__roll")) as { hookSpecificOutput?: { permissionDecision?: string } };
  assert.equal(denied.hookSpecificOutput?.permissionDecision, "deny");
});

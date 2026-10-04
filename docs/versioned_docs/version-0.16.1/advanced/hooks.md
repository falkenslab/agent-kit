---
sidebar_position: 4
title: Your own hooks
description: Add PreToolUse and PostToolUse hooks next to the kit's, to enforce your own rules or audit tool calls.
---

# Your own hooks

A hook is a function the CLI calls around every tool call. The kit's guardrails are hooks; yours can be too. Use one when a rule must hold whatever the model decides.

## Adding hooks next to the kit's

`buildSessionOptions()` returns plain options: add your hooks after the kit's, never instead of them.

```ts
import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

// Deny any WebFetch outside an allow list of domains.
const onlyTrustedSites: HookCallback = async (input) => {
  const pre = input as PreToolUseHookInput;
  if (pre.tool_name !== "WebFetch") return {};
  const url = new URL(String((pre.tool_input as { url?: string }).url));
  if (["docs.example.com", "wiki.example.com"].includes(url.hostname)) return {};
  return {
    hookSpecificOutput: {
      hookEventName: pre.hook_event_name,
      permissionDecision: "deny",
      permissionDecisionReason: `Only docs.example.com and wiki.example.com can be fetched, not ${url.hostname}.`,
    },
  };
};

const { options } = await buildSessionOptions(config, runDir, spec);
const session: Options = {
  ...options,
  hooks: {
    ...options.hooks,
    PreToolUse: [...(options.hooks?.PreToolUse ?? []), { hooks: [onlyTrustedSites] }],
  },
};
```

The hook types come from the SDK (`@anthropic-ai/claude-agent-sdk`); install it as a dev dependency for the types, or type the input yourself.

With a session opener, do it inside the opener:

```ts
await runChatInk(async (run) => {
  const built = await buildSessionOptions(config, run.dir, spec, { run });
  return { ...built, options: withMyHooks(built.options) };
}, { runsDir });
```

## What a `PreToolUse` hook can return

| Return | Effect |
| --- | --- |
| `{}` | No decision: the call goes on (to the next hook). |
| `permissionDecision: "deny"` with a reason | The call is denied; the model gets the reason and can try something else. Write the reason for the model: say what's allowed instead. |
| `permissionDecision: "allow"` | The call is approved. |
| `updatedInput: { … }` | The call runs with this input instead (the kit's foreground gate does this). |
| `continue: false` | The turn stops after this call (the step gate's Stop). |

Hooks run for subagents' calls too. `agent_id` in the input is set only for calls made inside a subagent.

## Auditing with `PostToolUse`

```ts
const audit: HookCallback = async (input) => {
  const post = input as PostToolUseHookInput;
  await appendFile(auditLog, `${new Date().toISOString()} ${post.tool_name}\n`);
  return {};
};

hooks: { ...options.hooks, PostToolUse: [...(options.hooks?.PostToolUse ?? []), { hooks: [audit] }] },
```

The kit already logs every call and result to `transcript.jsonl`, redacted; see [Transcript](../security/transcript.md).

## Reusing the kit's hooks

Every guardrail is exported as a hook factory: `createFileScopeGate()`, `createStepGate()`, `createSubagentTypeGate()`, `createSubagentBashGate()`, `createSubagentForegroundGate()`, `createPlanGate()`, `createTranscriptLogger()`. Use them to assemble a session without `buildSessionOptions()`, or in tests.

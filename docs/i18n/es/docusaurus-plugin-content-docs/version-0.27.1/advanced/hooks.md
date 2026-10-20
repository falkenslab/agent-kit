---
sidebar_position: 4
title: Tus propios hooks
description: Añade hooks PreToolUse y PostToolUse junto a los del kit, para imponer tus propias reglas o auditar las llamadas a herramientas.
---

# Tus propios hooks

Un hook es una función que la CLI llama alrededor de cada llamada a una herramienta. Las salvaguardas del kit son hooks; las tuyas también pueden serlo. Usa uno cuando una regla deba cumplirse decida lo que decida el modelo.

## Añadir hooks junto a los del kit {#adding-hooks-next-to-the-kits}

`buildSessionOptions()` devuelve opciones normales: añade tus hooks después de los del kit, nunca en su lugar.

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

Los tipos de los hooks vienen del SDK (`@anthropic-ai/claude-agent-sdk`); instálalo como dependencia de desarrollo para tener los tipos, o tipa tú mismo la entrada.

Con un abridor de sesión, hazlo dentro del abridor:

```ts
await runChatInk(async (run) => {
  const built = await buildSessionOptions(config, run.dir, spec, { run });
  return { ...built, options: withMyHooks(built.options) };
}, { runsDir });
```

## Qué puede devolver un hook `PreToolUse` {#what-a-pretooluse-hook-can-return}

| Devuelve | Efecto |
| --- | --- |
| `{}` | Ninguna decisión: la llamada sigue (al siguiente hook). |
| `permissionDecision: "deny"` con un motivo | La llamada se deniega; el modelo recibe el motivo y puede intentar otra cosa. Escribe el motivo para el modelo: di qué está permitido en su lugar. |
| `permissionDecision: "allow"` | La llamada se aprueba. |
| `updatedInput: { … }` | La llamada se ejecuta con esta entrada en su lugar (la puerta de primer plano del kit hace esto). |
| `continue: false` | El turno se detiene tras esta llamada (el Stop de la puerta de pasos). |

Los hooks también se ejecutan en las llamadas de los subagentes. `agent_id` en la entrada solo está presente en las llamadas hechas dentro de un subagente.

## Auditar con `PostToolUse` {#auditing-with-posttooluse}

```ts
const audit: HookCallback = async (input) => {
  const post = input as PostToolUseHookInput;
  await appendFile(auditLog, `${new Date().toISOString()} ${post.tool_name}\n`);
  return {};
};

hooks: { ...options.hooks, PostToolUse: [...(options.hooks?.PostToolUse ?? []), { hooks: [audit] }] },
```

El kit ya registra cada llamada y su resultado en `transcript.jsonl`, con los secretos ocultos; consulta [Transcripción](../security/transcript.md).

## Reutilizar los hooks del kit {#reusing-the-kits-hooks}

Cada salvaguarda se exporta como una factoría de hooks: `createFileScopeGate()`, `createStepGate()`, `createSubagentTypeGate()`, `createSubagentBashGate()`, `createSubagentForegroundGate()`, `createPlanGate()`, `createTranscriptLogger()`. Úsalas para montar una sesión sin `buildSessionOptions()`, o en tests.

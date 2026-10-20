---
sidebar_position: 6
title: Temas
description: El tema de colores por roles, sus valores por defecto y cómo un agente cambia algunos de ellos.
---

# Temas

Los colores de la interfaz de terminal salen de un único tema de **roles**: para qué sirve un color, no dónde se dibuja. Un agente cambia solo los roles que quiere; todo lo demás conserva los valores por defecto del kit.

```ts
await runChatInk(opener, {
  runsDir,
  theme: { toolResult: "yellow", selection: "#00ff00" },
});
```

## Roles {#roles}

| Rol | Se usa para | Por defecto |
| --- | --- | --- |
| `agent` | la etiqueta del agente (`ui.agent()`) | `cyanBright` |
| `user` | la etiqueta del prompt (`ui.user()`) | `white` |
| `userBar` | el fondo de las líneas de la persona en el chat Ink | `#373737` |
| `accent` | el borde de los paneles de aprobación y de intervención manual | `#d77757` |
| `working` | el spinner con lo que está haciendo el agente, y el modo en la barra de estado | `#89b4fa` |
| `code` | el código en línea y los bloques de código de las respuestas | `#b1b9f9` |
| `toolBullet` | el `●` antes de cada llamada a herramienta | `green` |
| `toolLabel` | la etiqueta de una llamada a herramienta | atenuado |
| `toolResult` | el resultado de una línea bajo una llamada a herramienta (los errores usan `error`) | atenuado |
| `selection` | la opción enfocada de las listas de elección (paneles de aprobación, `/resume`, el asistente), en negrita | `#d77757` |
| `border` | el marco alrededor del prompt y de la lista de `/resume` | `gray` |
| `dim` | texto secundario: avisos, resúmenes, pistas | atenuado |
| `heading` | títulos (puntos de control, el asistente) | negrita |
| `action` | las líneas `[action]` de la consola plana | `magenta` |
| `success`, `warn`, `error` | resultados, advertencias, errores | `green`, `yellow`, `red` |

## Valores {#values}

Cada rol admite uno de estos:

- **un nombre de color**: `"red"`, `"gray"`, `"cyanBright"`, `"magentaBright"`… (los nombres de picocolors y de Ink);
- **un hexadecimal**: `"#ff8800"` (color de 24 bits);
- **una función** `(text) => string`, para cualquier otra cosa: negrita, subrayado, un fondo, un degradado…

```ts
import pc from "picocolors";

theme: {
  agent: (text) => pc.bold(pc.cyan(text)),
  toolResult: "gray",
  error: (text) => pc.bgRed(pc.white(` ${text} `)),
},
```

Los roles que dibuja el propio Ink (`accent` para el borde de los paneles, `border`, `selection`) admiten solo un nombre o un hexadecimal: una función ahí recurre al color por defecto. `userBar` es un fondo: usa un nombre o un hexadecimal.

## Dónde configurarlo {#where-to-set-it}

- La opción `theme` de `runChatInk()`, `runChatTui()`, `createProgressView()` y `runWizard()`.
- `setTheme(overrides)` una vez, para un host que lo configura antes que nada.

Hay un tema por proceso. Cada llamada a `setTheme()` (o a un punto de entrada con `theme`) vuelve a partir de los valores por defecto con sus cambios; un punto de entrada sin `theme` conserva el actual. `getTheme()` lo devuelve y `DEFAULT_THEME` es el del kit.

```ts
import { DEFAULT_THEME, getTheme, setTheme } from "@falkenslab/agent-kit";

setTheme({ accent: "#e5b53a", selection: "#e5b53a" });
getTheme().agent === DEFAULT_THEME.agent; // true
```

## Tus propios textos siguen el tema {#your-own-texts-follow-the-theme}

Las funciones de la paleta `ui` dibujan su rol en el tema actual, así que los textos que un agente dibuja con ellas cambian con él:

```ts
import { ui } from "@falkenslab/agent-kit";

promptLabel: `${ui.user("you>")} `,
agentLabel: ui.agent("Scout>"),
welcomeMessage: ui.dim("Ask me anything. /exit to leave."),
```

| Función | Rol |
| --- | --- |
| `ui.agent`, `ui.user`, `ui.action`, `ui.heading`, `ui.success`, `ui.warn`, `ui.error`, `ui.dim` | el rol del mismo nombre |
| `ui.accent`, `ui.working`, `ui.code`, `ui.toolBullet`, `ui.toolLabel`, `ui.toolResult` | el rol del mismo nombre |
| `ui.userBar` | `userBar`, como fondo |
| `ui.bold`, `ui.italic`, `ui.strike` | estilos, sin tema |

## Sin color {#without-color}

Cuando la terminal no admite color (o está definida `NO_COLOR`), los nombres y los hexadecimales dibujan texto plano; las funciones se siguen llamando, así que una función debería usar una librería de colores que lo respete (picocolors lo hace). Los anchos se miden siempre sin códigos de escape, así que un tema nunca cambia la maquetación, y el log de la sesión es siempre texto plano.

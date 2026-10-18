---
sidebar_position: 7
title: Desarrollo y pruebas
description: "Probar una extensión mientras la construyes: enlazarla a un agente, verla funcionar, por qué está apagada cuando lo está, validarla, versionarla y mantenerla funcionando también en Claude Code."
---

# Desarrollo y pruebas

## Enlazarla {#linking-it}

Mientras construyes una extensión, enlázala a un agente en lugar de instalarla:

```bash
my-agent extension add ./weather --link --set city=Madrid
```

El agente la ejecuta desde esa carpeta: sus ficheros no se copian ni se comprueban contra un hash, y `extension list` la muestra como enlazada. Vuelve a construirla (`npm run build`) y el cambio surte efecto cuando su servidor vuelve a arrancar: una sesión nueva, o `/extensions disable weather` y `/extensions enable weather` en el chat, que vuelve a activar una extensión enlazada con sus ficheros nuevos. `extension remove weather` solo la olvida; la carpeta se queda.

Captain Whiskers es un agente listo para probar una: desde una copia de agent-kit, `npm run build` en su raíz, luego en `examples/captain-whiskers` `npm start -- extension add <folder> --link`, y `npm start` (o `npm start -- --web`).

## Verla funcionar {#seeing-it-work}

| Comprobación | Cómo |
| --- | --- |
| 📋 Está instalada, con sus ajustes | `my-agent extension info weather`: sus servidores, sus herramientas de solo lectura (`what its servers mark readOnlyHint`), sus opciones; `extension config weather` para sus valores. |
| ✅ Se está ejecutando | `/extensions` en el chat la lista entre aquello con lo que se ejecuta la sesión, o dice por qué está apagada. |
| 🧰 Sus skills y comandos | Al escribir `/` en el chat aparece `/weather:today`; el `about_me` del agente lista sus skills. |
| 🔧 Su herramienta | Pregúntale al agente ("what's the weather today?"): el chat muestra su etiqueta, `Checking the weather in Madrid`. |
| 🔒 Modo plan | Cambia al modo plan (`/plan`): `forecast` sigue ejecutándose, y una herramienta que escribe se deniega. |
| 🧪 Su servidor por separado | Ejecuta `dist/server.mjs` con sus variables y envíale MCP por stdin, o usa el [MCP Inspector](https://github.com/modelcontextprotocol/inspector) (`npx @modelcontextprotocol/inspector node dist/server.mjs`). |

## Cuando está apagada {#when-its-off}

El `/extensions` del chat, el prompt y `extension list` dicen por qué no se ejecuta una extensión. Los motivos habituales mientras desarrollas:

- **`needs city (Your city) set`**: una opción obligatoria sin valor: `extension config weather city=…`.
- **`runs its server "weather" with "python"`**: solo se ejecutan servidores de Node o npx ([Sus servidores](writing.md#its-servers)).
- **`has no script at dist/server.mjs`**: constrúyela antes.
- **`names ${user_config.x}, which its userConfig doesn't declare`**: una errata entre `.mcp.json` y `userConfig`.
- **`has files that changed since it was installed`**: se ha editado una copia instalada (no enlazada); vuelve a instalarla.
- **`works with agent-kit >=0.23.0`**: su rango `kit` excluye el kit de este agente.

Todos los motivos están en la [referencia](reference.md#why-an-extension-is-off).

## Validar {#validating}

```bash
claude plugin validate --strict .
```

Claude Code 2.1.271 o posterior (los valores fijos en `userConfig`, `options`, lo necesitan). `--strict` falla ante cualquier aviso, así que un campo en el sitio equivocado (los datos de agent-kit fuera de `metadata`) o una versión que no coincide con su entrada del marketplace también fallan. Para los datos propios de agent-kit, `schemas/agent-kit-metadata.schema.json` en `@falkenslab/agent-kit` comprueba `metadata["agent-kit"]`: apunta a él el ajuste de JSON schema de tu editor, y [agent-kit-catalog](publishing.md#the-catalog-file) lo comprueba al construir el catálogo.

## Versionar {#versioning}

- **`version` en `plugin.json`** es la versión de la extensión: Claude Code y agent-kit la muestran, la comparan para ofrecer actualizaciones, y Claude Code cachea por ella. Súbela con cada cambio que publiques, y mantén igual el `version` de su entrada del marketplace.
- **`kit`** en `metadata["agent-kit"]` dice con qué versiones de agent-kit funciona (`">=0.22.0"`). No pongas un límite superior salvo que se sepa que una versión la rompe: uno apaga la extensión con la siguiente versión menor del kit hasta que se suba.
- **Un servidor de npm** se fija en `.mcp.json` (`@falkenslab/moodle-mcp@0.3.0`); subirlo es una versión nueva de la extensión, junto con cualquier skill que dependa de él.

## Finales de línea {#line-endings}

El kit comprueba los ficheros de una extensión instalada con un hash que ignora los finales de línea de los ficheros de texto, así que un repositorio descargado con CRLF en Windows y con LF en otros sistemas se instala igual. Aun así, mantén los ficheros de un marketplace en LF (un `.gitattributes` con `* text=auto eol=lf`): Claude Code y otras herramientas los comparan tal cual.

## Que también funcione en Claude Code {#working-in-claude-code-too}

La misma carpeta es un plugin de Claude Code: `claude plugin marketplace add <marketplace>` y `claude plugin install weather@<marketplace>`, y Claude Code pide su `userConfig` por su cuenta. Lo que es solo de agent-kit (`metadata["agent-kit"]`: etiquetas, ayuda, el aspecto en el catálogo, capacidades, listas de solo lectura) se ignora ahí; las `instructions` de su servidor, sus skills y comandos funcionan igual. Claude Code también ejecuta los hooks de un plugin, cosa que el kit nunca hace: las reglas que deben cumplirse siempre van en el servidor.

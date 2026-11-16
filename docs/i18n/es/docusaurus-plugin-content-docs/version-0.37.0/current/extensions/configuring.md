---
sidebar_position: 4
title: Configuración
description: "Los ajustes de una extensión instalada: declarados por su autor como el userConfig de Claude Code, preguntados al instalarla, cambiados con extension config, /extensions config o un formulario de ajustes, guardados aparte cuando son secretos y aplicados a una sesión en marcha."
---

# Configurar una extensión

Una extensión que necesita valores de la persona (su ciudad, la dirección de un sitio, un token) los declara como **opciones**, y la persona los da una sola vez. Cómo los declara un autor está en [Escribir una](writing.md#3-its-settings); esta página cuenta qué pasa con ellos.

## Las dos partes {#the-two-sides}

- **El autor los declara** en el `plugin.json` de la extensión, en `userConfig`, exactamente como lo hace Claude Code, y sus servidores los reciben como `${user_config.KEY}` en sus `args` y `env`. La misma carpeta funciona en Claude Code, que los pide por su cuenta y los guarda en sus propios ajustes.
- **La persona da los valores**, a través del agente:

| Dónde | Cómo |
| --- | --- |
| 📦 Al instalarla | `my-agent extension add weather@ada` pregunta cada opción sin valor, en un terminal (un secreto, sin eco). `--set city=Madrid` da una sin preguntar (un script). |
| ⌨️ Después, desde un shell | `my-agent extension config weather` las muestra; `extension config weather units=imperial` establece una; `extension config weather token` la pregunta, sin eco cuando es un secreto; `--unset <key>` borra una. |
| 💬 En el chat | `/extensions config weather` las muestra; `/extensions config weather units=imperial` las establece y reinicia los servidores de la extensión en la misma conversación. Nunca un secreto: lo que se escribe en un chat se guarda en su historial. |
| 🖥️ En un agente de escritorio o web | Un formulario de ajustes hecho a partir de sus opciones, cada una según su tipo (texto, número, una elección, una casilla), un secreto como un campo de contraseña que nunca se vuelve a rellenar. El panel lateral de Captain Whiskers lo tiene; un host propio lo construye a partir del `extensionOptions(name)` del controlador del chat y guarda con `setExtensionOptions(name, values)`, secretos incluidos. |

```console
$ my-agent extension config weather
  city = Santa Cruz de Tenerife  (Your city, required)
  units = metric (default)  (Units)
```

## Qué hacen los valores {#what-the-values-do}

- **Una opción obligatoria sin valor** (ni valor por defecto) mantiene la extensión apagada, diciendo cuál y cómo establecerla: `needs city (Your city) set: extension config weather city=<value>`.
- **Los valores se comprueban según su tipo**: un número entre su `min` y su `max`, uno de sus `options` cuando los tiene, `true`/`false` (o `yes`/`no`) para un booleano, varios separados por comas para uno `multiple`, una ruta absoluta para un `directory` o un `file`.
- **Los valores llegan al servidor como texto**: un booleano como `true` o `false`, una lista separada por comas, uno sin valor como vacío.
- **Reinstalar o actualizar los conserva**; eliminar la extensión borra sus secretos.

## Dónde se guardan {#where-theyre-kept}

Nunca en el prompt, la transcripción ni el resultado de una herramienta:

- **Los valores no sensibles**, en la entrada del lock del ámbito (`options`). En un [workspace](workspaces.md), ese es el lock del proyecto, así que quienes comparten el proyecto también los comparten (los sitios de Moodle de un equipo, por ejemplo).
- **Los secretos** (`sensitive: true`), en la carpeta privada del ámbito, `.secrets/<name>.json`: la del propio ámbito del agente o, para una extensión de un workspace, en la carpeta del agente, nunca en el proyecto. Las herramientas de ficheros de ninguna sesión llegan a ella, aunque la carpeta del ámbito se pueda leer.

## Cambiarlos mientras se ejecuta una sesión {#changing-them-while-a-session-runs}

El lanzador del kit lee los valores cuando arranca un servidor, así que un cambio llega al servidor cuando vuelve a arrancar:

- **Desde el chat** (`/extensions config`, o un formulario de ajustes), los servidores de la extensión se reinician en la misma sesión (`reconnectMcpServer()`: un proceso nuevo con los valores tal como están ahora), y al modelo se le avisa con el siguiente mensaje. Una llamada en curso en ese momento falla.
- **Desde otro terminal** (`extension config`), el cambio se aplica cuando su servidor vuelve a arrancar: una sesión nueva, o `/extensions disable` y `enable` en el chat.
- Una sesión que el agente construye por su cuenta recibe `restartExtension(name)` de `buildSessionOptions()`, que devuelve `false` cuando no se puede hacer en esa sesión.
- **Las opciones de un [servidor remoto](writing.md#a-remote-server)** van en su URL y sus cabeceras al abrir la sesión, y reiniciarlo no las cambiaría: cambiar una vuelve a abrir la sesión, conservando la conversación (`restartExtension()` devuelve `false` para él).

## Las respuestas del modo guiado {#guided-modes-answers}

En modo guiado el kit pregunta a la persona antes de una herramienta de una extensión instalada que cambia cosas, y algunas respuestas duran: "Sí, siempre" y "No, nunca" ([Las herramientas de las extensiones que cambian cosas](../human-in-the-loop/approvals.md#extensions-tools-that-change-things)). Se guardan junto a sus opciones, en su entrada del lock de su ámbito (`confirm`), y sobreviven a las actualizaciones. Las cambia la persona, nunca el modelo:

```
/extensions config canva                 # sus opciones, y lo que el modo guiado guarda de ella
/extensions config canva confirm=reset   # olvidar "siempre" y "nunca": sus herramientas vuelven a preguntar
/extensions config canva confirm=off     # sus herramientas funcionan sin preguntar (una extensión de confianza)
/extensions config canva confirm=on      # volver a preguntar
```

Lo mismo con `extension config` desde el terminal. La puerta las lee en cada llamada, así que un cambio se aplica al momento, sin reiniciar nada; una herramienta a la que se dijo "nunca" sigue fuera de la sesión en curso hasta la siguiente.

## Lo que no es configuración {#what-isnt-configuration}

Lo que el servidor aprende o crea mientras trabaja (una sesión iniciada en un navegador, una caché, sitios añadidos pidiéndoselo) no es una opción: el servidor lo guarda en su [carpeta de datos](writing.md#its-data), que sobrevive a reinicios, reinstalaciones y actualizaciones. Y las variables propias del agente (`${VAR}` en el `env` de un servidor, del entorno del agente) solo llegan a un servidor cuando su `.mcp.json` las nombra.

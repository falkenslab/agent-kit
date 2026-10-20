---
sidebar_position: 5
title: Workspaces
description: "Las extensiones de un proyecto: el lock que viaja con el proyecto, el código guardado por contenido en el almacén del agente, los datos y secretos fuera del proyecto, restaurarlas en otro ordenador y confiar en ellas antes de que se ejecuten."
---

# Workspaces

El ámbito de un proyecto viaja con el proyecto: un repositorio que otros clonan, una carpeta que alguien envía. Por eso guarda solo lo que es del workspace, y el resto se queda en cada ordenador, en la carpeta del agente. (Un agente sin ámbito propio guarda el código y los datos de un proyecto en el proyecto, como lo hace el ámbito del agente.)

## Qué va dónde {#what-goes-where}

| Qué | Dónde | Viaja con el proyecto |
| --- | --- | --- |
| 🔒 El lock: qué extensiones, de dónde, en qué versión (hash de los ficheros, commit, paquetes de npx), y las opciones que no son secretos | `<project>/extensions/extensions.lock.json` | Sí: haz commit de él |
| 📦 El código, por contenido: dos workspaces con la misma versión comparten una copia | `<agent scope>/.store/<name>/<hash>/` | No |
| 🗄️ Los datos de cada extensión | `<agent scope>/.projects/<project>-<hash>/.data/<name>/` | No |
| 🔑 Sus secretos | `<agent scope>/.projects/<project>-<hash>/.secrets/<name>.json` | No |
| ✅ En qué confía la persona | `<agent scope>/.trust.json` | No |

## Restaurar {#restoring}

En otro ordenador, o con otro agente, las extensiones de un workspace están apagadas, diciendo que su código aún no está ahí. `extension restore` obtiene cada una de donde dice su lock:

- **de su marketplace**, si el agente lo conoce (el oficial, siempre);
- **de su repositorio git**, en el commit que registró el lock;
- **de su carpeta**, si está en este ordenador;

y la comprueba contra el hash del lock; luego descarga los paquetes de npx que fija. Lo que no se puede obtener dice por qué: un marketplace que el agente no conoce (añádelo antes con `extension marketplace add`), otra versión allí ahora (`extension update` la toma, y el lock cambia), una carpeta que no está en este ordenador.

El hash no tiene en cuenta los finales de línea de los ficheros de texto, así que un repositorio descargado con CRLF en Windows y con LF en Linux coincide. Un fichero binario (uno con un byte NUL) cuenta tal cual.

## Confiar {#trusting}

Una extensión que viene con un workspace ejecuta código en este ordenador, así que solo se ejecuta cuando la persona confía en ella en ese workspace:

- **Los chats preguntan** cuando la sesión se abre con extensiones en las que no se confía (no, por defecto), nombrando cada una y de dónde viene; si se confía en ellas, la sesión se vuelve a abrir con ellas, conservando la conversación. Si se rechazan, siguen apagadas, y `/extensions trust` confía en ellas más tarde.
- **Desde un shell**: `extension trust [name…]`, o `extension restore --trust` para obtenerlas y confiar en ellas a la vez.
- **En lo que se confía es en el código de cada extensión**, los hashes de sus ficheros y de sus paquetes de npx, guardados en la carpeta del agente, fuera del proyecto, de modo que un proyecto no puede confiar en sí mismo. Otra versión (el lock cambió, alguien la actualizó) vuelve a preguntar; activar o desactivar una, o cambiar sus opciones, no.
- **Lo que la persona instala o actualiza** ella misma en el ámbito del proyecto se considera de confianza en el momento en que lo hace.
- **El ámbito propio del agente nunca pregunta**: es de la persona.

Una sesión que el agente construye por su cuenta lee las extensiones en las que no se confía de `extensions.untrusted` de `buildSessionOptions()`; `trustWorkspace(dirs)` y `restoreExtensions(dirs)` hacen el resto.

## Un flujo típico {#a-typical-flow}

```console
# Ada sets the workspace up and commits extensions/extensions.lock.json
$ my-agent extension add weather@ada --project --set city=Madrid

# Bob clones it: weather is off ("isn't on this computer yet")
$ my-agent extension restore --trust
Restored weather.
Trusted weather in this workspace.
```

El weather de Bob tiene la ciudad de Ada (una opción compartida) y sus propios datos; un secreto que necesite, lo establece él en su ordenador (`extension config`).

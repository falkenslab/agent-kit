---
sidebar_position: 4
title: Servir un agente por MCP
description: Ejecuta un agente como servidor MCP, para que Claude Code u otro agente le pregunten, con su propio prompt, sus extensiones y sus salvaguardas.
---

# Servir un agente por MCP

Un agente hecho con el kit puede ejecutarse como servidor MCP por stdio. Otro agente (Claude Code, Claude Desktop, otro hecho con el kit) lo maneja entonces entero: le pregunta y recibe una respuesta, mientras el prompt, las extensiones y las salvaguardas siguen en el proceso del agente servido.

```ts
import { serveMcp } from "@falkenslab/agent-kit/mcp";

const config: BaseSessionConfig = { mode: "autonomous", projectDir: process.cwd() };

await serveMcp((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  identity: { name: "my-agent", version: "1.0.0", description: "an assistant that reads invoices" },
});
```

Viene de su propia subruta, no de la raíz del paquete: un agente que no se sirve a sí mismo nunca lo carga. La promesa se resuelve cuando el cliente se desconecta.

Se añade a Claude Code como cualquier servidor stdio:

```bash
claude mcp add my-agent -- node /path/to/agent.js
```

## La herramienta `ask`

El servidor tiene una sola herramienta. Expone al agente, no sus herramientas, para que quien llama no las obtenga sin su criterio ni sus controles.

| Entrada | Qué es |
| --- | --- |
| `message` | Lo que se le pregunta, en palabras normales. |
| `session_id` | Opcional. El `session_id` de una respuesta anterior, para seguir esa conversación. Sin él, empieza una nueva. |

El resultado tiene dos bloques de texto: la respuesta del agente y una línea `session_id: <id>`. Un `session_id` es el nombre de una carpeta dentro de `runsDir`, así que una conversación sobrevive al servidor: un cliente puede retomarla tras un reinicio. Un id que no sea una ejecución de este agente es un error.

Un `message` llega siempre al agente tal cual. Nunca se lee como uno de los comandos del chat, así que quien llama no puede instalar una extensión ni cambiar de ejecución escribiendo `/extensions` o `/resume`.

Un turno fallido vuelve como error de la herramienta, con lo que salió mal. Un segundo `ask` sobre una sesión que sigue en un turno también es un error, no una cola: si no, los reintentos de quien llama acumularían turnos que nadie espera. Sesiones distintas pueden funcionar a la vez.

## Opciones

| Opción | Por defecto | Qué hace |
| --- | --- | --- |
| `runsDir` | obligatoria | Dónde están las ejecuciones. |
| `identity` | obligatoria | El nombre y la versión del servidor, y lo que la herramienta `ask` dice que hace el agente (`AgentIdentity`). |
| `maxDepth` | `3` | Cuántos agentes servidos pueden encadenarse antes de que `ask` se niegue. |
| `progressIntervalMs` | `15000` | Cada cuánto un turno en marcha avisa de que sigue vivo. |
| `transport` | stdio | Otro transporte MCP. |
| `runQuery` | el del SDK | Otra forma de ejecutar el agente, para tests. |

## Solo modo autónomo

`serveMcp()` falla al arrancar si la sesión se abre en cualquier otro modo. Por esta conexión nadie puede contestar a un punto de control, y el modelo que llama nunca debe contestar por la persona: una aprobación devuelta a quien llama como resultado de una herramienta sería el modelo aprobándose a sí mismo. Decide qué puede hacer el agente por su cuenta con las salvaguardas del [modo autónomo](../core-concepts/modes.md), porque sus hooks son lo único que hay entre quien llama y sus herramientas.

## A qué prestar atención

- **Turnos largos.** Mientras dura un turno, el servidor envía notificaciones de progreso MCP con la etiqueta de la última acción del agente, y una cada `progressIntervalMs` entre medias. Solo mantienen viva la llamada si el cliente pidió el progreso y reinicia con él su tiempo de espera. Si no lo hace, aumenta el tiempo de espera de herramientas del cliente.
- **Cancelar.** Un cliente que cancela la llamada interrumpe el turno.
- **stdout es del protocolo.** Por stdio, `console.log`, `console.info` y `console.debug` van a stderr mientras se sirve. El código que escribe directamente en `process.stdout` rompe la conexión.
- **Sesiones abiertas.** Cada una es un proceso de Claude Code. El servidor mantiene las cuatro usadas más recientemente y cierra el resto; una cerrada se vuelve a abrir con su `session_id`.
- **Coste e inicio de sesión.** Cada agente servido tiene su propio contexto y coste, e inicia sesión por su cuenta: por stdio hereda el entorno de quien lo llama.
- **Bucles.** La profundidad viaja en el entorno hacia los servidores MCP propios del agente, una más en cada salto, y `ask` falla al llegar a `maxDepth`. El servidor de una extensión instalada arranca con el entorno limpio y no la recibe, así que una cadena que pase por una extensión vuelve a contar desde cero.

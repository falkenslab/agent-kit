# Captain Whiskers

Ejemplo mínimo de un agente construido sobre agent-kit: un gato pirata que corre siempre en
modo `autonomous` — sin ningún canal para pedir permiso, ni siquiera para los chistes.

Con el mínimo código posible, demuestra:
- `AgentSpec` + `buildSessionOptions()` (../../src/agentSpec.ts, session.ts)
- El chat en terminal ya armado: `runChatTui()`
- Autenticación automática con Claude: `createClaudeAuthTui()`
- Una skill y un comando de barra propios, vía `pluginRoots()` (`plugin/skills/pirate-joke/`,
  `plugin/commands/chiste.md`, `plugin/.claude-plugin/plugin.json`) — el mismo mecanismo
  (plugin local con manifiesto, subcarpetas `skills/`/`commands/`, comando invocado
  namespaced como `/<nombre-del-plugin>:<comando>`) que usa moodle-agent
- `spec.disallowedTools`: el capitán no tiene `Read`/`Write`/`Glob` (no le hacen falta,
  no toca ficheros del proyecto), pero conserva `WebFetch`/`WebSearch` y su plugin

## Ejecutar

Desde la raíz del repo:

```
npx tsx examples/captain-whiskers/agent.ts
```

El modo es fijo (`autonomous`, ver agent.ts) — no admite argumentos para cambiarlo. Para ver
el checkpoint humano (`request_human_approval`, modo `guided`) u otros modos, mira los tests
de agent-kit o cambia `mode: "autonomous"` en `agent.ts` a mano.

La primera vez, si no tienes ya un token de Claude configurado, te lo pedirá.

Dentro del chat, escribe `/captain-whiskers:chiste` para pedirle uno directamente (namespaced
con el nombre del plugin — un `/chiste` a secas no se reconoce y se comporta como si no
hubieras escrito nada; usa la skill `pirate-joke` para construirlo y lo suelta directamente,
sin pedir permiso) — o simplemente pídeselo por texto normal, la skill se activa igual.

Con las flechas ↑/↓ en el prompt recorres los mensajes que has escrito antes — incluso de
sesiones anteriores, no solo la actual.

Cada sesión deja su propia carpeta `.run/<fecha-y-hora>/` (ignorada por git) con dos ficheros:
- `transcript.jsonl` — un evento JSON por cada llamada a herramienta (pre/post). Solo se
  crea si el capitán llega a invocar alguna herramienta durante la sesión.
- `session.log` — espejo en texto plano de todo lo que apareció en la terminal (bienvenida,
  lo que escribes, la respuesta del capitán, las líneas `[action]`), sin códigos de color.
  Se crea siempre, aunque la conversación no use ninguna herramienta.

Además, directamente bajo `.run/` (no dentro de cada carpeta de sesión, para que persista
entre ejecuciones): `history.jsonl`, un objeto JSON por línea (`{text, timestamp}`) con
cada mensaje no vacío que escribes — de ahí sale el historial de ↑/↓. Se limita a los 100
más recientes; los más antiguos se van descartando.

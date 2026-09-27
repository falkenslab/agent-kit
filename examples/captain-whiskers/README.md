# Captain Whiskers

Ejemplo mínimo de un agente construido sobre agent-kit: un gato pirata que cuenta chistes en
un chat de terminal. Es un proyecto autónomo que consume el kit vía `file:../..`.

## Puesta en marcha

Con el kit compilado (en la raíz del repo, una vez y tras cada cambio en el kit):

```
npm install && npm run build
```

Y desde esta carpeta:

```
npm install
npm start
```

Necesita autenticación con Claude: exporta `CLAUDE_CODE_OAUTH_TOKEN` (o `ANTHROPIC_API_KEY`)
para no tener que repetirlo. Si no, te ofrece generar un token con `claude setup-token`, pero
solo vale para esa ejecución.

## Uso

Escribe con normalidad, `/captain-whiskers:chiste` para pedir un chiste directamente, y `/exit`
para salir. Con ↑/↓ recuperas mensajes anteriores, Tab completa los `/comandos` y Esc interrumpe
la respuesta en curso. Cada sesión guarda su transcripción en `.run/<fecha-hora>/` (ignorada por
git); el historial de ↑/↓ vive en `.run/history.jsonl`.

En un terminal usa la interfaz Ink del kit (`runChatInk`); sin TTY, o con `CAPTAIN_PLAIN=1`, el
chat de readline de siempre. Por defecto corre en modo `autonomous`; con `CAPTAIN_MODE=interactive`
pide aprobación antes de cada herramienta (el panel admite `y`/`n`/`q`, y también se puede
responder escribiendo en `.run/<fecha-hora>/approval-response.txt`), y con `CAPTAIN_MODE=guided`
solo antes de publicar algo.

## Tripulación (subagentes)

- `minino-buscachistes` — busca chistes nuevos en la web (`WebSearch`, `WebFetch`) y trae 2 o 3 candidatos con su fuente. Lo lanza el capitán cuando pides un chiste nuevo, o `/captain-whiskers:chiste-fresco`.
- `loro-critico` — puntúa el chiste elegido del 1 al 10, sin herramientas; si lo suspende, el capitán pide otra tanda una vez.
- `grumete-del-reloj` — solo con `CAPTAIN_BASH=1`: responde la hora, la fecha o cuánto falta para algo usando `Bash` (solo comandos de lectura de fecha). Como todo lo que da `Bash`, es opcional.

Todos usan `haiku`. Mientras trabajan, la interfaz muestra su actividad bajo el spinner (`↳ …`), y en `CAPTAIN_MODE=interactive` también sus herramientas pasan por el panel de aprobación.

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

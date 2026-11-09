---
sidebar_position: 6
title: Servidores que preguntan a la persona
description: La elicitación MCP en los chats del kit — un servidor MCP que pide a la persona un formulario o una página que abrir, con la respuesta yendo al servidor, nunca al modelo.
---

# Servidores que preguntan a la persona

Un servidor MCP puede pedirle algo a la persona en mitad de una herramienta: un formulario (la URL de un sitio, un rol, una confirmación propia) o una página que abrir (un inicio de sesión en otro sitio). Eso es la **elicitación** de MCP: el servidor envía `elicitation/create`, el cliente pregunta a la persona y la respuesta vuelve al servidor. El modelo solo ve el resultado de la herramienta, nunca lo que escribió la persona.

El kit entrega cada petición a la persona a través del [puerto de interacción](interaction-port.md), en todos los modos salvo el autónomo; una sesión autónoma, sin nadie a quien preguntar, la rechaza. `buildSessionOptions()` configura por ti el `onElicitation` del SDK: sin él, el SDK rechaza todas las peticiones.

## Un formulario {#a-form}

El servidor envía un mensaje y un JSON Schema plano con los valores que quiere: texto, números (`number`, `integer`, con `minimum` y `maximum`), sí/no (`boolean`), una elección (`enum`, o `oneOf` de `{ const, title }`), varias de una elección (un `array` de un `enum`), con `required` y `default`.

```json
{
  "message": "Which Moodle site should I use?",
  "requestedSchema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "title": "Site URL", "description": "Your campus address." },
      "role": { "type": "string", "oneOf": [{ "const": "teacher", "title": "Teacher" }, { "const": "student", "title": "Student" }] },
      "remember": { "type": "boolean", "title": "Remember it", "default": true }
    },
    "required": ["url"]
  }
}
```

- **Un puerto que muestra formularios** (`askForm`, el del controlador del chat con `panels: "state"`: los chats web y de escritorio) lo recibe entero: el `panel` del estado tiene `kind: "form"` y el formulario (`server`, `message`, `fields`), y se responde con `answer(id, JSON.stringify({ action, content }))`, donde `action` es `accept`, `decline` o `cancel`. El nombre del servidor siempre aparece, para que la persona sepa quién pregunta.
- **Cualquier otro puerto** (los chats de terminal) pregunta campo a campo con sus paneles habituales: primero quién pregunta, el mensaje y los campos (Enter responde, `n` rechaza, `q` cancela), y luego cada valor: una elección para las opciones y el sí/no, texto para el resto, preguntado de nuevo (hasta tres veces) cuando no es un valor de su tipo. Un campo obligatorio que se deja vacío rechaza.
- El [fichero de respuesta](response-file.md) responde cada paso como en cualquier punto de control.

Lo que responde la persona nunca se escribe en la transcripción ni en el log de la sesión. MCP dice que un servidor no debe pedir secretos en un formulario (un inicio de sesión va por una página), así que el kit no enmascara los campos; los secretos de una extensión van en sus [opciones](../extensions/configuring.md).

## Una página que abrir {#a-page-to-open}

Con `mode: "url"`, el servidor pide a la persona que abra una página. El kit muestra la dirección y espera a que la persona diga que ha terminado (una [intervención manual](manual-intervention.md)); nunca la abre por ella. Solo `https://`, o `http://` en este ordenador (`localhost`, `127.0.0.1`): cualquier otra dirección se rechaza sin preguntar.

## Escribir un servidor que pregunta {#writing-a-server-that-asks}

Pregunta desde una herramienta, mientras se ejecuta: una elicitación enviada justo al arrancar el servidor, antes de que la sesión esté lista, la cancela el SDK (medido). Puede que un cliente no la admita, o que la persona rechace o cancele: una herramienta funciona sin la respuesta, o dice que la necesita.

```ts
const answer = await server.server.elicitInput({
  message: "Which Moodle site should I use?",
  requestedSchema: { type: "object", properties: { url: { type: "string", title: "Site URL" } }, required: ["url"] },
});
if (answer.action !== "accept") return { content: [{ type: "text", text: "No site given: add one with add_site." }] };
```

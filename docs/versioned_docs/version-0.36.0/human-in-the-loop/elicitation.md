---
sidebar_position: 6
title: Servers asking the person
description: MCP elicitation in the kit's chats — an MCP server asking the person for a form or a page to open, with the answer going to the server, never the model.
---

# Servers asking the person

An MCP server can ask the person for something in the middle of a tool: a form (a site's URL, a role, a confirmation of its own) or a page to open (a sign-in elsewhere). That's MCP's **elicitation**: the server sends `elicitation/create`, the client asks the person, and the answer goes back to the server. The model only sees the tool's result, never what the person typed.

The kit hands every request to the person through the [interaction port](interaction-port.md), in every mode but autonomous; an autonomous session, with no one to ask, declines. `buildSessionOptions()` sets the SDK's `onElicitation` for you: without it, the SDK declines every request.

## A form

The server sends a message and a flat JSON Schema of the values it wants: text, numbers (`number`, `integer`, with `minimum` and `maximum`), yes/no (`boolean`), a choice (`enum`, or `oneOf` of `{ const, title }`), several of a choice (an `array` of an `enum`), with `required` and `default`.

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

- **A port that shows forms** (`askForm`, the chat controller's with `panels: "state"`: the web and desktop chats) gets it whole: the state's `panel` has `kind: "form"` and the form (`server`, `message`, `fields`), answered with `answer(id, JSON.stringify({ action, content }))`, where `action` is `accept`, `decline` or `cancel`. The server's name is always on it, so the person knows who asks.
- **Any other port** (the terminal chats) asks field by field with its usual panels: first who asks, the message and the fields (Enter answers, `n` declines, `q` cancels), then each value: a choice for options and yes/no, text for the rest, asked again (up to three times) when it isn't a value of its type. A required one left empty declines.
- The [response file](response-file.md) answers each step as for any checkpoint.

What the person answers is never written to the transcript or the session log. MCP says a server mustn't ask for secrets in a form (a sign-in goes through a page), so the kit doesn't mask the fields; an extension's secrets go in its [options](../extensions/configuring.md).

## A page to open

With `mode: "url"`, the server asks the person to open a page. The kit shows the address and waits for the person to say they're done (a [manual intervention](manual-intervention.md)); it never opens it for them. Only `https://`, or `http://` on this computer (`localhost`, `127.0.0.1`): any other address is declined without asking.

## Writing a server that asks

Ask from a tool, while it runs: an elicitation sent right as the server starts, before the session is ready, is cancelled by the SDK (measured). A client may not support it, or the person may decline or cancel: a tool works without the answer, or says it needs it.

```ts
const answer = await server.server.elicitInput({
  message: "Which Moodle site should I use?",
  requestedSchema: { type: "object", properties: { url: { type: "string", title: "Site URL" } }, required: ["url"] },
});
if (answer.action !== "accept") return { content: [{ type: "text", text: "No site given: add one with add_site." }] };
```

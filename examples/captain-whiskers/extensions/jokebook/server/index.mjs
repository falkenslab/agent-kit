// El servidor MCP del libro de chistes: una extensión externa (ADR-025, #37) que el kit arranca
// en su propio proceso, con Node y un entorno limpio. Sin dependencias, porque se instala
// copiando la carpeta: habla MCP por stdio (JSON-RPC, un mensaje por línea) a mano. Una
// extensión más grande usaría @modelcontextprotocol/sdk y se empaquetaría en un solo fichero.
import { createInterface } from "node:readline";

// Los clásicos, en inglés como todo lo que lee el modelo: él los cuenta en el idioma de la
// conversación.
const CLASSICS = [
  "Why couldn't the pirate play cards? Because he was standing on the deck.",
  "What's a pirate's favourite letter? You'd think it's R, but his first love be the C.",
  "Why did the pirate buy an eyepatch? He couldn't afford an iPad.",
  "How much did the pirate pay for his earrings? A buccaneer.",
  "Why are pirates called pirates? Because they arrr.",
  "What does a pirate say on his 80th birthday? Aye matey.",
];

// Lo que el modelo sabe de la extensión siempre: para qué es y sus reglas (llega con la
// conexión, como las instrucciones de cualquier servidor MCP).
const INSTRUCTIONS =
  "Your jokebook: the classic pirate jokes are in it. `classic_joke` gives one, word for word, when the person wants a classic, rather than making one up. To rank the jokes in your logbook, use the `rank-jokes` skill.";

const TOOLS = [
  {
    name: "classic_joke",
    description: "A classic pirate joke from the jokebook, picked at random: when the person wants a classic, rather than making one up.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
];

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function error(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function handle(message) {
  const { id, method, params } = message;
  if (id === undefined) return; // una notificación (initialized, cancelled): nada que responder
  switch (method) {
    case "initialize":
      return reply(id, {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "jokebook", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: TOOLS });
    case "tools/call":
      if (params?.name !== "classic_joke") return error(id, -32602, `Unknown tool: ${params?.name}`);
      return reply(id, { content: [{ type: "text", text: CLASSICS[Math.floor(Math.random() * CLASSICS.length)] }] });
    default:
      return error(id, -32601, `Method not found: ${method}`);
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  try {
    handle(JSON.parse(line));
  } catch {
    error(null, -32700, "Parse error");
  }
});

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSdkMcpServer, tool, type Extension } from "@falkenslab/agent-kit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Los clásicos de su libro de chistes, en inglés como todo lo que lee el modelo: él los cuenta
// en el idioma de la conversación.
const CLASSICS = [
  "Why couldn't the pirate play cards? Because he was standing on the deck.",
  "What's a pirate's favourite letter? You'd think it's R, but his first love be the C.",
  "Why did the pirate buy an eyepatch? He couldn't afford an iPad.",
  "How much did the pirate pay for his earrings? A buccaneer.",
  "Why are pirates called pirates? Because they arrr.",
  "What does a pirate say on his 80th birthday? Aye matey.",
];

/**
 * Su propia extensión (ADR-025): la que trae un agente en su paquete, junto a las del kit.
 * Aporta la capacidad "jokes" con una herramienta propia, `classic_joke`, y el skill
 * `jokebook:rank-jokes`, que exige "knowledge-base": sin el cuaderno, el kit no lo ofrece.
 */
export const jokebookExtension: Extension = {
  name: "jokebook",
  plugin: path.join(__dirname, "extensions", "jokebook"),
  async contribute() {
    const classicJoke = tool(
      "classic_joke",
      "A classic pirate joke from the captain's own jokebook, picked at random: when the person wants a classic, rather than making one up.",
      {},
      async () => ({ content: [{ type: "text" as const, text: CLASSICS[Math.floor(Math.random() * CLASSICS.length)] }] }),
      { annotations: { readOnlyHint: true } },
    );
    return {
      mcpServers: { jokebook: createSdkMcpServer({ name: "jokebook", version: "1.0.0", tools: [classicJoke] }) },
      promptSection:
        "## Your jokebook\nThe classics are in your own jokebook: `classic_joke` gives one, word for word, when the person wants a classic. To rank the jokes in your logbook, use the `rank-jokes` skill.",
      readOnlyTools: ["mcp__jokebook__classic_joke"],
      helpLines: ["Your jokebook: `classic_joke` gives a classic pirate joke; the `rank-jokes` skill (behind `/captain-whiskers:best-jokes`) ranks the logbook's jokes."],
    };
  },
};

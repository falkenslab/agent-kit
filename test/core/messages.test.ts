import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { en } from "../../src/core/messages/en.js";
import { es } from "../../src/core/messages/es.js";
import { fr } from "../../src/core/messages/fr.js";
import { de } from "../../src/core/messages/de.js";
import { messagesFor, setLanguage, t, withEnglishFallback, type Messages } from "../../src/core/messages/index.js";
import { createFriendlyToolLabel } from "../../src/core/toolLabels.js";

afterEach(() => setLanguage("en"));

/** Every key path of a catalog ("labels.reading", "shortcuts"...), one level into the nested groups. */
function keys(catalog: object): string[] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).map((inner) => `${key}.${inner}`) : [key],
  );
}

test("each language's catalog has every English key", () => {
  const english = keys(en).sort();
  for (const [name, catalog] of Object.entries({ es, fr, de })) {
    assert.deepEqual(keys(catalog).sort(), english, name);
    assert.equal((catalog.shortcuts ?? []).length, en.shortcuts.length, `${name} shortcuts`);
  }
});

test("a key missing in a language falls back to English", () => {
  assert.equal(messagesFor("es").thinking, "Pensando…");
  const partial = withEnglishFallback({ interrupted: "(unterbrochen)", labels: { aFile: "eine Datei" } as Messages["labels"] });
  assert.equal(partial.interrupted, "(unterbrochen)");
  assert.equal(partial.thinking, en.thinking);
  assert.equal(partial.labels.aFile, "eine Datei");
  assert.equal(partial.labels.reading("a.txt"), "Reading a.txt");
  // Nested groups merge key by key, not as a whole.
  assert.equal(messagesFor("de").labels.reading("a.txt"), "Liest a.txt");
  assert.equal(messagesFor("de").auth.noToken.startsWith("Es wurde"), true);
});

test("the kit's labels follow the current language", () => {
  const label = createFriendlyToolLabel();
  assert.equal(label("Read", { file_path: "notes.md" }), "Reading notes.md");
  setLanguage("fr");
  assert.equal(t().turns(2), "2 tours");
  assert.equal(label("Read", { file_path: "notes.md" }), "Lecture de notes.md");
  assert.equal(label("WebSearch", { query: "chats" }), 'Recherche sur le web de "chats"');
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { slashCommandToken } from "../../src/tui/chatTui.js";

test("slashCommandToken extracts the command name from a bare slash command", () => {
  assert.equal(slashCommandToken("/pepe"), "pepe");
});

test("slashCommandToken extracts the command name, ignoring trailing arguments", () => {
  assert.equal(slashCommandToken("/chiste con salsa"), "chiste");
});

test("slashCommandToken keeps a namespaced plugin command name whole", () => {
  assert.equal(slashCommandToken("/captain-whiskers:chiste"), "captain-whiskers:chiste");
});

test("slashCommandToken returns null for plain text (no leading slash)", () => {
  assert.equal(slashCommandToken("hola capitán"), null);
});

test("slashCommandToken returns null for a bare slash with nothing after it", () => {
  assert.equal(slashCommandToken("/"), null);
});

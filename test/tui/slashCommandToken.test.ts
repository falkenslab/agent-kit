import { test } from "node:test";
import assert from "node:assert/strict";
import { slashCommandToken } from "../../src/tui/chatTui.js";

test("slashCommandToken extracts the command name from a bare slash command", () => {
  assert.equal(slashCommandToken("/greet"), "greet");
});

test("slashCommandToken extracts the command name, ignoring trailing arguments", () => {
  assert.equal(slashCommandToken("/joke with salt"), "joke");
});

test("slashCommandToken keeps a namespaced plugin command name whole", () => {
  assert.equal(slashCommandToken("/captain-whiskers:joke"), "captain-whiskers:joke");
});

test("slashCommandToken returns null for plain text (no leading slash)", () => {
  assert.equal(slashCommandToken("hello captain"), null);
});

test("slashCommandToken returns null for a bare slash with nothing after it", () => {
  assert.equal(slashCommandToken("/"), null);
});

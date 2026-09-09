import { test } from "node:test";
import assert from "node:assert/strict";
import { isExitPromptError } from "../src/promptErrors.js";

test("isExitPromptError recognizes @inquirer/prompts' Ctrl+C error", () => {
  const error = new Error("cancelled");
  error.name = "ExitPromptError";
  assert.equal(isExitPromptError(error), true);
});

test("isExitPromptError is false for any other error or value", () => {
  assert.equal(isExitPromptError(new Error("something else")), false);
  assert.equal(isExitPromptError("not an error"), false);
  assert.equal(isExitPromptError(undefined), false);
});

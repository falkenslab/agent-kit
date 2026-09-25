import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import readline from "node:readline/promises";
import { askOnSharedReadline, isSharedQuestionActive } from "../../../src/core/hooks/sharedReadline.js";

test("askOnSharedReadline flags a question as active only while it waits for an answer", async () => {
  const input = new PassThrough();
  const rl = readline.createInterface({ input, output: new PassThrough(), terminal: false });
  try {
    assert.equal(isSharedQuestionActive(), false);

    const answer = askOnSharedReadline(rl, "Allow? ");
    assert.equal(isSharedQuestionActive(), true);

    input.write("y\n");
    assert.equal(await answer, "y");
    assert.equal(isSharedQuestionActive(), false);
  } finally {
    rl.close();
  }
});

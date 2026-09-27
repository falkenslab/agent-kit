import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { askForDecision, askForManualIntervention } from "../../../src/core/hooks/humanInput.js";
import { setInteractionPort, type ApprovalPrompt, type InteractionPort } from "../../../src/core/interaction.js";

const PROMPT: ApprovalPrompt = { title: "Proposed action", lines: ["Tool: Write"] };

function fakePort(answer: (signal: AbortSignal) => Promise<string>): InteractionPort & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    askDecision: (_prompt, signal) => {
      asked.push("decision");
      return answer(signal);
    },
    askManualIntervention: (_prompt, signal) => {
      asked.push("manual");
      return answer(signal);
    },
    notify: () => {},
  };
}

afterEach(() => setInteractionPort(null));

test("askForDecision takes the port's answer, lowercased and trimmed", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    const port = fakePort(async () => "  Y \n");
    setInteractionPort(port);
    assert.equal(await askForDecision(runDir, PROMPT), "y");
    assert.deepEqual(port.asked, ["decision"]);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("askForManualIntervention goes through the port's manual-intervention method", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    const port = fakePort(async () => "");
    setInteractionPort(port);
    assert.equal(await askForManualIntervention(runDir, PROMPT), "");
    assert.deepEqual(port.asked, ["manual"]);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("the response file wins over a port that never answers, which is then aborted", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    let aborted = false;
    setInteractionPort(
      fakePort(
        (signal) =>
          new Promise<string>(() => {
            signal.addEventListener("abort", () => (aborted = true));
          }),
      ),
    );
    const answer = askForDecision(runDir, PROMPT);
    const responseFile = path.join(runDir, "approval-response.txt");
    await new Promise((resolve) => setTimeout(resolve, 100)); // after the stale file is removed
    await writeFile(responseFile, "N\n");

    assert.equal(await answer, "n");
    assert.equal(aborted, true);
    await assert.rejects(access(responseFile)); // consumed
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("without a port the response file alone answers, and a failing port doesn't win", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    setInteractionPort(fakePort(async () => Promise.reject(new Error("no stdin"))));
    const answer = askForDecision(runDir, PROMPT);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await writeFile(path.join(runDir, "approval-response.txt"), "q");
    assert.equal(await answer, "q");

    setInteractionPort(null);
    const second = askForDecision(runDir, PROMPT);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await writeFile(path.join(runDir, "approval-response.txt"), "y");
    assert.equal(await second, "y");
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

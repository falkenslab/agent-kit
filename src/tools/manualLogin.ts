import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { askForDecision } from "../hooks/humanInput.js";

export interface ManualInterventionTexts {
  toolDescription: string;
  confirmedMessage: string;
  checkpointTitle: string;
  checkpointLines: string[];
  checkpointQuestion?: string;
}

/** Domain-neutral defaults — a concrete agent should normally override these via `AgentSpec.manualInterventionTexts` (e.g. moodle-agent's wording about no saved credentials / 2FA / captcha). */
export const DEFAULT_MANUAL_INTERVENTION_TEXTS: ManualInterventionTexts = {
  toolDescription:
    "Call this tool when you can't complete a step yourself (e.g. no credentials " +
    "configured, or an unexpected obstacle like 2FA/a captcha/a locked account). Pause " +
    "execution and wait for a human to intervene by hand in the already-open browser " +
    "window. Don't make up or guess credentials, and don't use it if the normal path " +
    "works fine.",
  confirmedMessage: "Manual intervention confirmed by the human. Continue from where you left off.",
  checkpointTitle: "Manual intervention required",
  checkpointLines: ["A human needs to intervene by hand in the already-open browser window."],
  checkpointQuestion: "Press Enter once you've finished (or 'q' to cancel): ",
};

/**
 * Checkpoint tool for when the agent hits something it can't do itself (typically: no
 * saved credentials, or a login flow that fails unexpectedly). Pauses execution until a
 * human confirms they've intervened by hand in the browser window (already running in
 * visible/headed mode), and then lets the agent continue.
 */
export function createManualLoginServer(runDir: string, texts: ManualInterventionTexts = DEFAULT_MANUAL_INTERVENTION_TEXTS) {
  const requestManualLogin = tool(
    "request_manual_login",
    texts.toolDescription,
    {},
    async () => {
      await askForDecision(runDir, {
        title: texts.checkpointTitle,
        lines: texts.checkpointLines,
        question: texts.checkpointQuestion,
      });

      return {
        content: [{ type: "text" as const, text: texts.confirmedMessage }],
      };
    },
  );

  return createSdkMcpServer({
    name: "manualLogin",
    version: "1.0.0",
    tools: [requestManualLogin],
  });
}

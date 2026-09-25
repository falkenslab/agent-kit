import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { askForDecision } from "../hooks/humanInput.js";

export interface ManualInterventionTexts {
  toolDescription: string;
  confirmedMessage: string;
  checkpointTitle: string;
  checkpointLines: string[];
  checkpointQuestion?: string;
}

/**
 * Checkpoint tool for when the agent hits something it can't do itself (typically a login
 * it has no credentials for, or one that fails unexpectedly). Pauses execution until a
 * human confirms they've intervened by hand in whatever live interface the agent is driving
 * (a browser window, say), and then lets the agent continue. There is deliberately no
 * default wording: what counts as a manual intervention is entirely the domain's, so the
 * concrete agent always supplies `texts` (see `AgentSpec.manualInterventionTexts`).
 */
export function createManualLoginServer(runDir: string, texts: ManualInterventionTexts) {
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

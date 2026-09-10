import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { askForDecision } from "../hooks/humanInput.js";

const APPROVED_ANSWERS = new Set(["", "y", "yes"]);

export interface HumanApprovalTexts {
  description: string;
  approved: string;
  rejected: string;
}

/** Domain-neutral defaults — a concrete agent should normally override these via `AgentSpec.humanApprovalTexts` with wording specific to what "publishing" means in its domain. */
export const DEFAULT_HUMAN_APPROVAL_TEXTS: HumanApprovalTexts = {
  description:
    "Ask for human confirmation right before an action that publishes something visible " +
    "to others and is hard to naturally undo. Don't use it for anything else: not for " +
    "browsing, not for reading, not before every intermediate step.",
  approved: "Approved by the human. You may continue.",
  rejected: "Rejected by the human. Don't proceed with that; ask what to do differently.",
};

/**
 * Checkpoint tool for "guided" mode: the agent explores freely, but
 * must call this tool and wait for human approval right before any action that publishes
 * something visible to others and that's hard to naturally undo. Everything else —
 * browsing and reading — doesn't go through this.
 */
export function createHumanApprovalServer(runDir: string, texts: HumanApprovalTexts = DEFAULT_HUMAN_APPROVAL_TEXTS) {
  const requestHumanApproval = tool(
    "request_human_approval",
    texts.description,
    {
      summary: z.string().describe("Brief summary of what you're about to submit or publish"),
    },
    async (args) => {
      const answer = await askForDecision(runDir, {
        title: "Human confirmation required before publishing",
        lines: [`Summary: ${args.summary}`],
      });
      const approved = APPROVED_ANSWERS.has(answer);

      return {
        content: [{ type: "text" as const, text: approved ? texts.approved : texts.rejected }],
      };
    },
  );

  return createSdkMcpServer({
    name: "approvals",
    version: "1.0.0",
    tools: [requestHumanApproval],
  });
}

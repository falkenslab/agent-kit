import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { askForChoice, askForDecision, askForText } from "../hooks/humanInput.js";
import { t } from "../messages/index.js";
import { togglePlanMode, type ModeControl } from "../modeControl.js";

const APPROVED_ANSWERS = new Set(["", "y", "yes"]);

/** The approval tool's texts: its description (when the model should call it) and what it returns when approved or rejected. */
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

const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });

/**
 * The tools that ask the person, in every mode but autonomous: `request_human_approval`
 * (right before an action that publishes something visible to others and that's hard to
 * undo), `ask_human` (a choice between options, in a panel, within the turn) and, when the
 * session can be in plan mode (`modeControl`), `present_plan`, the kit's own way out of plan
 * mode (ADR-023): the person runs the plan, keeps planning or cancels.
 */
export function createHumanApprovalServer(runDir: string, texts: HumanApprovalTexts = DEFAULT_HUMAN_APPROVAL_TEXTS, options: { modeControl?: ModeControl } = {}) {
  const requestHumanApproval = tool(
    "request_human_approval",
    texts.description,
    {
      summary: z.string().describe("Brief summary of what you're about to submit or publish"),
    },
    async (args) => {
      const answer = await askForDecision(runDir, {
        title: t().approvalTitle,
        lines: [t().summaryLine(args.summary)],
      });
      const approved = APPROVED_ANSWERS.has(answer);

      return {
        content: [{ type: "text" as const, text: approved ? texts.approved : texts.rejected }],
      };
    },
  );

  const askHuman = tool(
    "ask_human",
    "Ask the person to choose between options, in a panel, and get the answer in this same turn, instead of ending your turn with a written question. Use it when you need their decision to go on (which approach, which of several items). They can also type their own answer.",
    {
      question: z.string().describe("The question, in one sentence, in the person's language"),
      options: z.array(z.string()).min(2).max(8).describe("The options, short, in the person's language (2 to 8; an \"Other\" for their own answer is added)"),
      multiple: z.boolean().optional().describe("Whether they can pick several (default: one)"),
    },
    async (args) => {
      const answer = await askForChoice(runDir, { title: t().questionTitle, lines: [args.question] }, args.options, args.multiple ?? false);
      const parts = [
        ...(answer.chosen.length ? [`The person chose: ${answer.chosen.join("; ")}.`] : []),
        ...(answer.other ? [`Their own answer: ${answer.other}`] : []),
      ];
      return ok(parts.length ? parts.join("\n") : "The person didn't answer. Go on with what you can, or ask in your reply.");
    },
  );

  const control = options.modeControl;
  const presentPlan = tool(
    "present_plan",
    "In plan mode, when the plan is ready: show it to the person, who decides to run it (plan mode ends and you carry it out right away, in this turn), to keep planning (with a comment on what to change) or to cancel. Outside plan mode it's refused.",
    { plan: z.string().describe("The whole plan, in markdown, in the person's language: steps, what changes, what to check") },
    async (args) => {
      if (!control || control.mode !== "plan") return { ...ok("present_plan only works in plan mode: you aren't in it, so just go ahead."), isError: true };
      const choices = [t().runPlan, t().keepPlanning, t().cancelPlan];
      const answer = await askForChoice(runDir, { title: t().planTitle, lines: args.plan.split("\n"), markdown: true }, choices);
      const picked = answer.chosen[0];
      if (picked === t().runPlan) {
        const mode = togglePlanMode(control) ?? control.mode;
        control.takeNotice?.(); // told here, not again with the next message
        return ok(`The person approved the plan. Plan mode is off (now ${mode} mode): carry the plan out now, step by step.${answer.other ? ` They added: ${answer.other}` : ""}`);
      }
      if (picked === t().cancelPlan) return ok("The person cancelled the plan. Stop, and ask them what they want instead.");
      const comment = answer.other ?? (await askForText(runDir, { title: t().planTitle, lines: [], question: t().planCommentQuestion }));
      return ok(`The person wants to keep planning${comment ? `: ${comment}` : ""}. You're still in plan mode: revise the plan and present it again.`);
    },
  );

  return createSdkMcpServer({
    name: "approvals",
    version: "1.0.0",
    tools: [requestHumanApproval, askHuman, ...(control?.switchable.includes("plan") ? [presentPlan] : [])],
  });
}

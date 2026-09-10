export * as ui from "./tui/ui.js";
export { isExitPromptError } from "./tui/promptErrors.js";
export { allowAnyMcpTool } from "./core/mcpPermissions.js";
export { createPromptLoader } from "./core/promptTemplate.js";
export { resolveClaudeAuth, type ClaudeAuthConfig } from "./core/claudeAuth.js";
export { ensureClaudeAuth } from "./tui/claudeAuth.js";
export {
  createFriendlyToolLabel,
  truncate,
  truncatePath,
  type ToolDescriber,
} from "./core/toolLabels.js";
export type { Mode, BaseSessionConfig, AgentSpec } from "./core/agentSpec.js";
export { buildSessionOptions, createInputQueue, createDeferred } from "./core/session.js";
export { runQuery, type AgentEvent, type AgentRun } from "./core/runner.js";

// Re-exported so a concrete agent (implementing AgentSpec, wiring up buildSessionOptions())
// never has to import @anthropic-ai/claude-agent-sdk itself just for these types — this
// kit already depends on it (as a peerDependency, see package.json) for its own public
// API, so re-exporting the handful of its types other than what's above (AgentSpec,
// AgentEvent, ...) already needs is a one-line addition, and it means a consumer can drop
// the SDK from its own package.json entirely once it no longer calls query()/tool()/
// createSdkMcpServer() directly (see moodle-agent's session.ts/moodleAgentDefinition.ts).
export type { Options, McpServerConfig, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

export { createTranscriptLogger, summarizeToolResponse, type TranscriptLogger } from "./core/hooks/transcriptLogger.js";
export { createStepGate } from "./core/hooks/stepGate.js";
export { createSubagentBashGate } from "./core/hooks/subagentBashGate.js";
export { createSubagentTypeGate } from "./core/hooks/subagentTypeGate.js";
export { createSubagentForegroundGate } from "./core/hooks/subagentForegroundGate.js";
export { askForDecision, type ApprovalPrompt } from "./core/hooks/humanInput.js";
export { setSharedReadline, getSharedReadline } from "./core/hooks/sharedReadline.js";

export { createHumanApprovalServer, DEFAULT_HUMAN_APPROVAL_TEXTS, type HumanApprovalTexts } from "./core/tools/humanApproval.js";
export { createManualLoginServer, DEFAULT_MANUAL_INTERVENTION_TEXTS, type ManualInterventionTexts } from "./core/tools/manualLogin.js";
export { createSaveToKnowledgeServer } from "./core/tools/saveToKnowledge.js";

export { runChatTui, type ChatTuiOptions } from "./tui/chatTui.js";

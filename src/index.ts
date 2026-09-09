export * from "./ui.js";
export { isExitPromptError } from "./promptErrors.js";
export { allowAnyMcpTool } from "./mcpPermissions.js";
export { createPromptLoader } from "./promptTemplate.js";
export { createGlobalConfigStore, type BaseGlobalConfig, type GlobalConfigStore } from "./globalConfigStore.js";
export { createClaudeAuth } from "./claudeAuth.js";
export {
  createFriendlyToolLabel,
  truncate,
  truncatePath,
  type ToolDescriber,
} from "./toolLabels.js";
export type { Mode, BaseSessionConfig, AgentSpec } from "./agentSpec.js";
export { buildSessionOptions, createInputQueue, createDeferred } from "./session.js";
export { runQuery, type AgentEvent, type AgentRun } from "./runner.js";

// Re-exported so a concrete agent (implementing AgentSpec, wiring up buildSessionOptions())
// never has to import @anthropic-ai/claude-agent-sdk itself just for these types — this
// kit already depends on it (as a peerDependency, see package.json) for its own public
// API, so re-exporting the handful of its types other than what's above (AgentSpec,
// AgentEvent, ...) already needs is a one-line addition, and it means a consumer can drop
// the SDK from its own package.json entirely once it no longer calls query()/tool()/
// createSdkMcpServer() directly (see moodle-agent's session.ts/moodleAgentDefinition.ts).
export type { Options, McpServerConfig, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

export { createTranscriptLogger, summarizeToolResponse, type TranscriptLogger } from "./hooks/transcriptLogger.js";
export { createStepGate } from "./hooks/stepGate.js";
export { createSubagentBashGate } from "./hooks/subagentBashGate.js";
export { createSubagentTypeGate } from "./hooks/subagentTypeGate.js";
export { createSubagentForegroundGate } from "./hooks/subagentForegroundGate.js";
export { askForDecision, type ApprovalPrompt } from "./hooks/humanInput.js";
export { setSharedReadline, getSharedReadline } from "./hooks/sharedReadline.js";

export { createHumanApprovalServer, DEFAULT_HUMAN_APPROVAL_TEXTS, type HumanApprovalTexts } from "./tools/humanApproval.js";
export { createManualLoginServer, DEFAULT_MANUAL_INTERVENTION_TEXTS, type ManualInterventionTexts } from "./tools/manualLogin.js";
export { createSaveToKnowledgeServer } from "./tools/saveToKnowledge.js";

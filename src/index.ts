import { setInteractionPort } from "./core/interaction.js";
import { terminalInteractionPort } from "./tui/terminalInteraction.js";

export * as ui from "./tui/ui.js";
export { setTheme, getTheme, DEFAULT_THEME, type Theme, type ThemeColor } from "./tui/theme.js";
export { isExitPromptError } from "./tui/promptErrors.js";
export { allowAnyMcpTool } from "./core/mcpPermissions.js";
export { createPromptLoader } from "./core/promptTemplate.js";
export { resolveClaudeAuth, type ClaudeAuthConfig } from "./core/claudeAuth.js";
export { ensureClaudeAuth } from "./tui/claudeAuth.js";
export {
  createFriendlyToolLabel,
  truncate,
  truncatePath,
  withToolLabels,
  withToolPhrases,
  type ToolDescriber,
  type ToolLabel,
  type ToolLabels,
} from "./core/toolLabels.js";
export type { Mode, BaseSessionConfig, AgentSpec, AgentIdentity, PlanModeSpec } from "./core/agentSpec.js";
export { buildSessionOptions, createInputQueue, createDeferred, createModeControl, togglePlanMode, type ModeControl, type ExtensionsStatus } from "./core/session.js";
export { runQuery, type AgentEvent, type AgentRun, type SessionUsage, type ContextUsage } from "./core/runner.js";
export type { SessionFacts } from "./core/sessionFacts.js";
export { knowledgePluginRoot, knowledgePromptSection } from "./extensions/knowledge/prompt.js";
export {
  readExtensionManifest,
  type Extension,
  type ExtensionContext,
  type ExtensionContribution,
  type ExtensionManifest,
} from "./core/extensions.js";
export {
  addExtension,
  removeExtension,
  setExtensionEnabled,
  listInstalled,
  readExternalManifest,
  type ExtensionAuthor,
  type ExtensionDirs,
  type ExtensionScope,
  type ExternalManifest,
  type ExternalToolLabel,
  type PluginServer,
  type InstalledExtension,
  type LockEntry,
} from "./core/externalExtensions.js";
export { runExtensionCommand } from "./tui/extensionCommand.js";
export { agentKitVersion } from "./core/version.js";
export {
  BUILT_IN_PAGE_TYPES,
  isSlug,
  parseId,
  linkedIds,
  type KnowledgeStore,
  type PageType,
  type KnowledgePage,
  type PageInfo,
  type SearchHit,
  type CheckReport,
  type FieldChanges,
  type NewPage,
} from "./extensions/knowledge/knowledgeStore.js";
export { createFileKnowledgeStore, type FileKnowledgeStoreOptions } from "./extensions/knowledge/fileKnowledgeStore.js";
export { createKnowledgeServer, type KnowledgeToolsOptions } from "./extensions/knowledge/tools.js";
export {
  resolveLanguage,
  detectLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
  type LanguageSources,
  type ResolvedLanguage,
} from "./core/language.js";
export { setLanguage, switchLanguage, getLanguage, messagesFor, type Messages } from "./core/messages/index.js";
export {
  createRunStore,
  createRunFolder,
  listRuns,
  readConversation,
  type RunFolder,
  type RunSummary,
  type ConversationMessage,
} from "./core/runs.js";

// Re-exported so a concrete agent (implementing AgentSpec, wiring up buildSessionOptions())
// never has to import @anthropic-ai/claude-agent-sdk itself just for these types — this
// kit already depends on it (as a dependency, see package.json) for its own public
// API, so re-exporting the handful of its types other than what's above (AgentSpec,
// AgentEvent, ...) already needs is a one-line addition, and it means a consumer can drop
// the SDK from its own package.json entirely once it no longer calls query()/tool()/
// createSdkMcpServer() directly.
export type { Options, McpServerConfig, AgentDefinition } from "@anthropic-ai/claude-agent-sdk";
// And the two functions an agent needs for tools of its own (an in-process MCP server,
// returned from AgentSpec.buildMcpServers()), so it doesn't need the SDK for those either.
export { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";

export { createTranscriptLogger, summarizeToolResponse, type TranscriptLogger } from "./core/hooks/transcriptLogger.js";
export { createStepGate } from "./core/hooks/stepGate.js";
export { createSubagentBashGate } from "./core/hooks/subagentBashGate.js";
export { createSubagentTypeGate } from "./core/hooks/subagentTypeGate.js";
export { createSubagentForegroundGate } from "./core/hooks/subagentForegroundGate.js";
export { createFileScopeGate, checkFileScope, type FileScope } from "./core/hooks/fileScopeGate.js";
export { createPlanGate, checkPlanScope, type PlanScope } from "./core/hooks/planGate.js";
export { askForDecision, askForManualIntervention, askForChoice, askForText, type ChoiceAnswer } from "./core/hooks/humanInput.js";
export { setInteractionPort, getInteractionPort, type InteractionPort, type ApprovalPrompt, type ChoiceSettings } from "./core/interaction.js";
export { terminalInteractionPort, setSharedReadline, getSharedReadline } from "./tui/terminalInteraction.js";

// The checkpoints answer on the terminal by default, as they always have; a non-terminal
// host replaces the port with its own (or null, to answer through the response file only).
setInteractionPort(terminalInteractionPort);

export { createHumanApprovalServer, DEFAULT_HUMAN_APPROVAL_TEXTS, type HumanApprovalTexts } from "./core/tools/humanApproval.js";
export { createManualLoginServer, type ManualInterventionTexts } from "./core/tools/manualLogin.js";
export { createSaveToSourcesServer, sourcesPromptSection, type SourceToolsOptions } from "./extensions/sources/tools.js";

export { runChatTui, type ChatTuiOptions } from "./tui/chatTui.js";
export type { SessionOpener } from "./chat/runs.js";
export {
  createChatController,
  type ChatController,
  type ChatSettings,
  type ChatState,
  type ChatEvent,
  type ChatPanel,
  type ChatQuestion,
  type TranscriptEntry,
  type TranscriptCall,
  type NoticeTone,
} from "./chat/chatController.js";
export { createConsoleRenderer, type ConsoleRenderer, type ConsoleRendererOptions } from "./tui/consoleRenderer.js";
export { runChatInk, type InkChatOptions, type HeaderInfo } from "./tui/ink/runChatInk.js";
export type { ToolPhrase, ToolDetail, ResultFormatter } from "./tui/ink/toolGroup.js";
export type { RenderApproval } from "./tui/ink/SessionView.js";
export { createProgressView, type ProgressView, type ProgressViewOptions } from "./tui/ink/progressView.js";
export {
  runWizard,
  type WizardStep,
  type SelectStep,
  type InputStep,
  type PasswordStep,
  type ConfirmStep,
  type WizardAnswers,
  type WizardOptions,
} from "./tui/ink/wizard.js";

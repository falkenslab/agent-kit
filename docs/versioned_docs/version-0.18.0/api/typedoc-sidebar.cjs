// @ts-check
/** @type {import("@docusaurus/plugin-content-docs").SidebarsConfig} */
const typedocSidebar = {
  items: [
    {
      type: "category",
      label: "Namespaces",
      items: [
        {
          type: "category",
          label: "ui",
          items: [
            {
              type: "category",
              label: "Functions",
              items: [
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/accent",
                  label: "accent"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/action",
                  label: "action"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/agent",
                  label: "agent"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/bold",
                  label: "bold"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/code",
                  label: "code"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/dim",
                  label: "dim"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/error",
                  label: "error"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/heading",
                  label: "heading"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/italic",
                  label: "italic"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/strike",
                  label: "strike"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/success",
                  label: "success"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/toolBullet",
                  label: "toolBullet"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/toolLabel",
                  label: "toolLabel"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/toolResult",
                  label: "toolResult"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/user",
                  label: "user"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/userBar",
                  label: "userBar"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/warn",
                  label: "warn"
                },
                {
                  type: "doc",
                  id: "api/@falkenslab/namespaces/ui/functions/working",
                  label: "working"
                }
              ]
            }
          ],
          link: {
            type: "doc",
            id: "api/@falkenslab/namespaces/ui/index"
          }
        }
      ]
    },
    {
      type: "category",
      label: "Interfaces",
      items: [
        {
          type: "doc",
          id: "api/interfaces/AgentIdentity",
          label: "AgentIdentity"
        },
        {
          type: "doc",
          id: "api/interfaces/AgentRun",
          label: "AgentRun"
        },
        {
          type: "doc",
          id: "api/interfaces/AgentSpec",
          label: "AgentSpec"
        },
        {
          type: "doc",
          id: "api/interfaces/ApprovalPrompt",
          label: "ApprovalPrompt"
        },
        {
          type: "doc",
          id: "api/interfaces/BaseSessionConfig",
          label: "BaseSessionConfig"
        },
        {
          type: "doc",
          id: "api/interfaces/ChatTuiOptions",
          label: "ChatTuiOptions"
        },
        {
          type: "doc",
          id: "api/interfaces/CheckReport",
          label: "CheckReport"
        },
        {
          type: "doc",
          id: "api/interfaces/ChoiceAnswer",
          label: "ChoiceAnswer"
        },
        {
          type: "doc",
          id: "api/interfaces/ChoiceSettings",
          label: "ChoiceSettings"
        },
        {
          type: "doc",
          id: "api/interfaces/ClaudeAuthConfig",
          label: "ClaudeAuthConfig"
        },
        {
          type: "doc",
          id: "api/interfaces/ConfirmStep",
          label: "ConfirmStep"
        },
        {
          type: "doc",
          id: "api/interfaces/ConsoleRenderer",
          label: "ConsoleRenderer"
        },
        {
          type: "doc",
          id: "api/interfaces/ConsoleRendererOptions",
          label: "ConsoleRendererOptions"
        },
        {
          type: "doc",
          id: "api/interfaces/ContextUsage",
          label: "ContextUsage"
        },
        {
          type: "doc",
          id: "api/interfaces/ConversationMessage",
          label: "ConversationMessage"
        },
        {
          type: "doc",
          id: "api/interfaces/FileKnowledgeStoreOptions",
          label: "FileKnowledgeStoreOptions"
        },
        {
          type: "doc",
          id: "api/interfaces/FileScope",
          label: "FileScope"
        },
        {
          type: "doc",
          id: "api/interfaces/HeaderInfo",
          label: "HeaderInfo"
        },
        {
          type: "doc",
          id: "api/interfaces/HumanApprovalTexts",
          label: "HumanApprovalTexts"
        },
        {
          type: "doc",
          id: "api/interfaces/InkChatOptions",
          label: "InkChatOptions"
        },
        {
          type: "doc",
          id: "api/interfaces/InputStep",
          label: "InputStep"
        },
        {
          type: "doc",
          id: "api/interfaces/InteractionPort",
          label: "InteractionPort"
        },
        {
          type: "doc",
          id: "api/interfaces/KnowledgePage",
          label: "KnowledgePage"
        },
        {
          type: "doc",
          id: "api/interfaces/KnowledgeStore",
          label: "KnowledgeStore"
        },
        {
          type: "doc",
          id: "api/interfaces/KnowledgeToolsOptions",
          label: "KnowledgeToolsOptions"
        },
        {
          type: "doc",
          id: "api/interfaces/LanguageSources",
          label: "LanguageSources"
        },
        {
          type: "doc",
          id: "api/interfaces/ManualInterventionTexts",
          label: "ManualInterventionTexts"
        },
        {
          type: "doc",
          id: "api/interfaces/Messages",
          label: "Messages"
        },
        {
          type: "doc",
          id: "api/interfaces/ModeControl",
          label: "ModeControl"
        },
        {
          type: "doc",
          id: "api/interfaces/NewPage",
          label: "NewPage"
        },
        {
          type: "doc",
          id: "api/interfaces/PageInfo",
          label: "PageInfo"
        },
        {
          type: "doc",
          id: "api/interfaces/PageType",
          label: "PageType"
        },
        {
          type: "doc",
          id: "api/interfaces/PasswordStep",
          label: "PasswordStep"
        },
        {
          type: "doc",
          id: "api/interfaces/PlanModeSpec",
          label: "PlanModeSpec"
        },
        {
          type: "doc",
          id: "api/interfaces/PlanScope",
          label: "PlanScope"
        },
        {
          type: "doc",
          id: "api/interfaces/ProgressView",
          label: "ProgressView"
        },
        {
          type: "doc",
          id: "api/interfaces/ProgressViewOptions",
          label: "ProgressViewOptions"
        },
        {
          type: "doc",
          id: "api/interfaces/ResolvedLanguage",
          label: "ResolvedLanguage"
        },
        {
          type: "doc",
          id: "api/interfaces/RunFolder",
          label: "RunFolder"
        },
        {
          type: "doc",
          id: "api/interfaces/RunSummary",
          label: "RunSummary"
        },
        {
          type: "doc",
          id: "api/interfaces/SearchHit",
          label: "SearchHit"
        },
        {
          type: "doc",
          id: "api/interfaces/SelectStep",
          label: "SelectStep"
        },
        {
          type: "doc",
          id: "api/interfaces/SessionUsage",
          label: "SessionUsage"
        },
        {
          type: "doc",
          id: "api/interfaces/SourceToolsOptions",
          label: "SourceToolsOptions"
        },
        {
          type: "doc",
          id: "api/interfaces/Theme",
          label: "Theme"
        },
        {
          type: "doc",
          id: "api/interfaces/TranscriptLogger",
          label: "TranscriptLogger"
        },
        {
          type: "doc",
          id: "api/interfaces/WizardOptions",
          label: "WizardOptions"
        }
      ]
    },
    {
      type: "category",
      label: "Type Aliases",
      items: [
        {
          type: "doc",
          id: "api/type-aliases/AgentEvent",
          label: "AgentEvent"
        },
        {
          type: "doc",
          id: "api/type-aliases/FieldChanges",
          label: "FieldChanges"
        },
        {
          type: "doc",
          id: "api/type-aliases/Language",
          label: "Language"
        },
        {
          type: "doc",
          id: "api/type-aliases/Mode",
          label: "Mode"
        },
        {
          type: "doc",
          id: "api/type-aliases/RenderApproval",
          label: "RenderApproval"
        },
        {
          type: "doc",
          id: "api/type-aliases/ResultFormatter",
          label: "ResultFormatter"
        },
        {
          type: "doc",
          id: "api/type-aliases/SessionOpener",
          label: "SessionOpener"
        },
        {
          type: "doc",
          id: "api/type-aliases/ThemeColor",
          label: "ThemeColor"
        },
        {
          type: "doc",
          id: "api/type-aliases/ToolDescriber",
          label: "ToolDescriber"
        },
        {
          type: "doc",
          id: "api/type-aliases/ToolDetail",
          label: "ToolDetail"
        },
        {
          type: "doc",
          id: "api/type-aliases/ToolPhrase",
          label: "ToolPhrase"
        },
        {
          type: "doc",
          id: "api/type-aliases/WizardAnswers",
          label: "WizardAnswers"
        },
        {
          type: "doc",
          id: "api/type-aliases/WizardStep",
          label: "WizardStep"
        }
      ]
    },
    {
      type: "category",
      label: "Variables",
      items: [
        {
          type: "doc",
          id: "api/variables/allowAnyMcpTool",
          label: "allowAnyMcpTool"
        },
        {
          type: "doc",
          id: "api/variables/BUILT_IN_PAGE_TYPES",
          label: "BUILT_IN_PAGE_TYPES"
        },
        {
          type: "doc",
          id: "api/variables/DEFAULT_HUMAN_APPROVAL_TEXTS",
          label: "DEFAULT_HUMAN_APPROVAL_TEXTS"
        },
        {
          type: "doc",
          id: "api/variables/DEFAULT_THEME",
          label: "DEFAULT_THEME"
        },
        {
          type: "doc",
          id: "api/variables/SUPPORTED_LANGUAGES",
          label: "SUPPORTED_LANGUAGES"
        },
        {
          type: "doc",
          id: "api/variables/terminalInteractionPort",
          label: "terminalInteractionPort"
        }
      ]
    },
    {
      type: "category",
      label: "Functions",
      items: [
        {
          type: "doc",
          id: "api/functions/agentKitVersion",
          label: "agentKitVersion"
        },
        {
          type: "doc",
          id: "api/functions/askForChoice",
          label: "askForChoice"
        },
        {
          type: "doc",
          id: "api/functions/askForDecision",
          label: "askForDecision"
        },
        {
          type: "doc",
          id: "api/functions/askForManualIntervention",
          label: "askForManualIntervention"
        },
        {
          type: "doc",
          id: "api/functions/askForText",
          label: "askForText"
        },
        {
          type: "doc",
          id: "api/functions/buildSessionOptions",
          label: "buildSessionOptions"
        },
        {
          type: "doc",
          id: "api/functions/checkFileScope",
          label: "checkFileScope"
        },
        {
          type: "doc",
          id: "api/functions/checkPlanScope",
          label: "checkPlanScope"
        },
        {
          type: "doc",
          id: "api/functions/createConsoleRenderer",
          label: "createConsoleRenderer"
        },
        {
          type: "doc",
          id: "api/functions/createDeferred",
          label: "createDeferred"
        },
        {
          type: "doc",
          id: "api/functions/createFileKnowledgeStore",
          label: "createFileKnowledgeStore"
        },
        {
          type: "doc",
          id: "api/functions/createFileScopeGate",
          label: "createFileScopeGate"
        },
        {
          type: "doc",
          id: "api/functions/createFriendlyToolLabel",
          label: "createFriendlyToolLabel"
        },
        {
          type: "doc",
          id: "api/functions/createHumanApprovalServer",
          label: "createHumanApprovalServer"
        },
        {
          type: "doc",
          id: "api/functions/createInputQueue",
          label: "createInputQueue"
        },
        {
          type: "doc",
          id: "api/functions/createKnowledgeServer",
          label: "createKnowledgeServer"
        },
        {
          type: "doc",
          id: "api/functions/createManualLoginServer",
          label: "createManualLoginServer"
        },
        {
          type: "doc",
          id: "api/functions/createModeControl",
          label: "createModeControl"
        },
        {
          type: "doc",
          id: "api/functions/createPlanGate",
          label: "createPlanGate"
        },
        {
          type: "doc",
          id: "api/functions/createProgressView",
          label: "createProgressView"
        },
        {
          type: "doc",
          id: "api/functions/createPromptLoader",
          label: "createPromptLoader"
        },
        {
          type: "doc",
          id: "api/functions/createRunFolder",
          label: "createRunFolder"
        },
        {
          type: "doc",
          id: "api/functions/createRunStore",
          label: "createRunStore"
        },
        {
          type: "doc",
          id: "api/functions/createSaveToSourcesServer",
          label: "createSaveToSourcesServer"
        },
        {
          type: "doc",
          id: "api/functions/createStepGate",
          label: "createStepGate"
        },
        {
          type: "doc",
          id: "api/functions/createSubagentBashGate",
          label: "createSubagentBashGate"
        },
        {
          type: "doc",
          id: "api/functions/createSubagentForegroundGate",
          label: "createSubagentForegroundGate"
        },
        {
          type: "doc",
          id: "api/functions/createSubagentTypeGate",
          label: "createSubagentTypeGate"
        },
        {
          type: "doc",
          id: "api/functions/createTranscriptLogger",
          label: "createTranscriptLogger"
        },
        {
          type: "doc",
          id: "api/functions/detectLanguage",
          label: "detectLanguage"
        },
        {
          type: "doc",
          id: "api/functions/ensureClaudeAuth",
          label: "ensureClaudeAuth"
        },
        {
          type: "doc",
          id: "api/functions/getInteractionPort",
          label: "getInteractionPort"
        },
        {
          type: "doc",
          id: "api/functions/getLanguage",
          label: "getLanguage"
        },
        {
          type: "doc",
          id: "api/functions/getSharedReadline",
          label: "getSharedReadline"
        },
        {
          type: "doc",
          id: "api/functions/getTheme",
          label: "getTheme"
        },
        {
          type: "doc",
          id: "api/functions/isExitPromptError",
          label: "isExitPromptError"
        },
        {
          type: "doc",
          id: "api/functions/isSlug",
          label: "isSlug"
        },
        {
          type: "doc",
          id: "api/functions/knowledgePluginRoot",
          label: "knowledgePluginRoot"
        },
        {
          type: "doc",
          id: "api/functions/knowledgePromptSection",
          label: "knowledgePromptSection"
        },
        {
          type: "doc",
          id: "api/functions/linkedIds",
          label: "linkedIds"
        },
        {
          type: "doc",
          id: "api/functions/listRuns",
          label: "listRuns"
        },
        {
          type: "doc",
          id: "api/functions/messagesFor",
          label: "messagesFor"
        },
        {
          type: "doc",
          id: "api/functions/parseId",
          label: "parseId"
        },
        {
          type: "doc",
          id: "api/functions/readConversation",
          label: "readConversation"
        },
        {
          type: "doc",
          id: "api/functions/resolveClaudeAuth",
          label: "resolveClaudeAuth"
        },
        {
          type: "doc",
          id: "api/functions/resolveLanguage",
          label: "resolveLanguage"
        },
        {
          type: "doc",
          id: "api/functions/runChatInk",
          label: "runChatInk"
        },
        {
          type: "doc",
          id: "api/functions/runChatTui",
          label: "runChatTui"
        },
        {
          type: "doc",
          id: "api/functions/runQuery",
          label: "runQuery"
        },
        {
          type: "doc",
          id: "api/functions/runWizard",
          label: "runWizard"
        },
        {
          type: "doc",
          id: "api/functions/setInteractionPort",
          label: "setInteractionPort"
        },
        {
          type: "doc",
          id: "api/functions/setLanguage",
          label: "setLanguage"
        },
        {
          type: "doc",
          id: "api/functions/setSharedReadline",
          label: "setSharedReadline"
        },
        {
          type: "doc",
          id: "api/functions/setTheme",
          label: "setTheme"
        },
        {
          type: "doc",
          id: "api/functions/sourcesPromptSection",
          label: "sourcesPromptSection"
        },
        {
          type: "doc",
          id: "api/functions/summarizeToolResponse",
          label: "summarizeToolResponse"
        },
        {
          type: "doc",
          id: "api/functions/togglePlanMode",
          label: "togglePlanMode"
        },
        {
          type: "doc",
          id: "api/functions/truncate",
          label: "truncate"
        },
        {
          type: "doc",
          id: "api/functions/truncatePath",
          label: "truncatePath"
        }
      ]
    }
  ]
};
module.exports = typedocSidebar.items;
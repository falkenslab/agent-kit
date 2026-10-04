import type { Mode } from "../agentSpec.js";

/** How a tool counts in a folded group's summary: the phrase for one call and for several, "{n}" standing for the count. */
export type ToolPhrase = [one: string, many: string];

/**
 * Every text the kit shows a person, in one language. Texts for the model (tool
 * descriptions, hook deny reasons, the knowledge base's prompt section) aren't here: they
 * stay in English whatever the language.
 */
export interface Messages {
  // The chat's spinner, status bar and turn summary.
  thinking: string;
  escToInterrupt: string;
  workedFor(seconds: number): string;
  turns(count: number): string;
  tokens(input: string, output: string): string;
  context(percent: number): string;
  mode(mode: Mode): string;
  switchModeKey: string;
  modeLocked(mode: Mode | undefined): string;
  linesBelow(count: number): string;
  copiedCharacters(count: number): string;

  // Notices in the chat.
  queued(line: string): string;
  interrupted: string;
  copiedReply(characters: number): string;
  nothingToCopy: string;
  unknownCommand(command: string): string;
  mcpFailed(servers: string): string;

  // Resuming an earlier conversation (/resume, --continue).
  resumeTitle: string;
  resumeHint: string;
  resumeQuestion: string;
  noEarlierRuns: string;
  currentRun: string;
  resumed(date: string): string;

  // The prompt.
  suggestionKey: string;
  reverseSearch(query: string): string;
  pastedText(id: number, extraLines: number): string;
  shortcuts: string[];

  // Checkpoints.
  moreLines(count: number): string;
  proceed: string;
  yes: string;
  no: string;
  stop: string;
  doneContinue: string;
  approved: string;
  rejected: string;
  stopped: string;
  done: string;
  answeredByFile: string;
  terminalQuestion: string;
  proposedAction: string;
  toolLine(tool: string): string;
  parametersLine(parameters: string): string;
  approvalTitle: string;
  summaryLine(summary: string): string;
  noAnswer: string;
  textAnswerHint: string;
  textAnswerKeys: string;
  fileRequestTitle: string;
  fileRequestQuestion: string;
  retireTitle: string;
  retirePageTitle: string;
  choiceQuestion(multiple: boolean): string;
  otherOption: string;
  choiceKeys(multiple: boolean): string;
  questionTitle: string;
  planTitle: string;
  runPlan: string;
  keepPlanning: string;
  cancelPlan: string;
  planCommentQuestion: string;
  retireLines(source: string, why: "wrong" | "replaced", reason: string, replacedBy?: string): string[];

  // Tool calls: folded groups, results and friendly labels.
  toolPhrases: Record<string, ToolPhrase>;
  otherTools: ToolPhrase;
  noOutput: string;
  error: string;
  /** A failed tool call when results are hidden (`toolDetail: "calls"`): no tool output, just that it failed. */
  toolFailed: string;
  moreResultLines(count: number): string;
  earlierCalls(count: number): string;
  /** Tasks of the task list left out of the view. */
  moreTodos(count: number): string;
  labels: {
    askingApproval(summary: string): string;
    waitingManual: string;
    savingToSources(destination: string): string;
    checkingTime: string;
    calculatingDates: string;
    reading(file: string): string;
    writing(file: string): string;
    editing(file: string): string;
    aFile: string;
    findingFiles(pattern: string): string;
    searchingContents(pattern: string): string;
    running(command: string): string;
    delegating(subagent: string): string;
    delegatingTask(subagent: string, description: string): string;
    aSubagent: string;
    fetching(url: string): string;
    aPage: string;
    searchingWeb(query: string): string;
    applyingSkill(skill: string): string;
    aSkill: string;
    updatingTasks: string;
    listingSources: string;
    extractingText(source: string): string;
    downloading(url: string): string;
    requestingFile(description: string): string;
    retiringSource(source: string): string;
    knowledgeIndex: string;
    knowledgeSearch(query: string): string;
    knowledgeRead(page: string): string;
    knowledgeCreate(page: string): string;
    knowledgeEdit(page: string): string;
    knowledgeRewrite(page: string): string;
    knowledgeSupersede(page: string): string;
    knowledgeRetire(page: string): string;
    knowledgeLog: string;
    knowledgeCheck: string;
    askingHuman(question: string): string;
    presentingPlan: string;
  };

  // Claude authentication.
  auth: {
    noToken: string;
    noTokenDetail: string;
    generateQuestion: string;
    cantStart: string;
    generatingHeading: string;
    browserWillOpen: string;
    generated: string;
  };
}

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many);

export const en: Messages = {
  thinking: "Thinking…",
  escToInterrupt: "esc to interrupt",
  workedFor: (seconds) => `Worked for ${seconds}s`,
  turns: (count) => `${count} ${plural(count, "turn", "turns")}`,
  tokens: (input, output) => `${input} in / ${output} out`,
  context: (percent) => `context ${percent}%`,
  mode: (mode) => mode,
  switchModeKey: "shift+tab",
  modeLocked: (mode) => (mode ? `(${mode} mode can't be switched during the session)` : "(the mode can't be switched during the session)"),
  linesBelow: (count) => `↓ ${count} more ${plural(count, "line", "lines")} (Ctrl+End)`,
  copiedCharacters: (count) => `copied ${count} ${plural(count, "character", "characters")}`,

  queued: (line) => `queued: ${line}`,
  interrupted: "(interrupted)",
  copiedReply: (characters) => `(copied the last reply: ${characters} characters)`,
  nothingToCopy: "(nothing to copy yet)",
  unknownCommand: (command) => `Unknown command: /${command}`,
  mcpFailed: (servers) => `Some MCP servers failed to connect: ${servers}`,

  resumeTitle: "Resume a conversation",
  resumeHint: "↑/↓ choose · Enter resume · Esc cancel",
  resumeQuestion: "Number of the conversation to resume (Enter to cancel): ",
  noEarlierRuns: "(no earlier conversations to resume)",
  currentRun: "(this one)",
  resumed: (date) => `(resumed the conversation of ${date})`,

  suggestionKey: "tab",
  reverseSearch: (query) => `(reverse-i-search)'${query}': `,
  pastedText: (id, extraLines) => `[Pasted text #${id} +${extraLines} ${plural(extraLines, "line", "lines")}]`,
  shortcuts: [
    "Enter send  ·  \\ + Enter or Ctrl+J new line  ·  Tab complete or take the suggestion",
    "↑/↓ history  ·  Ctrl+R search history  ·  ↑ on an empty prompt edits the last queued message",
    "Ctrl+W delete word  ·  Ctrl+K to line end  ·  Ctrl+U clear  ·  Ctrl+←/→ move by word",
    "@ mention a file  ·  /copy copy the last reply  ·  Shift+Tab switch mode  ·  Ctrl+O unfold tool calls",
    "Esc interrupt  ·  Ctrl+C interrupt or exit  ·  PgUp/PgDn or wheel scroll  ·  Ctrl+End bottom",
    "Drag to select, right-click to copy (full screen)",
    "/resume resume an earlier conversation  ·  --continue on the command line resumes the latest one",
    "/plan plan mode on or off: the agent only reads and plans until you leave it",
  ],

  moreLines: (count) => `… (${count} more lines)`,
  proceed: "Do you want to proceed?",
  yes: "Yes",
  no: "No",
  stop: "Stop",
  doneContinue: "Done, continue",
  approved: "✔ Approved",
  rejected: "✘ Rejected",
  stopped: "■ Stopped",
  done: "✔ Done",
  answeredByFile: "(answered through the response file)",
  terminalQuestion: "Allow this to continue? [Y/n/q] ",
  proposedAction: "Proposed action",
  toolLine: (tool) => `Tool: ${tool}`,
  parametersLine: (parameters) => `Parameters: ${parameters}`,
  approvalTitle: "Human confirmation required before publishing",
  summaryLine: (summary) => `Summary: ${summary}`,
  noAnswer: "(no answer)",
  textAnswerHint: "type the answer",
  textAnswerKeys: "Enter to send · Esc for no answer",
  fileRequestTitle: "The agent asks for a file",
  fileRequestQuestion: "Path of the file (drag it here), or Enter if you don't have it: ",
  retireTitle: "Retire a source?",
  retirePageTitle: "Retire a knowledge base page?",
  choiceQuestion: (multiple) => (multiple ? "Numbers separated by commas, or your own answer: " : "Number, or your own answer: "),
  otherOption: "Other (type your own answer)",
  choiceKeys: (multiple) => (multiple ? "Space to mark · Enter to send" : "↑/↓ choose · Enter to send"),
  questionTitle: "The agent asks",
  planTitle: "The plan, for your approval",
  runPlan: "Run it",
  keepPlanning: "Keep planning",
  cancelPlan: "Cancel",
  planCommentQuestion: "What should change? (Enter to skip): ",
  retireLines: (source, why, reason, replacedBy) => [
    `Source: ${source}`,
    why === "wrong" ? "Why: it's wrong; its summary will be retired" : "Why: it's replaced; its summary will be marked superseded",
    `Reason: ${reason}`,
    ...(replacedBy ? [`Replaced by: ${replacedBy}`] : []),
    "It's moved to sources/.agent-kit/retired/, not deleted.",
  ],

  toolPhrases: {
    Read: ["read {n} file", "read {n} files"],
    Write: ["wrote {n} file", "wrote {n} files"],
    Edit: ["edited {n} file", "edited {n} files"],
    Glob: ["listed files", "listed files {n} times"],
    Grep: ["searched {n} time", "searched {n} times"],
    Bash: ["ran {n} shell command", "ran {n} shell commands"],
    WebSearch: ["searched the web", "searched the web {n} times"],
    WebFetch: ["fetched {n} page", "fetched {n} pages"],
    Skill: ["used {n} skill", "used {n} skills"],
    Agent: ["ran {n} subagent", "ran {n} subagents"],
    Task: ["ran {n} subagent", "ran {n} subagents"],
    mcp__time__current_time: ["checked the time", "checked the time {n} times"],
    mcp__time__date_math: ["calculated dates", "calculated dates {n} times"],
    mcp__sourceFiles__list_sources: ["listed the sources", "listed the sources {n} times"],
    mcp__sourceFiles__extract_text: ["read {n} document", "read {n} documents"],
    mcp__sourceFiles__save_to_sources: ["saved {n} source", "saved {n} sources"],
    mcp__sourceFiles__download_to_sources: ["downloaded {n} source", "downloaded {n} sources"],
    mcp__sourceFiles__request_file: ["asked for {n} file", "asked for {n} files"],
    mcp__sourceFiles__retire_source: ["retired {n} source", "retired {n} sources"],
    mcp__knowledge__knowledge_index: ["read the index", "read the index {n} times"],
    mcp__knowledge__knowledge_search: ["searched the knowledge base", "searched the knowledge base {n} times"],
    mcp__knowledge__knowledge_read: ["read {n} page", "read {n} pages"],
    mcp__knowledge__knowledge_create: ["created {n} page", "created {n} pages"],
    mcp__knowledge__knowledge_edit: ["edited {n} page", "edited {n} pages"],
    mcp__knowledge__knowledge_rewrite: ["rewrote {n} page", "rewrote {n} pages"],
    mcp__knowledge__knowledge_supersede: ["superseded {n} page", "superseded {n} pages"],
    mcp__knowledge__knowledge_retire: ["retired {n} page", "retired {n} pages"],
    mcp__knowledge__knowledge_log: ["updated the log", "updated the log {n} times"],
    mcp__knowledge__knowledge_check: ["checked the knowledge base", "checked the knowledge base {n} times"],
    mcp__approvals__ask_human: ["asked {n} question", "asked {n} questions"],
    mcp__approvals__present_plan: ["presented the plan", "presented the plan {n} times"],
  },
  otherTools: ["used {n} tool", "used {n} tools"],
  noOutput: "(no output)",
  error: "error",
  toolFailed: "Couldn't complete it",
  moreResultLines: (count) => `(+${count} ${plural(count, "line", "lines")})`,
  earlierCalls: (count) => `… ${count} earlier`,
  moreTodos: (count) => `… ${count} more ${plural(count, "task", "tasks")}`,
  labels: {
    askingApproval: (summary) => `Asking for human approval: ${summary}`,
    waitingManual: "Waiting for a human to intervene manually",
    savingToSources: (destination) => `Saving a file to sources/${destination}`,
    checkingTime: "Checking the date and time",
    calculatingDates: "Calculating dates",
    reading: (file) => `Reading ${file}`,
    writing: (file) => `Writing to ${file}`,
    editing: (file) => `Editing ${file}`,
    aFile: "a file",
    findingFiles: (pattern) => `Searching for files matching "${pattern}"`,
    searchingContents: (pattern) => `Searching file contents for "${pattern}"`,
    running: (command) => `Running "${command}"`,
    delegating: (subagent) => `Delegating to "${subagent}"`,
    delegatingTask: (subagent, description) => `Delegating to "${subagent}": ${description}`,
    aSubagent: "a subagent",
    fetching: (url) => `Fetching ${url}`,
    aPage: "a page",
    searchingWeb: (query) => `Searching the web for "${query}"`,
    applyingSkill: (skill) => `Applying the "${skill}" skill`,
    aSkill: "a skill",
    updatingTasks: "Updating the task list",
    listingSources: "Listing the sources",
    extractingText: (source) => `Reading ${source}`,
    downloading: (url) => `Downloading ${url} to the sources`,
    requestingFile: (description) => `Asking for a file: ${description}`,
    retiringSource: (source) => `Retiring the source ${source}`,
    knowledgeIndex: "Reading the knowledge base's index",
    knowledgeSearch: (query) => `Searching the knowledge base for "${query}"`,
    knowledgeRead: (page) => `Reading ${page}`,
    knowledgeCreate: (page) => `Creating ${page}`,
    knowledgeEdit: (page) => `Editing ${page}`,
    knowledgeRewrite: (page) => `Rewriting ${page}`,
    knowledgeSupersede: (page) => `Marking ${page} superseded`,
    knowledgeRetire: (page) => `Retiring ${page}`,
    knowledgeLog: "Updating the knowledge base's log",
    knowledgeCheck: "Checking the knowledge base",
    askingHuman: (question) => `Asking: ${question}`,
    presentingPlan: "Presenting the plan",
  },

  auth: {
    noToken: "No Claude authentication token was found",
    noTokenDetail: "(neither the CLAUDE_CODE_OAUTH_TOKEN environment variable, nor one passed in).",
    generateQuestion: 'Generate one now with "claude setup-token" (requires a Claude Pro/Max subscription)?',
    cantStart: "The agent can't start without a token. Set CLAUDE_CODE_OAUTH_TOKEN by hand (or run this again and accept generating it) and try again.",
    generatingHeading: "=== Generating a Claude authentication token ===",
    browserWillOpen: "A browser will open to log in; follow the instructions the command itself prints below.",
    generated: "Token generated for this run. Save it yourself (e.g. CLAUDE_CODE_OAUTH_TOKEN in your shell profile) to skip this next time.",
  },
};

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

  // Tool calls: folded groups, results and friendly labels.
  toolPhrases: Record<string, ToolPhrase>;
  otherTools: ToolPhrase;
  noOutput: string;
  error: string;
  moreResultLines(count: number): string;
  earlierCalls(count: number): string;
  labels: {
    askingApproval(summary: string): string;
    waitingManual: string;
    savingToSources(destination: string): string;
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
  },
  otherTools: ["used {n} tool", "used {n} tools"],
  noOutput: "(no output)",
  error: "error",
  moreResultLines: (count) => `(+${count} ${plural(count, "line", "lines")})`,
  earlierCalls: (count) => `… ${count} earlier`,
  labels: {
    askingApproval: (summary) => `Asking for human approval: ${summary}`,
    waitingManual: "Waiting for a human to intervene manually",
    savingToSources: (destination) => `Saving a file to sources/${destination}`,
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

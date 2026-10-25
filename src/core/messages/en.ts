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
  /** The session's input tokens: new ones, and those read again from the cache (if any). */
  tokens(input: string, output: string, cached?: string): string;
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
  /** What the chat's own commands do, for a view that lists them. */
  commandResume: string;
  commandPlan: string;
  commandExtensions: string;
  /** /extensions (#37): what the session runs with, what's off and why, and enabling or disabling one. */
  extensionsRunning(names: string): string;
  extensionsNone: string;
  extensionOff(name: string, reason: string): string;
  /** Before an active extension's capabilities (#62), one per line after it. */
  extensionCan(name: string): string;
  /** A capability's tools its server doesn't offer in this session. */
  capabilityToolsMissing(tools: string): string;
  /** A capability that isn't available on this computer (#63), with why (in English, as every reason). */
  capabilityUnavailable(label: string, reason: string): string;
  extensionsInstalled: string;
  /** An installed extension turned off or on in the running session (#49). */
  extensionSwitched(name: string, enabled: boolean): string;
  extensionToggled(name: string, enabled: boolean): string;
  extensionNotInstalled(name: string): string;
  extensionsUsage: string;
  extensionsCantReopen: string;
  /** An installed extension's options in the chat (#55). */
  extensionOptions(name: string): string;
  extensionNoOptions(name: string): string;
  optionNotSet: string;
  optionSecretSet: string;
  optionDefault: string;
  optionRequired: string;
  optionSensitiveInChat(key: string, name: string): string;
  extensionOptionsSaved(name: string): string;
  extensionRestarted(name: string): string;
  extensionReconfiguredReopen(name: string): string;
  /** The catalog in the chat (#56). */
  extensionsNoMatch: string;
  extensionIsInstalled: string;
  extensionUpdateAvailable(installed: string): string;
  extensionInstalled(name: string): string;
  /** After installing: a program it needs that this computer lacks (#63); `what` is the reason, in English. */
  extensionLacks(name: string, what: string): string;
  /** After installing one with remote servers (#61): the hosts it talks to. */
  extensionTalksTo(name: string, hosts: string): string;
  /** In /extensions: a running extension whose remote server needs the person to sign in. */
  extensionNeedsSignIn(name: string): string;
  /** The link to sign in to an extension's remote server. */
  /** Before the sign-in link, on its own line next (#72): when the browser couldn't be opened, and when it was. */
  extensionSignInOpen(name: string): string;
  extensionSignInOpened(name: string): string;
  /** How to finish signing in from another computer. */
  extensionSignInPaste(name: string): string;
  extensionSignedIn(name: string): string;
  /** Signing in hasn't finished after a while. */
  extensionSignInWaiting(name: string): string;
  extensionAlreadySignedIn(name: string): string;
  extensionSignInUnavailable(name: string): string;
  extensionSignedOut(name: string): string;
  /** Before a call to a remote MCP server, when the agent asks first (#70): where it goes. */
  remoteCallTitle(destination: string): string;
  /** Guided mode's question before an installed extension's tool that changes things (#74): its title. */
  guidedTitle(extension: string): string;
  /** Its answers (#76): this call, this session, always, no, never. */
  confirmAnswers: { yes: string; session: string; always: string; no: string; never: string };
  /** In /extensions config: whether its tools ask in guided mode, before the answers kept. */
  extensionConfirmOn(name: string): string;
  extensionConfirmOff(name: string): string;
  /** A kept answer about one of its tools. */
  confirmKept(tool: string, answer: "always" | "never"): string;
  confirmNoneKept: string;
  /** In /extensions: the claude.ai connectors let in (#70). */
  connectorsAllowed(names: string): string;
  /** In /extensions: the project's .mcp.json servers left out because an extension's duplicates them (#83). */
  projectServersDuplicated(file: string, servers: string): string;
  /** In /extensions: connectors the agent asked for that the account hasn't. */
  connectorsMissing(names: string): string;
  extensionUpdated(name: string, from: string, to: string): string;
  extensionsUpToDate: string;
  extensionRemoved(name: string, withData: boolean): string;
  extensionConfirm(spec: string, marketplace: string): string;
  extensionsBusy: string;
  extensionsReloaded: string;
  /** MCP elicitation (#58): a server asking the person for something. */
  elicitTitle(server: string): string;
  elicitQuestion: string;
  elicitAgain: string;
  elicitNotANumber(text: string): string;
  elicitOutOfRange(minimum?: number, maximum?: number): string;
  elicitUrlTitle(server: string): string;
  elicitUrlQuestion: string;
  /** A workspace's extensions to trust (#57). */
  trustTitle: string;
  trustBody: string;
  trustQuestion: string;
  trustDeclined: string;
  trustGiven(names: string): string;
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
  retireLines(source: string, why: "wrong" | "replaced", reason: string, replacedBy: string | undefined, folder: string): string[];

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
  tokens: (input, output, cached) => `${input} in${cached ? ` (+${cached} cached)` : ""} / ${output} out`,
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
  commandResume: "Pick an earlier conversation to go on with",
  commandPlan: "Into plan mode, or back",
  commandExtensions: "What runs, what's off and why; turn one on or off",
  extensionsRunning: (names) => `Running with: ${names}`,
  extensionsNone: "(no extensions)",
  extensionOff: (name, reason) => `${name} is off: it ${reason}`,
  extensionCan: (name) => `What ${name} lets your agent do:`,
  capabilityToolsMissing: (tools) => `(its server doesn't offer ${tools})`,
  capabilityUnavailable: (label, reason) => `${label}: not on this computer, it ${reason}`,
  extensionsInstalled: "Installed:",
  extensionSwitched: (name, enabled) => `(${name} ${enabled ? "enabled" : "disabled"}, in this same session)`,
  extensionToggled: (name, enabled) => `(${name} ${enabled ? "enabled" : "disabled"}: the session reopens, with the same conversation)`,
  extensionNotInstalled: (name) => `(${name} isn't installed: /extensions lists them)`,
  extensionsUsage: "(usage: /extensions, enable|disable <name>, config <name> [key=value… | confirm=on|off|reset], search [words], install <name>, update [name], remove <name> [--delete-data], reload, trust, sign-in <name> [callback URL], sign-out <name>)",
  extensionsCantReopen: "(this chat can't reopen its session: enable or disable it from the terminal, and start again)",
  extensionOptions: (name) => `${name}'s options:`,
  extensionNoOptions: (name) => `(${name} has no options)`,
  optionNotSet: "(not set)",
  optionSecretSet: "(set, hidden)",
  optionDefault: "(default)",
  optionRequired: "required",
  optionSensitiveInChat: (key, name) => `(${key} is a secret: what's typed in the chat is kept in its history, so set it from the terminal: extension config ${name} ${key})`,
  extensionOptionsSaved: (name) => `(${name}'s options saved: they apply when its server starts again)`,
  extensionRestarted: (name) => `(${name}'s options saved, and its server restarted with them, in this same session)`,
  extensionReconfiguredReopen: (name) => `(${name}'s options saved: the session reopens, with the same conversation)`,
  extensionsNoMatch: "(no extension matches: /extensions search with other words, or none to list them all)",
  extensionIsInstalled: "(installed)",
  extensionUpdateAvailable: (installed) => `(installed: ${installed}, update available)`,
  extensionInstalled: (name) => `(${name} installed: it's there in a new conversation, or now with /extensions reload, keeping this one)`,
  extensionLacks: (name, what) => `(${name} ${what})`,
  extensionTalksTo: (name, hosts) => `(${name} talks to ${hosts}: what your agent sends there leaves this computer)`,
  extensionNeedsSignIn: (name) => `${name} needs you to sign in: /extensions sign-in ${name}`,
  extensionSignInOpen: (name) => `(to sign in to ${name}, open this link; when you're done there, it's connected here:)`,
  extensionSignInOpened: (name) => `(signing in to ${name} in your browser; when you're done there, it's connected here. The link, for another browser:)`,
  extensionSignInPaste: (name) => `(on another computer? Paste the address the browser ends on: /extensions sign-in ${name} <that address>)`,
  extensionSignedIn: (name) => `(signed in to ${name}: its tools are ready)`,
  extensionSignInWaiting: (name) => `(still waiting for the sign-in to ${name}; /extensions sign-in ${name} gives the link again)`,
  extensionAlreadySignedIn: (name) => `(${name} is already signed in)`,
  extensionSignInUnavailable: (name) => `(${name} can't be signed in to here: it isn't running in this session, has no remote server, or this agent's SDK can't sign in)`,
  extensionSignedOut: (name) => `(signed out of ${name}: it will ask you to sign in again)`,
  remoteCallTitle: (destination) => `Send this to ${destination}? It leaves this computer`,
  guidedTitle: (extension) => `Let ${extension} do this?`,
  confirmAnswers: { yes: "Yes", session: "Yes, for this session", always: "Yes, always", no: "No", never: "No, never" },
  extensionConfirmOn: (name) => `In guided mode, ${name}'s tools that change things ask first (confirm=off runs them without asking):`,
  extensionConfirmOff: (name) => `In guided mode, ${name}'s tools run without asking (confirm=on asks again).`,
  confirmKept: (tool, answer) => `  ${tool}: ${answer === "always" ? "always yes" : "never"}`,
  confirmNoneKept: "  (no kept answers; confirm=reset forgets them)",
  connectorsAllowed: (names) => `claude.ai connectors: ${names}`,
  projectServersDuplicated: (file, servers) => `${file} also declares ${servers}: the extensions' are used`,
  connectorsMissing: (names) => `Not in your claude.ai account: ${names} (connect it on claude.ai, then reopen the session)`,
  extensionUpdated: (name, from, to) => `(${name} updated, ${from} → ${to}: it's there in a new conversation, or now with /extensions reload)`,
  extensionsUpToDate: "(every extension from a marketplace is up to date)",
  extensionRemoved: (name, withData) => `(${name} removed${withData ? ", with its data" : "; its data is kept for a reinstall"})`,
  extensionConfirm: (spec, marketplace) => `(${spec} comes from ${marketplace}, not this agent's own marketplace: it would run on this computer with your permissions. /extensions install ${spec} --yes installs it)`,
  extensionsBusy: "(after this turn: the agent is working)",
  extensionsReloaded: "(the session reopens with the extensions installed now, keeping the conversation)",
  elicitTitle: (server) => `${server} asks you`,
  elicitQuestion: "Answer it? (Enter/y: answer, n: decline, q: cancel) ",
  elicitAgain: "That isn't a valid value: try again, or leave it empty.",
  elicitNotANumber: (text) => `"${text}" isn't a number`,
  elicitOutOfRange: (minimum, maximum) => `between ${minimum ?? "…"} and ${maximum ?? "…"}`,
  elicitUrlTitle: (server) => `${server} asks you to open a page`,
  elicitUrlQuestion: "Open it yourself, then Enter when you're done (n: decline) ",
  trustTitle: "This workspace brings extensions",
  trustBody: "They run code on this computer with your permissions. Trust them only if you trust where this workspace came from:",
  trustQuestion: "Trust them and run them? (y/N) ",
  trustDeclined: "(they stay off: /extensions trust trusts them later)",
  trustGiven: (names) => `(${names}: trusted in this workspace, as they are now; another version asks again)`,
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
  retireLines: (source, why, reason, replacedBy, folder) => [
    `Source: ${source}`,
    why === "wrong" ? "Why: it's wrong" : "Why: it's replaced by a better one",
    `Reason: ${reason}`,
    ...(replacedBy ? [`Replaced by: ${replacedBy}`] : []),
    `It's moved to ${folder}.agent-kit/retired/, not deleted.`,
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

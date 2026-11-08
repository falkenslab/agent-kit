import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import type { AgentIdentity } from "../core/agentSpec.js";
import { getInteractionPort, setInteractionPort } from "../core/interaction.js";
import { MCP_DEPTH_ENV, mcpDepth } from "../core/mcpDepth.js";
import { createRunFolder, readRunSession, type RunFolder } from "../core/runs.js";
import { createChatController, type ChatController, type ChatSettings } from "../chat/chatController.js";
import { openSession, type OpenedSession, type SessionOpener } from "../chat/runs.js";

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_PROGRESS_INTERVAL_MS = 15_000;
/** Sessions kept open between turns: each is a process. One closed is opened again by its `session_id`. */
const MAX_OPEN_SESSIONS = 4;

/** What `serveMcp()` needs besides how to open a session. */
export interface ServeMcpSettings {
  /** Where the runs are: a `session_id` names one of them. */
  runsDir: string;
  /** Who the agent is: the server's name and version, and what the `ask` tool says it does. */
  identity: AgentIdentity;
  /** How many agents served over MCP may chain before `ask` refuses (default 3). */
  maxDepth?: number;
  /** How often a turn reports it's still running, so a client's tool timeout doesn't cut it (default 15 s). */
  progressIntervalMs?: number;
  /** The transport: stdio by default. */
  transport?: Transport;
  /** Runs the agent: the SDK's by default; another for tests. */
  runQuery?: ChatSettings["runQuery"];
}

/**
 * Serves an agent as an MCP server (ADR-027), so another agent (Claude Code, Claude Desktop,
 * another one on the kit) drives it whole: its prompt, extensions and guardrails stay in its own
 * process. One tool, `ask`; a `session_id` names a run, so a conversation goes on across calls.
 *
 * Autonomous mode only: nobody can answer a checkpoint here, and the calling model must never
 * answer for the human. Resolves when the client disconnects.
 */
export async function serveMcp(opener: SessionOpener, settings: ServeMcpSettings): Promise<void> {
  const { runsDir, identity } = settings;
  const maxDepth = settings.maxDepth ?? DEFAULT_MAX_DEPTH;
  const interval = settings.progressIntervalMs ?? DEFAULT_PROGRESS_INTERVAL_MS;
  const depth = mcpDepth();

  // What this function takes over in the process, given back when it ends. Over stdio, stdout
  // belongs to the transport: whatever else prints goes to stderr.
  const previousDepth = process.env[MCP_DEPTH_ENV];
  const previousPort = getInteractionPort();
  const { log, info, debug } = console;
  const stdio = !settings.transport;
  process.env[MCP_DEPTH_ENV] = String(depth + 1);
  setInteractionPort(null); // the response file alone: no keyboard here
  if (stdio) console.log = console.info = console.debug = console.error;
  const restore = (): void => {
    if (previousDepth === undefined) delete process.env[MCP_DEPTH_ENV];
    else process.env[MCP_DEPTH_ENV] = previousDepth;
    setInteractionPort(previousPort);
    if (stdio) Object.assign(console, { log, info, debug });
  };

  async function open(run: RunFolder): Promise<OpenedSession> {
    const opened = await openSession(opener, run);
    if (opened.modeControl?.mode !== "autonomous") throw new Error(`serveMcp() serves autonomous mode only, and this session opened in ${opened.modeControl?.mode ?? "no known mode"}: nobody can answer a checkpoint over MCP.`);
    return opened;
  }

  // Opened at the start to refuse a wrong mode at once; the first new conversation uses it.
  let spare: OpenedSession | null;
  try {
    spare = await open(await createRunFolder(runsDir));
  } catch (error) {
    restore();
    throw error;
  }

  const sessions = new Map<string, ChatController>();
  const busy = new Set<string>();

  async function controllerOf(opened: OpenedSession): Promise<ChatController> {
    return await createChatController(opened.options, {
      sessionLogPath: path.join(opened.run.dir, "session.log"),
      promptSuggestions: false,
      ...(opened.modeControl ? { modeControl: opened.modeControl } : {}),
      ...(opened.toolLabels ? { toolLabels: opened.toolLabels } : {}),
      ...(settings.runQuery ? { runQuery: settings.runQuery } : {}),
    });
  }

  /** The session a `session_id` names, opened again if it isn't: only a run of this agent's. */
  async function reopen(id: string): Promise<ChatController> {
    const running = sessions.get(id);
    if (running) return running;
    const dir = path.join(runsDir, id);
    const sessionId = /^[\w-]+$/.test(id) ? await readRunSession(dir) : null;
    if (!sessionId) throw new Error(`Unknown session_id: ${id}.`);
    return await controllerOf(await open({ dir, sessionId }));
  }

  function closeIdleSessions(): void {
    for (const [id, controller] of sessions) {
      if (sessions.size <= MAX_OPEN_SESSIONS) return;
      if (busy.has(id)) continue;
      controller.close();
      sessions.delete(id);
    }
  }

  const server = new McpServer({ name: identity.name, version: identity.version ?? "0.0.0" });
  server.registerTool(
    "ask",
    {
      description: `Ask ${identity.name}${identity.description ? `, ${identity.description},` : ""} to do something, and get its reply. Without session_id it starts a new conversation; with the session_id of an earlier reply it goes on with that one.`,
      inputSchema: { message: z.string().min(1).describe("What to ask, in plain words."), session_id: z.string().optional().describe("The session_id of an earlier reply, to go on with that conversation.") },
    },
    async ({ message, session_id: requested }, extra) => {
      if (depth >= maxDepth) throw new Error(`Too many agents chained over MCP (the limit is ${maxDepth}).`);
      if (requested !== undefined && busy.has(requested)) throw new Error(`Session ${requested} is busy with another turn; wait for it to end.`);
      if (requested !== undefined) busy.add(requested);
      let id = requested;
      try {
        let controller: ChatController;
        if (requested !== undefined) controller = await reopen(requested);
        else {
          const opened = spare ?? (await open(await createRunFolder(runsDir)));
          spare = null;
          id = path.basename(opened.run.dir);
          busy.add(id);
          controller = await controllerOf(opened);
        }
        // Last in the map: the least recently used are closed first.
        sessions.delete(id!);
        sessions.set(id!, controller);

        const token = extra._meta?.progressToken;
        let progress = 0;
        let activity: string | undefined;
        const report = (): void => {
          if (token === undefined) return;
          void extra.sendNotification({ method: "notifications/progress", params: { progressToken: token, progress: ++progress, ...(activity ? { message: activity } : {}) } }).catch(() => undefined);
        };
        let failure: string | null = null;
        const stopListening = controller.onEvent((chat) => {
          if (chat.type !== "agent") return;
          const event = chat.event;
          if (event.type === "action" || event.type === "subagent-action") {
            activity = controller.formatAction(event.toolName, event.input);
            report();
          } else if (event.type === "turn-end" && event.failed) failure = event.errorText || "The turn failed.";
        });
        const heartbeat = setInterval(report, interval);
        const interrupt = (): void => controller.interrupt();
        extra.signal.addEventListener("abort", interrupt, { once: true });
        try {
          await controller.turn(message);
        } finally {
          clearInterval(heartbeat);
          stopListening();
          extra.signal.removeEventListener("abort", interrupt);
        }
        if (failure) throw new Error(failure);
        return { content: [{ type: "text" as const, text: controller.lastReply() }, { type: "text" as const, text: `session_id: ${id}` }] };
      } finally {
        if (id !== undefined) busy.delete(id);
        closeIdleSessions();
      }
    },
  );

  return await new Promise<void>((resolve, reject) => {
    server.server.onclose = () => {
      for (const controller of sessions.values()) controller.close();
      sessions.clear();
      restore();
      resolve();
    };
    const transport = settings.transport ?? new StdioServerTransport();
    // The stdio transport doesn't see its client leave: stdin ending is how it does.
    if (stdio) process.stdin.once("end", () => void server.close());
    server.connect(transport).catch((error: unknown) => {
      restore();
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

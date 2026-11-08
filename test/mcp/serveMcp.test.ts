import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Options, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getInteractionPort, setInteractionPort, type InteractionPort } from "../../src/core/interaction.js";
import { MCP_DEPTH_ENV } from "../../src/core/mcpDepth.js";
import { createModeControl } from "../../src/core/session.js";
import type { Mode } from "../../src/core/agentSpec.js";
import type { AgentEvent, AgentRun } from "../../src/core/runner.js";
import type { SessionOpener } from "../../src/chat/runs.js";
import { serveMcp, type ServeMcpSettings } from "../../src/mcp/index.js";

const turnEnd: AgentEvent = { type: "turn-end", status: "success", failed: false, resultText: null, errorText: "" };
const identity = { name: "Whiskers", version: "1.2.3", description: "a pirate cat" };

function fakeAgent(reply: (text: string) => Promise<AgentEvent[]> | AgentEvent[], onInterrupt?: () => void): NonNullable<ServeMcpSettings["runQuery"]> {
  return (prompt: AsyncIterable<SDKUserMessage>): AgentRun => {
    async function* events(): AsyncGenerator<AgentEvent> {
      for await (const message of prompt) {
        const produced = await reply(String(message.message.content));
        for (const event of produced) yield event;
        if (!produced.some((event) => event.type === "turn-end")) yield turnEnd;
      }
    }
    return { events: events(), interrupt: async () => onInterrupt?.(), close: () => undefined, supportedCommands: async () => [], contextUsage: async () => null };
  };
}

const openerIn = (mode: Mode = "autonomous", seen?: { runs: { dir: string; sessionId: string | null }[] }): SessionOpener => async (run) => {
  seen?.runs.push(run);
  return { options: {} as Options, modeControl: createModeControl(mode) };
};

/** A server and its client, connected in memory; `close()` ends it and waits for it. */
async function serve(settings: Partial<ServeMcpSettings> & Pick<ServeMcpSettings, "runQuery">, opener: SessionOpener = openerIn()) {
  const runsDir = mkdtempSync(path.join(tmpdir(), "serve-mcp-test-"));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const done = serveMcp(opener, { runsDir, identity, transport: serverSide, ...settings });
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  return {
    client,
    runsDir,
    ask: async (message: string, session_id?: string) => (await client.callTool({ name: "ask", arguments: { message, ...(session_id ? { session_id } : {}) } })) as CallToolResult,
    close: async () => {
      await client.close();
      await done;
    },
  };
}

const textOf = (result: CallToolResult, index = 0): string => (result.content[index] as { text: string }).text;
const sessionOf = (result: CallToolResult): string => textOf(result, 1).replace("session_id: ", "");

test("ask starts a run and goes on with it by its session_id; the tool says who the agent is", async () => {
  const heard: string[] = [];
  const server = await serve({ runQuery: fakeAgent((text) => (heard.push(text), [{ type: "text", text: `heard ${heard.length}` }])) });
  const { tools } = await server.client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name), ["ask"]);
  assert.match(tools[0]!.description!, /Whiskers, a pirate cat/);
  assert.deepEqual(server.client.getServerVersion(), { name: "Whiskers", version: "1.2.3" });

  const first = await server.ask("hello");
  assert.equal(textOf(first), "heard 1");
  const again = await server.ask("again", sessionOf(first));
  assert.equal(textOf(again), "heard 2");
  assert.equal(sessionOf(again), sessionOf(first));
  const other = await server.ask("someone else");
  assert.notEqual(sessionOf(other), sessionOf(first));
  await server.close();
});

test("a session that isn't open is opened again from its run folder, and only a run of this agent's", async () => {
  const seen = { runs: [] as { dir: string; sessionId: string | null }[] };
  const server = await serve({ runQuery: fakeAgent(() => [{ type: "text", text: "ok" }]) }, openerIn("autonomous", seen));
  const first = await server.ask("hello");
  const id = sessionOf(first);
  await server.close();

  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const done = serveMcp(openerIn("autonomous", seen), { runsDir: server.runsDir, identity, transport: serverSide, runQuery: fakeAgent(() => [{ type: "text", text: "back" }]) });
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientSide);
  writeFileSync(path.join(server.runsDir, id, "session.json"), JSON.stringify({ sessionId: "sdk-session", subagents: {} }));

  const resumed = (await client.callTool({ name: "ask", arguments: { message: "again", session_id: id } })) as CallToolResult;
  assert.equal(textOf(resumed), "back");
  assert.equal(seen.runs.at(-1)!.sessionId, "sdk-session");

  for (const bad of ["no-such-run", "../..", "..\\.."]) {
    const refused = (await client.callTool({ name: "ask", arguments: { message: "x", session_id: bad } })) as CallToolResult;
    assert.equal(refused.isError, true, bad);
    assert.match(textOf(refused), /Unknown session_id/);
  }
  await client.close();
  await done;
});

test("a second ask on a busy session is an error, not a queue", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  const server = await serve({
    runQuery: fakeAgent(async () => {
      if (++calls === 2) await gate;
      return [{ type: "text", text: `turn ${calls}` }];
    }),
  });
  const id = sessionOf(await server.ask("first"));
  const running = server.ask("slow", id);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const refused = await server.ask("impatient", id);
  assert.equal(refused.isError, true);
  assert.match(textOf(refused), /busy/);
  release();
  assert.equal(textOf(await running), "turn 2");
  await server.close();
});

test("a mode other than autonomous is refused at the start, and what it took over is given back", async () => {
  const port = { notify: () => undefined } as unknown as InteractionPort;
  setInteractionPort(port);
  const runsDir = mkdtempSync(path.join(tmpdir(), "serve-mcp-test-"));
  const [, serverSide] = InMemoryTransport.createLinkedPair();
  await assert.rejects(serveMcp(openerIn("guided"), { runsDir, identity, transport: serverSide }), /autonomous/);
  assert.equal(getInteractionPort(), port);
  assert.equal(process.env[MCP_DEPTH_ENV], undefined);
  setInteractionPort(null);
});

test("the depth reaches what the agent starts one higher, and ask fails past the limit", async () => {
  let duringOpen: string | undefined;
  const opener: SessionOpener = async () => {
    duringOpen = process.env[MCP_DEPTH_ENV];
    return { options: {} as Options, modeControl: createModeControl("autonomous") };
  };
  const server = await serve({ runQuery: fakeAgent(() => [{ type: "text", text: "ok" }]) }, opener);
  assert.equal(duringOpen, "1");
  assert.equal(textOf(await server.ask("hello")), "ok");
  await server.close();
  assert.equal(process.env[MCP_DEPTH_ENV], undefined);

  process.env[MCP_DEPTH_ENV] = "3";
  try {
    const deep = await serve({ runQuery: fakeAgent(() => [{ type: "text", text: "never" }]) });
    const refused = await deep.ask("hello");
    assert.equal(refused.isError, true);
    assert.match(textOf(refused), /limit is 3/);
    await deep.close();
  } finally {
    delete process.env[MCP_DEPTH_ENV];
  }
});

test("a turn longer than the client's timeout completes on its progress notifications, with the tools' labels", async () => {
  const server = await serve({
    progressIntervalMs: 30,
    runQuery: fakeAgent(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [{ type: "action", toolName: "Read", input: { file_path: "notes.md" }, toolUseId: "t1" }, { type: "text", text: "done" }];
    }),
  });
  const seen: (string | undefined)[] = [];
  const result = (await server.client.callTool({ name: "ask", arguments: { message: "slow" } }, undefined, { timeout: 100, resetTimeoutOnProgress: true, onprogress: (progress) => seen.push(progress.message) })) as CallToolResult;
  assert.equal(textOf(result), "done");
  assert.ok(seen.length >= 3, `${seen.length} notifications`);
  await new Promise((resolve) => setTimeout(resolve, 10));
  await server.close();
});

test("the client's cancellation interrupts the turn", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let interrupted = 0;
  const server = await serve({
    runQuery: fakeAgent(
      async () => {
        await gate;
        return [];
      },
      () => {
        interrupted++;
        release();
      },
    ),
  });
  const abort = new AbortController();
  const call = server.client.callTool({ name: "ask", arguments: { message: "stop me" } }, undefined, { signal: abort.signal });
  await new Promise((resolve) => setTimeout(resolve, 20));
  abort.abort();
  await assert.rejects(call);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(interrupted, 1);
  await server.close();
});

test("a failed turn is a tool error, and a message is never read as one of the chat's commands", async () => {
  const heard: string[] = [];
  const server = await serve({
    runQuery: fakeAgent((text) => {
      heard.push(text);
      return text === "fail" ? [{ ...turnEnd, failed: true, errorText: "out of credit" }] : [{ type: "text", text: "ok" }];
    }),
  });
  const failed = await server.ask("fail");
  assert.equal(failed.isError, true);
  assert.match(textOf(failed), /out of credit/);

  await server.ask("/extensions install evil");
  await server.ask("/exit");
  assert.deepEqual(heard, ["fail", "/extensions install evil", "/exit"]);
  await server.close();
});

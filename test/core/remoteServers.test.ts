import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import type { McpServerStatus } from "@anthropic-ai/claude-agent-sdk";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { addExtension, listInstalled, loadExternalExtensions, readExternalManifest, remoteHosts, remoteServerName, setExtensionOptions } from "../../src/core/externalExtensions.js";
import { createExtensionAuth, createExtensionRestart, type LiveExtension } from "../../src/core/liveExtensions.js";
import { buildSessionOptions, createInputQueue } from "../../src/core/session.js";
import { runQuery } from "../../src/core/runner.js";
import { chatExtensionsCommand } from "../../src/chat/extensions.js";
import { extensionCatalog } from "../../src/core/extensionCatalog.js";
import { addMarketplace } from "../../src/core/marketplaces.js";
import { buildCatalog } from "../../packages/agent-kit-catalog/agent-kit-catalog.mjs";
import type { AgentSpec, BaseSessionConfig } from "../../src/core/agentSpec.js";
import type { SessionLive } from "../../src/core/sessionFacts.js";
import { setLanguage } from "../../src/core/messages/index.js";

// Installed extensions' remote MCP servers (#61): over HTTP, their options in their URL and
// headers, a session name of their own, and signing in through the SDK's undocumented methods.

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "remote-servers-test-"));
const spec: AgentSpec<BaseSessionConfig> = { buildSystemPrompt: () => "P", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined, replyInLanguage: false };
const binary = path.resolve("node_modules", "@anthropic-ai", `claude-agent-sdk-${process.platform}-${process.arch}`, process.platform === "win32" ? "claude.exe" : "claude");

/** An extension named `name` with one remote server, `api`, at `url` (with `headers`), an option `site` and a secret `token`. */
function makeRemote(name: string, url: string, headers: Record<string, string> = { Authorization: "Bearer ${user_config.token}" }): string {
  const dir = path.join(temp(), name);
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({
      name,
      version: "1.0.0",
      description: "A remote service.",
      userConfig: { site: { type: "string", title: "Site", description: "Its site." }, token: { type: "string", title: "Token", description: "Its token.", sensitive: true } },
      metadata: { "agent-kit": { labels: { get_time: { en: { label: "Asking the time" } } } } },
    }),
  );
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ mcpServers: { api: { type: "http", url, ...(Object.keys(headers).length ? { headers } : {}) } } }));
  return dir;
}

test("a remote server is read from .mcp.json, must be https (http only on this computer), and installing says where it talks to", async () => {
  const manifest = await readExternalManifest(makeRemote("campus", "https://mcp.example.com/mcp?site=${user_config.site}"));
  assert.deepEqual(manifest.servers.api, { type: "http", url: "https://mcp.example.com/mcp?site=${user_config.site}", headers: { Authorization: "Bearer ${user_config.token}" } });
  assert.deepEqual(remoteHosts(manifest), ["mcp.example.com"]);
  const scope = path.join(temp(), "extensions");
  assert.deepEqual((await addExtension(makeRemote("campus", "https://mcp.example.com/mcp"), scope)).remote, ["mcp.example.com"]);
  assert.deepEqual((await addExtension(makeRemote("local", "http://127.0.0.1:9/mcp"), scope)).remote, ["127.0.0.1:9"]);
  await assert.rejects(addExtension(makeRemote("plain", "http://mcp.example.com/mcp"), scope), /a remote server must be https \(http only on localhost\)/);
  assert.equal(remoteServerName("campus", "api"), "campus-api");
});

test("a session takes a remote server with its options in its URL and headers, under a name of its own, its labels and read-only hints under that name", async () => {
  const projectDir = temp();
  const dirs = { agent: path.join(projectDir, "extensions") };
  await addExtension(makeRemote("campus", "https://mcp.example.com/mcp?site=${user_config.site}"), dirs.agent);
  const [installed] = await listInstalled(dirs);
  await setExtensionOptions(installed!, "campus", { site: "school", token: "s3cret" });
  const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec);
  assert.deepEqual((built.options.mcpServers as Record<string, unknown>)["campus-api"], { type: "http", url: "https://mcp.example.com/mcp?site=school", headers: { Authorization: "Bearer s3cret" } });
  assert.equal((built.options.mcpServers as Record<string, unknown>).api, undefined);
  assert.equal(built.toolLabels["mcp__campus-api__get_time"]?.label({}), "Asking the time");
  assert.deepEqual(built.extensions.about.campus?.servers, ["campus-api"]);
  assert.deepEqual((await loadExternalExtensions(dirs)).off, []);
  // A header naming an option without a value isn't sent: `Bearer ` would turn the server's OAuth off.
  await setExtensionOptions(installed!, "campus", { token: undefined });
  const again = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec);
  assert.deepEqual((again.options.mcpServers as Record<string, unknown>)["campus-api"], { type: "http", url: "https://mcp.example.com/mcp?site=school" });
});

/** The live extension a session builds for `campus`, with its remote server. */
const live = (remoteServers: string[]): LiveExtension => ({
  name: "campus",
  installedDir: "",
  scopeDir: "",
  pluginMount: "",
  servers: remoteServers,
  readOnlyTools: [],
  toolLabels: {},
  agents: [],
  description: "",
  provides: [],
  capabilities: [],
  unavailable: [],
  remoteServers,
  help: [],
});

test("a remote extension's changed options take opening the session again: its servers aren't restarted", async () => {
  let reconnected = 0;
  const restart = createExtensionRestart([live(["campus-api"])], { readOnlyTools: [], allowedSubagentTypes: [], toolLabels: {}, status: {} as never, facts: {} as never, controls: () => ({ reconnectMcpServer: async () => void reconnected++ }) });
  assert.equal(await restart("campus"), false);
  assert.equal(reconnected, 0);
});

test("signing in gives the links of the servers that need it, finishes with a pasted callback and reconnects, and signs out", async () => {
  let status: McpServerStatus["status"] = "needs-auth";
  const calls: string[] = [];
  const controls: SessionLive = {
    mcpServerStatus: async () => [{ name: "campus-api", status } as McpServerStatus],
    mcpAuthenticate: async (server) => (calls.push(`authenticate ${server}`), { authUrl: "https://auth.example.com/authorize?x=1", requiresUserAction: true }),
    mcpSubmitOAuthCallbackUrl: async (server, url) => void calls.push(`submit ${server} ${url}`),
    reconnectMcpServer: async (server) => {
      calls.push(`reconnect ${server}`);
      status = "connected";
    },
    mcpClearAuth: async (server) => {
      calls.push(`clear ${server}`);
      status = "needs-auth";
    },
  };
  const auth = createExtensionAuth([live(["campus-api"])], { controls: () => controls });
  assert.deepEqual(await auth.needed(), ["campus"]);
  assert.deepEqual(await auth.signIn("campus"), { status: "open", links: [{ server: "campus-api", url: "https://auth.example.com/authorize?x=1" }] });
  assert.equal(await auth.connected("campus"), false);
  assert.deepEqual(await auth.signIn("campus", "http://localhost:1234/callback?code=c"), { status: "signed-in" });
  assert.deepEqual(calls.slice(1), ["submit campus-api http://localhost:1234/callback?code=c", "reconnect campus-api"]);
  assert.deepEqual(await auth.needed(), []);
  assert.deepEqual(await auth.signIn("campus"), { status: "signed-in" });
  assert.equal(await auth.signOut("campus"), true);
  assert.deepEqual(await auth.needed(), ["campus"]);
  // An SDK without the methods, an extension that isn't running, or one with no remote server.
  assert.deepEqual(await createExtensionAuth([live(["campus-api"])], { controls: () => ({ mcpServerStatus: controls.mcpServerStatus }) }).signIn("campus"), { status: "unavailable", reason: "unsupported" });
  assert.deepEqual(await auth.signIn("other"), { status: "unavailable", reason: "not-running" });
  assert.deepEqual(await createExtensionAuth([live([])], { controls: () => controls }).signIn("campus"), { status: "unavailable", reason: "not-remote" });
});

test("/extensions says who needs signing in, and sign-in and sign-out are the chat's to do", async () => {
  setLanguage("en");
  const status = {
    dirs: {},
    untrusted: [],
    installed: [],
    active: ["campus"],
    about: { campus: { description: "", provides: [], capabilities: [], unavailable: [], servers: ["campus-api"] } },
    inactive: [],
    serverStatus: async () => [{ name: "campus-api", status: "needs-auth" } as McpServerStatus],
  };
  const listed = await chatExtensionsCommand("/extensions", status, true);
  assert.ok(listed?.lines.includes("campus needs you to sign in: /extensions sign-in campus"), listed?.lines.join("\n"));
  assert.deepEqual((await chatExtensionsCommand("/extensions sign-in campus", status, true))?.action, { type: "sign-in", name: "campus" });
  assert.deepEqual((await chatExtensionsCommand("/extensions sign-in campus http://localhost:1/cb?code=1", status, true))?.action, { type: "sign-in", name: "campus", callbackUrl: "http://localhost:1/cb?code=1" });
  assert.deepEqual((await chatExtensionsCommand("/extensions sign-out campus", status, false))?.action, { type: "sign-out", name: "campus" });
});

test("the catalog and catalog.json say which hosts an extension talks to", async () => {
  const root = path.join(temp(), "harbor");
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(path.join(root, ".claude-plugin", "marketplace.json"), JSON.stringify({ name: "harbor", owner: { name: "Ada" }, plugins: [{ name: "campus", source: "./campus", version: "1.0.0" }] }));
  fs.cpSync(makeRemote("campus", "https://mcp.example.com/mcp"), path.join(root, "campus"), { recursive: true });
  const dirs = { agent: path.join(temp(), "extensions") };
  await addMarketplace(root, dirs.agent);
  assert.deepEqual((await extensionCatalog(dirs))[0]?.remote, ["mcp.example.com"]);
  assert.deepEqual((await buildCatalog(root, { repo: "ada/harbor" })).extensions[0]?.remote, ["mcp.example.com"]);
});

/** A local MCP server over streamable HTTP: `get_time` (read-only) and `delete_thing`. */
function mcpApp(): http.Server {
  return http.createServer(async (request, response) => {
    if (request.method !== "POST") return void response.writeHead(405).end();
    let body = "";
    for await (const chunk of request) body += chunk;
    const server = new McpServer({ name: "probe", version: "1.0.0" });
    server.registerTool("get_time", { description: "The time.", inputSchema: {}, annotations: { readOnlyHint: true } }, async () => ({ content: [{ type: "text" as const, text: new Date().toISOString() }] }));
    server.registerTool("delete_thing", { description: "Deletes.", inputSchema: { id: z.string() } }, async ({ id }) => ({ content: [{ type: "text" as const, text: `deleted ${id}` }] }));
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    response.on("close", () => void transport.close().then(() => server.close()));
    await server.connect(transport);
    await transport.handleRequest(request, response, JSON.parse(body));
  });
}

/** An OAuth server in front of `mcp`: discovery, registration, an authorize page that redirects straight back, a token, revocation, and the MCP server behind a bearer token. */
function oauthFront(mcp: string): http.Server {
  const front = http.createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${(front.address() as AddressInfo).port}`;
    let body = "";
    for await (const chunk of request) body += chunk;
    const json = (code: number, value: unknown) => response.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify(value));
    const url = new URL(request.url!, origin);
    if (url.pathname.startsWith("/.well-known/oauth-protected-resource")) return json(200, { resource: `${origin}/mcp`, authorization_servers: [origin] });
    if (url.pathname.startsWith("/.well-known/oauth-authorization-server"))
      return json(200, {
        issuer: origin,
        authorization_endpoint: `${origin}/authorize`,
        token_endpoint: `${origin}/token`,
        registration_endpoint: `${origin}/register`,
        revocation_endpoint: `${origin}/revoke`,
        response_types_supported: ["code"],
        code_challenge_methods_supported: ["S256"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported: ["none"],
      });
    if (url.pathname === "/register") return json(201, { client_id: "test-client", redirect_uris: (JSON.parse(body || "{}") as { redirect_uris?: string[] }).redirect_uris, token_endpoint_auth_method: "none" });
    if (url.pathname === "/authorize") {
      const back = new URL(url.searchParams.get("redirect_uri")!);
      back.searchParams.set("code", "test-code");
      back.searchParams.set("state", url.searchParams.get("state")!);
      return void response.writeHead(302, { location: back.toString() }).end();
    }
    if (url.pathname === "/token") return json(200, { access_token: "test-access", token_type: "Bearer", expires_in: 3600, refresh_token: "test-refresh" });
    if (url.pathname === "/revoke") return json(200, {});
    if (request.headers.authorization === "Bearer test-access") {
      const headers = { ...request.headers } as Record<string, string>;
      delete headers.host;
      delete headers["content-length"];
      const forwarded = await fetch(mcp + request.url, { method: request.method!, headers, ...(request.method === "POST" ? { body } : {}) });
      response.writeHead(forwarded.status, Object.fromEntries(forwarded.headers));
      if (forwarded.body) for await (const chunk of forwarded.body) response.write(chunk);
      return void response.end();
    }
    response.writeHead(401, { "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`, "content-type": "application/json" }).end('{"error":"invalid_token"}');
  });
  return front;
}

const listen = (server: http.Server): Promise<string> => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));

test(
  "a remote extension behind OAuth: needs signing in, signs in through the CLI's callback, its read-only tool passes plan mode and the other doesn't, then signs out",
  { skip: !fs.existsSync(binary) && "no Claude CLI binary for this platform", timeout: 120_000 },
  async () => {
    const mcp = mcpApp();
    const front = oauthFront(await listen(mcp));
    const url = await listen(front);
    const projectDir = temp();
    const dirs = { agent: path.join(projectDir, "extensions") };
    // No headers: an Authorization header turns the CLI's OAuth off.
    await addExtension(makeRemote("probe", `${url}/mcp`, {}), dirs.agent);
    const built = await buildSessionOptions({ mode: "guided", projectDir, extensionDirs: dirs }, temp(), spec);
    // The CLI keeps OAuth tokens in its config folder: a folder of the test's, never the runner's.
    const options = { ...built.options, env: { ...process.env, CLAUDE_CONFIG_DIR: temp() } };
    const input = createInputQueue();
    const run = runQuery(input.iterable, options);
    const until = async (condition: () => Promise<boolean>, what: string, ms = 30_000) => {
      for (const start = Date.now(); !(await condition()); await new Promise((resolve) => setTimeout(resolve, 300))) if (Date.now() - start > ms) assert.fail(`timed out waiting for ${what}`);
    };
    try {
      await until(async () => (await built.extensionAuth.needed()).includes("probe"), "the server to need signing in");
      const signIn = await built.extensionAuth.signIn("probe");
      assert.equal(signIn.status, "open");
      const link = signIn.status === "open" ? signIn.links[0]!.url : "";
      // The person's browser: the authorize page sends it back to the CLI's localhost callback.
      const callback = (await fetch(link, { redirect: "manual" })).headers.get("location")!;
      await fetch(callback);
      assert.equal(await built.extensionAuth.connected("probe", 15_000), true);
      // Plan mode trusts its server's readOnlyHint, as for a local one.
      assert.ok(built.modeControl.set("plan"));
      const hooks = built.options.hooks!.PreToolUse!.flatMap((matcher) => matcher.hooks);
      const allowed = async (tool_name: string): Promise<boolean> => {
        for (const hook of hooks) {
          const output = (await hook({ hook_event_name: "PreToolUse", tool_name, tool_input: {}, tool_use_id: "t", session_id: "s", transcript_path: "", cwd: "" } as never, "t", { signal: new AbortController().signal })) as {
            hookSpecificOutput?: { permissionDecision?: string };
          };
          if (output.hookSpecificOutput?.permissionDecision === "deny") return false;
        }
        return true;
      };
      await until(() => allowed("mcp__probe-api__get_time"), "its read-only tool to pass plan mode");
      assert.equal(await allowed("mcp__probe-api__delete_thing"), false);
      assert.equal(await built.extensionAuth.signOut("probe"), true);
      await until(async () => (await built.extensionAuth.needed()).includes("probe"), "the server to need signing in again");
    } finally {
      input.end();
      run.close();
      front.close();
      mcp.close();
    }
  },
);

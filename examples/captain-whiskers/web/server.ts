import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { addExtension, agentKitVersion, createChatController, getLanguage, listInstalled, resolveClaudeAuth, SUPPORTED_LANGUAGES, switchLanguage, type ChatController, type Language, type Mode } from "@falkenslab/agent-kit";
import { CAPTAIN_DIR, claudeKeyVariable, loadConfig, saveConfig, texts, useSavedClaudeKey, version, type createCaptain } from "../captain.js";
import { chestTexts, pageTexts } from "./texts.js";

// El capitán en el navegador (ADR-026, #44): su propia web, sobre el controlador de chat del
// kit. Un servidor en 127.0.0.1 (un túnel llega a ese puerto), con un token en la URL sin el
// que no se entra; el estado del chat llega a la página por eventos del servidor (SSE) y lo que
// hace la persona vuelve en POST. Sin dependencias: node:http y una página.

type Captain = Awaited<ReturnType<typeof createCaptain>>;

export interface WebChatOptions {
  /** El puerto; uno libre si no se da. */
  port?: number;
  /** El token de la URL; uno aleatorio si no se da. */
  token?: string;
}

/** Lo más grande que se puede subir para el cofre. */
const MAX_UPLOAD = 50 * 1024 * 1024;

/**
 * Arranca su web: devuelve la URL (con el token) y cómo cerrarla. Sin token de Claude, la página
 * lo pide; con él, abre la sesión.
 */
export async function startWebChat(captain: Captain, options: WebChatOptions = {}): Promise<{ url: string; close: () => Promise<void> }> {
  const token = options.token ?? randomBytes(18).toString("base64url");
  // His jokebook comes with him, in the browser as in the app: installed for him on the first
  // start, like any extension. From outside the archive when he runs packaged: another process reads it.
  if (!(await listInstalled(captain.extensionDirs)).some((extension) => extension.name === "jokebook")) {
    const jokebook = path.join(CAPTAIN_DIR, "extensions", "jokebook").replace(/([\\/])app\.asar([\\/])/,"$1app.asar.unpacked$2");
    await addExtension(jokebook, captain.extensionDirs.agent);
  }
  // The language the person last chose here, kept in his home (#47).
  const saved = (await loadConfig(captain.home)).language;
  // His Claude key, from his config.json when the environment brings none.
  await useSavedClaudeKey(captain.home);
  if (saved) switchLanguage(saved);

  // La sesión, en cuanto hay con qué autenticarse.
  let chat: ChatController | null = null;
  let opening: Promise<void> | null = null;
  function openChat(): Promise<void> {
    opening ??= (async () => {
      chat = await createChatController(captain.opener, {
        runsDir: captain.runsDir,
        historyPath: captain.historyPath,
        // Los paneles (aprobaciones, elecciones) son parte del estado: la página los responde.
        panels: "state",
        // Aquí no se sale escribiendo: se cierra la pestaña.
        exitCommands: [],
      });
      chat.subscribe(() => schedule());
      await chat.start();
      schedule();
    })();
    return opening;
  }
  if (resolveClaudeAuth()) void openChat();

  // Una persona a la vez: la última conexión manda, y la anterior se entera.
  let client: ServerResponse | null = null;
  let pending: ReturnType<typeof setTimeout> | null = null;
  /** El estado a la página, como mucho cada 50 ms (el texto llega a trocitos). */
  function schedule(): void {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      send("state", snapshot());
    }, 50);
  }
  function snapshot() {
    return { signedIn: Boolean(chat), chat: chat?.getState() ?? null };
  }
  function send(event: string, data: unknown): void {
    client?.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
  // Un latido cada 20 s, para que ningún proxy (un túnel) cierre la conexión por inactividad.
  const heartbeat = setInterval(() => client?.write(": ping\n\n"), 20_000);

  const authorized = (request: IncomingMessage, url: URL): boolean => {
    const given = url.searchParams.get("token") ?? request.headers["x-token"];
    if (typeof given !== "string" || given.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(given), Buffer.from(token));
  };

  async function raw(request: IncomingMessage, limit: number): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      size += (chunk as Buffer).length;
      if (size > limit) throw new Error("too large");
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  /** What the person does, by path. */
  async function act(action: string, data: Record<string, unknown>): Promise<unknown> {
    if (action === "login") return await signIn(String(data.token ?? ""));
    if (!chat) return { error: "signed out" };
    const current = chat;
    switch (action) {
      case "send":
        // One turn at a time: the page waits for the one running.
        if (current.getState().busy) return { error: "busy" };
        // The turn runs on; the page follows it through the state.
        void current.send(String(data.line ?? "")).catch((error) => current.notice(String(error?.message ?? error), "error"));
        return {};
      case "interrupt":
        current.interrupt();
        return {};
      case "mode":
        current.setMode(String(data.mode) as Mode);
        return {};
      case "answer":
        current.answer(Number(data.panelId), String(data.answer ?? ""));
        return {};
      case "choose":
        current.choose(data.value === null || data.value === undefined ? null : String(data.value));
        return {};
      case "runs":
        return { runs: await current.listRuns(), current: current.getState().run?.dir ?? null };
      case "resume":
        if (current.getState().busy) return { error: "busy" };
        await current.resume(data.dir ? String(data.dir) : undefined);
        return {};
      case "new":
        if (current.getState().busy) return { error: "busy" };
        await current.newConversation();
        return {};
      case "extension":
        if (current.getState().busy) return { error: "busy" };
        await current.setExtension(String(data.name), Boolean(data.enabled));
        return {};
      case "language": {
        const language = String(data.language) as Language;
        if (!SUPPORTED_LANGUAGES.includes(language)) return { error: "unknown language" };
        if (current.getState().busy) return { error: "busy" };
        // His name follows the language too: the conversation so far would keep the old one.
        await current.setLanguage(language, { note: `Your name is now ${texts(language).name}.` });
        await saveConfig(captain.home, { language });
        // The page's texts, the captain's name: anew, in the language chosen.
        send("info", info());
        return {};
      }
      default:
        return { error: `unknown action ${action}` };
    }
  }

  /** The token the person pasted: an API key or an OAuth token, into his config.json and the process. */
  async function signIn(pasted: string): Promise<unknown> {
    const value = pasted.trim();
    const variable = claudeKeyVariable(value);
    if (!variable) return { error: "invalid" };
    process.env[variable] = value;
    await saveConfig(captain.home, { claudeToken: value });
    await openChat();
    return {};
  }

  /** A file the person chose (the captain asked for one): kept in his home, its path for the answer. */
  async function upload(request: IncomingMessage, url: URL): Promise<unknown> {
    const name = path.basename(url.searchParams.get("name") ?? "file").replace(/[^\w.\- ()]/g, "_") || "file";
    const dir = path.join(captain.home, ".uploads", new Date().toISOString().replace(/[:.]/g, "-"));
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, name);
    await writeFile(file, await raw(request, MAX_UPLOAD));
    return { path: file };
  }

  /** What the page needs to know besides the chat: in the language of now. */
  const info = () => ({
    name: texts().name,
    language: getLanguage(),
    languages: SUPPORTED_LANGUAGES,
    version,
    kit: agentKitVersion(),
    texts: pageTexts(getLanguage()),
  });

  /**
   * A file the person adds to the chest (#48), through the sources extension: never
   * overwriting, a duplicate recognized, the person as its origin. A notice says how it went.
   */
  async function addToChest(request: IncomingMessage, url: URL): Promise<unknown> {
    const current = chat;
    const addSource = current?.api<{ addSource: (file: string, name: string) => Promise<{ path: string; duplicateOf?: string }> }>("sources")?.addSource;
    if (!current || !addSource) return { error: "no chest" };
    if (current.getState().busy) return { error: "busy" };
    const name = path.basename(url.searchParams.get("name") ?? "file").replace(/[^\w.\- ()]/g, "_") || "file";
    const temp = path.join(captain.home, ".uploads", `${Date.now()}-${name}`);
    await mkdir(path.dirname(temp), { recursive: true });
    await writeFile(temp, await raw(request, MAX_UPLOAD));
    const say = chestTexts(getLanguage());
    try {
      const added = await addSource(temp, name);
      current.notice(added.duplicateOf ? say.duplicate(name, added.duplicateOf) : say.added(added.path), "plain");
      return added;
    } catch (error) {
      const message = String((error as Error)?.message ?? error);
      current.notice(say.failed(name, message), "warn");
      return { error: message };
    } finally {
      await rm(temp, { force: true });
    }
  }

  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://localhost");
      if (!authorized(request, url)) {
        response.writeHead(403, { "content-type": "text/plain; charset=utf-8" }).end("403");
        return;
      }
      if (request.method === "GET" && url.pathname === "/") {
        response
          .writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            // Nothing from elsewhere: the page is self-contained.
            "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
            "referrer-policy": "no-referrer",
          })
          // Read on every load: a few KB, and a change to it shows on reload.
          .end(await readFile(path.join(CAPTAIN_DIR, "web", "index.html"), "utf8"));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/events") {
        if (client) {
          client.write(`event: replaced\ndata: {}\n\n`);
          client.end();
        }
        client = response;
        response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        send("info", info());
        send("state", snapshot());
        request.on("close", () => client === response && (client = null));
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/chest") {
        try {
          response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(await addToChest(request, url)));
        } catch (error) {
          response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: String((error as Error)?.message ?? error) }));
        }
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/upload") {
        try {
          response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(await upload(request, url)));
        } catch (error) {
          response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: String((error as Error)?.message ?? error) }));
        }
        return;
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/")) {
        try {
          const body = (await raw(request, 1_000_000)).toString("utf8");
          const result = await act(url.pathname.slice("/api/".length), body ? (JSON.parse(body) as Record<string, unknown>) : {});
          response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
        } catch (error) {
          response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: String((error as Error)?.message ?? error) }));
        }
        return;
      }
      response.writeHead(404).end();
    })();
  });

  // Solo en esta máquina: un túnel (cloudflared, ngrok, Tailscale) es de la persona.
  await new Promise<void>((resolve) => server.listen(options.port ?? 0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;
  return {
    url: `http://127.0.0.1:${port}/?token=${token}`,
    async close() {
      clearInterval(heartbeat);
      client?.end();
      (chat as ChatController | null)?.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

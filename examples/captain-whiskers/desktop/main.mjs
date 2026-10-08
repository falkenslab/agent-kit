// Captain Whiskers as a desktop application (ADR-026, #44): an Electron window around his own
// web chat. The main process starts his web host on a free local port with a token that never
// leaves this process, and loads it in the window: the same page as in a browser, with the
// window's own file picker. Everything he keeps goes in his home, ~/.captain-whiskers, the same
// as in the terminal and the browser: his logbook, chest, conversations, memory, extensions, and
// his config.json (the Claude key he signs in with, his language, this window's place). The
// app's own data folder keeps only Electron's caches.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, Menu, shell } from "electron";

const here = path.dirname(fileURLToPath(import.meta.url));

// For automated checks only: Electron's caches somewhere of their own (his home: CAPTAIN_HOME),
// set first, so the single-instance lock below is theirs too.
if (process.env.CAPTAIN_DESKTOP_DATA) app.setPath("userData", process.env.CAPTAIN_DESKTOP_DATA);

// One window: a second launch brings the first to the front.
if (!app.requestSingleInstanceLock()) {
  console.log("Captain Whiskers is already open: brought to the front.");
  app.quit();
}

// VS Code's terminal sets it, and with it every process Electron starts would be plain Node.
delete process.env.ELECTRON_RUN_AS_NODE;

let window = null;
let web = null;
// Where the window was when it closed, saved in his config.json before the app quits.
let closedBounds = null;
let captainConfig = null;

async function start() {
  // The captain, compiled into captain/ by `npm run build`.
  const { createCaptain, loadConfig, saveConfig } = await import("./captain/captain.js");
  const { startWebChat } = await import("./captain/web/server.js");

  // Exactly his web, as `npm start -- --web` serves it, from the same home.
  const captain = await createCaptain();
  web = await startWebChat(captain);
  captainConfig = { home: captain.home, save: saveConfig };
  // For automated checks only: where the page is.
  if (process.env.CAPTAIN_DESKTOP_URL_FILE) writeFileSync(process.env.CAPTAIN_DESKTOP_URL_FILE, web.url);

  window = new BrowserWindow({
    ...((await loadConfig(captain.home)).window ?? { width: 1120, height: 800 }),
    minWidth: 380,
    minHeight: 520,
    // The page names the window (`document.title`), in the language of the moment.
    icon: path.join(here, "build", "icon.png"),
    backgroundColor: "#0d1420",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
  });
  window.once("ready-to-show", () => window.show());
  // Links open in the person's browser; the window never leaves the captain's page.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(new URL(web.url).origin)) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });
  window.on("close", () => (closedBounds = window.getNormalBounds()));
  await window.loadURL(web.url);
  if (process.env.CAPTAIN_DESKTOP_SCRIPT) void runScript(process.env.CAPTAIN_DESKTOP_SCRIPT);
}

/**
 * For automated checks only: steps run in this window (`{ js }`, `{ until }`, `{ wait }`,
 * `{ shot }`, `{ size }`), then the app quits. What a person sees, captured.
 */
async function runScript(file) {
  const { steps } = JSON.parse(readFileSync(file, "utf8"));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  for (const step of steps) {
    try {
      if (step.wait) await sleep(step.wait);
      if (step.size) {
        window.setContentSize(step.size[0], step.size[1]);
        await sleep(500);
      }
      if (step.js) console.log(`js: ${JSON.stringify(await window.webContents.executeJavaScript(step.js))}`);
      if (step.until) {
        const deadline = Date.now() + (step.timeout ?? 120000);
        while (Date.now() < deadline && !(await window.webContents.executeJavaScript(step.until))) await sleep(500);
        console.log(`until ${Date.now() < deadline ? "met" : "TIMED OUT"}`);
      }
      if (step.shot) {
        writeFileSync(step.shot, (await window.webContents.capturePage()).toPNG());
        console.log(`shot ${step.shot}`);
      }
    } catch (error) {
      console.log(`step failed: ${error.message}`);
    }
  }
  window.close();
}

app.on("second-instance", () => {
  if (window) {
    if (window.isMinimized()) window.restore();
    window.focus();
  }
});

app.whenReady().then(async () => {
  // A small menu: what the person may need, nothing of a browser's.
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "fileMenu" },
      { role: "editMenu" },
      { label: "View", submenu: [{ role: "reload" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }, ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }])] },
    ]),
  );
  try {
    await start();
  } catch (error) {
    const { dialog } = await import("electron");
    dialog.showErrorBox("Captain Whiskers", String(error?.stack ?? error));
    app.quit();
  }
});

app.on("window-all-closed", async () => {
  if (closedBounds && captainConfig) await captainConfig.save(captainConfig.home, { window: closedBounds });
  await web?.close();
  app.quit();
});

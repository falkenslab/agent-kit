// Draws the app's icon (`npm run icon`) from the logo in the web page, so there's one drawing:
// Electron renders it and saves build/icon.png, which electron-builder turns into the
// Windows .ico (and the macOS .icns). Drawn at 512 px: a window taller than the screen can't be captured.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(path.join(desktop, "..", "web", "index.html"), "utf8");
const logo = /const LOGO = `([\s\S]*?)`;/.exec(page)?.[1];
if (!logo) throw new Error("No LOGO in web/index.html");
const size = 512;

app.whenReady().then(async () => {
 try {
  // Offscreen rendering: painted without being shown, and with a transparent background.
  const window = new BrowserWindow({ width: size, height: size, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${logo.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`;
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const image = await window.webContents.capturePage();
  mkdirSync(path.join(desktop, "build"), { recursive: true });
  writeFileSync(path.join(desktop, "build", "icon.png"), image.toPNG());
  console.log(`build/icon.png (${image.getSize().width}x${image.getSize().height})`);
 } catch (error) {
  console.error(error);
  process.exitCode = 1;
 }
  app.quit();
});

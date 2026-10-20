import { spawn } from "node:child_process";

/**
 * Whether a browser can be opened on this computer (#72): not over SSH, nor on Linux without a
 * display (a server, a container). Elsewhere the desktop is there.
 */
export function canOpenBrowser(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): boolean {
  if (env.SSH_CONNECTION || env.SSH_TTY || env.SSH_CLIENT) return false;
  if (platform === "win32" || platform === "darwin") return true;
  return Boolean(env.DISPLAY || env.WAYLAND_DISPLAY);
}

/**
 * Opens an `http(s)` address in this computer's browser, with the system's own opener and no
 * shell (an OAuth link is full of `&`, which `cmd /c start` would cut): `rundll32` on Windows,
 * `open` on macOS, `xdg-open` elsewhere. False when it can't (`canOpenBrowser()`, another kind
 * of address, no opener): then the person is given the link only.
 */
export async function openBrowser(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url) || !canOpenBrowser()) return false;
  const [command, args] =
    process.platform === "win32" ? ["rundll32", ["url.dll,FileProtocolHandler", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  return await new Promise<boolean>((resolve) => {
    try {
      const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
      child.once("error", () => resolve(false));
      child.once("spawn", () => {
        child.unref();
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

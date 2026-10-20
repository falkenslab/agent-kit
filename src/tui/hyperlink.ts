/**
 * Terminal hyperlinks (OSC 8, #72): a long address the full-screen chat wraps stays one link,
 * since every row it's cut into opens it whole (`wrap-ansi` reopens the link on each row).
 */

/**
 * Whether the terminal shows OSC 8 links, from what it says about itself: Windows Terminal,
 * VS Code's, iTerm2, WezTerm, Konsole, a recent VTE (GNOME's), DomTerm. `FORCE_HYPERLINK=1` or `0`
 * decides. Elsewhere none: a terminal that doesn't know the sequence may print it.
 */
export function supportsHyperlinks(env: NodeJS.ProcessEnv = process.env, isTTY: boolean = process.stdout.isTTY === true): boolean {
  if (env.FORCE_HYPERLINK !== undefined) return env.FORCE_HYPERLINK !== "0";
  if (!isTTY) return false;
  if (env.WT_SESSION || env.KONSOLE_VERSION || env.DOMTERM) return true;
  if (["vscode", "iTerm.app", "WezTerm"].includes(env.TERM_PROGRAM ?? "")) return true;
  return Number(env.VTE_VERSION ?? 0) >= 5000;
}

/** `text` as a link to `url` (OSC 8). */
export function hyperlink(url: string, text: string = url): string {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

/** A notice that is an address alone (a sign-in link, #72) as a link when the terminal shows them; any other text as it is. */
export function linkedNotice(text: string, linked: boolean = supportsHyperlinks()): string {
  return linked && /^https?:\/\/\S+$/.test(text) ? hyperlink(text) : text;
}

// Focus reporting: the terminal sends ESC [ I / ESC [ O when the window gains/loses focus.
const FOCUS_ON = "\x1b[?1004h";
const FOCUS_OFF = "\x1b[?1004l";
// eslint-disable-next-line no-control-regex -- \x1b is the ESC byte the report may start with
const FOCUS_REPORT = /^(?:\x1b?\[[IO])+$/;

/** OSC 0: the window/tab title. */
const title = (text: string): string => `\x1b]0;${text}\x07`;
// OSC 9;4: Windows Terminal's taskbar progress: 0 clears it, 3 is indeterminate, 4 is paused
// (yellow), used here as "needs attention".
const PROGRESS_CLEAR = "\x1b]9;4;0;0\x07";
const PROGRESS_BUSY = "\x1b]9;4;3;0\x07";
const PROGRESS_ATTENTION = "\x1b]9;4;4;100\x07";

/** True when `input` is only focus reports, which must never reach an input as text. */
export function isFocusReport(input: string): boolean {
  return FOCUS_REPORT.test(input);
}

/** The focus state the reports in `input` leave: true (focused), false, or null if none. */
export function focusFromReport(input: string): boolean | null {
  if (!isFocusReport(input)) return null;
  return input.endsWith("[I");
}

export interface TerminalStatus {
  /** Title and focus reporting on; call once. */
  start(): void;
  turnStarted(): void;
  turnEnded(): void;
  setFocused(focused: boolean): void;
  /** Everything back as it was (title cleared, taskbar cleared, focus reporting off). */
  stop(): void;
}

/**
 * Shows the chat's state outside it, through sequences Windows Terminal understands: the
 * tab title ("✻ <name> — working…" during a turn), the taskbar button (indeterminate
 * progress during a turn) and, when a turn ends while the window isn't focused, a paused
 * (yellow) taskbar state until it's focused again.
 */
export function createTerminalStatus(write: (text: string) => void, name: string): TerminalStatus {
  let focused = true;
  let needsAttention = false;
  return {
    start() {
      write(FOCUS_ON + title(name));
    },
    turnStarted() {
      needsAttention = false;
      write(title(`✻ ${name} — working…`) + PROGRESS_BUSY);
    },
    turnEnded() {
      needsAttention = !focused;
      write(title(name) + (needsAttention ? PROGRESS_ATTENTION : PROGRESS_CLEAR));
    },
    setFocused(next) {
      focused = next;
      if (focused && needsAttention) {
        needsAttention = false;
        write(PROGRESS_CLEAR);
      }
    },
    stop() {
      write(FOCUS_OFF + PROGRESS_CLEAR + title(""));
    },
  };
}

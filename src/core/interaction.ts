export interface ApprovalPrompt {
  title: string;
  lines: string[];
  /** Terminal question text; defaults to the approve/reject one. */
  question?: string;
}

/**
 * The UI side of a human-in-the-loop checkpoint: how a host shows the question and reads a
 * person's answer. `askForDecision()` races it against the response file, so a port only
 * covers the keyboard (or window) channel and never needs to know about the file.
 *
 * A method that can't ask (no TTY, no window) returns a promise that never resolves, so the
 * file wins. `signal` aborts once the race is settled by the other channel; a port must
 * drop its question then and leave its UI usable.
 *
 * Kept in `core/` so the checkpoints never depend on a terminal (ADR-001): the terminal
 * port lives in `tui/` and is installed by the package entry point; a non-terminal host
 * installs its own, or `null` to answer through the response file alone.
 */
export interface InteractionPort {
  /** A step-gate or approval checkpoint; resolves to the raw answer ("", "y", "n", "q"...). */
  askDecision(prompt: ApprovalPrompt, signal: AbortSignal): Promise<string>;
  /** Waits until the person confirms they intervened by hand (e.g. logged in). */
  askManualIntervention(prompt: ApprovalPrompt, signal: AbortSignal): Promise<string>;
  /** A one-way message for the person. */
  notify(message: string): void;
}

let current: InteractionPort | null = null;

export function setInteractionPort(port: InteractionPort | null): void {
  current = port;
}

export function getInteractionPort(): InteractionPort | null {
  return current;
}

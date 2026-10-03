import type { Mode } from "./agentSpec.js";

/**
 * The supervision mode of a running session. "guided", "interactive" and "plan" switch into
 * one another: they share the same tools (the approval tool), and the step gate and the plan
 * gate are registered in all three, deciding only in their own mode. "autonomous" has no
 * approval tool at all, and a tool can't appear or vanish mid-session, so a session that
 * starts autonomous stays autonomous, and one that doesn't can't become autonomous. The
 * system prompt keeps the mode it was built with, so entering or leaving plan mode is told
 * to the model with the next message instead (`takeNotice()`).
 */
export interface ModeControl {
  readonly mode: Mode;
  /** The modes this session can be in, in Shift+Tab's order; fewer than two means it can't switch. */
  readonly switchable: readonly Mode[];
  /** Switches to `next` if this session allows it; returns whether it did. */
  set(next: Mode): boolean;
  /**
   * The note telling the model it entered or left plan mode, once per change it hasn't been
   * told about yet; `undefined` otherwise. `createInputQueue({ modeControl })` puts it before
   * the next message; a caller with its own queue prepends it itself.
   */
  takeNotice?(): string | undefined;
  /**
   * Calls `listener` with the new mode whenever it changes (Shift+Tab, `/plan`, or the agent
   * leaving plan mode through `present_plan`), so a UI can show it; returns the unsubscribe.
   */
  subscribe?(listener: (mode: Mode) => void): () => void;
}

/** A `ModeControl` starting at `initial` (`buildSessionOptions()` returns one for its session). */
export function createModeControl(initial: Mode): ModeControl {
  let current = initial;
  // The mode the model was last told about: a session starting in plan mode tells it with
  // the first message, since the system prompt doesn't say.
  let told: Mode | undefined = initial === "plan" ? undefined : initial;
  const switchable: readonly Mode[] = initial === "autonomous" ? ["autonomous"] : ["guided", "interactive", "plan"];
  const listeners = new Set<(mode: Mode) => void>();
  return {
    get mode() {
      return current;
    },
    switchable,
    set(next) {
      if (!switchable.includes(next)) return false;
      const changed = next !== current;
      current = next;
      if (changed) for (const listener of listeners) listener(next);
      return true;
    },
    takeNotice() {
      const before = told;
      told = current;
      if (current === "plan" && before !== "plan") return PLAN_MODE_ENTERED;
      if (current !== "plan" && before === "plan") return PLAN_MODE_LEFT;
      return undefined;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// The mode each session was in when `/plan` took it into plan mode, to go back to.
const modeBeforePlan = new WeakMap<ModeControl, Mode>();

/**
 * What the chats' `/plan` does: switches `control` into plan mode, or, when it's already
 * there, back to the mode it was entered from ("guided" if it started in plan mode). Returns
 * the new mode, or `null` when this session can't be in plan mode (an autonomous one).
 */
export function togglePlanMode(control: ModeControl): Mode | null {
  if (!control.switchable.includes("plan")) return null;
  if (control.mode === "plan") {
    const back = modeBeforePlan.get(control) ?? "guided";
    control.set(back);
    return back;
  }
  modeBeforePlan.set(control, control.mode);
  control.set("plan");
  return "plan";
}

// What the model reads on a plan-mode switch, in English like the rest of what it reads
// (ADR-019); tagged so a resumed conversation doesn't show it as the human's words (runs.ts).
const PLAN_MODE_ENTERED =
  "<system-reminder>The user switched to plan mode. Only read, research and plan: nothing can be changed (files, tools that modify something) until they switch out of it. When the plan is ready, present it and wait for them.</system-reminder>";
const PLAN_MODE_LEFT = "<system-reminder>The user left plan mode: you can carry out the plan now.</system-reminder>";

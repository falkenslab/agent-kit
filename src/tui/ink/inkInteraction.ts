import type { ApprovalPrompt, ChoiceSettings, InteractionPort } from "../../core/interaction.js";
import { parseChoice } from "../../core/hooks/humanInput.js";
import * as ui from "../ui.js";
import { renderMarkdown } from "./markdown.js";
import { t } from "../../core/messages/index.js";

export type CheckpointKind = "decision" | "manual-intervention" | "text" | "choice";

export interface Checkpoint {
  id: number;
  kind: CheckpointKind;
  prompt: ApprovalPrompt;
  /** For a choice: the options and whether several can be picked. */
  choice?: ChoiceSettings;
  /** Settles the checkpoint with the raw answer ("y", "n", "q" for a decision). */
  answer(value: string): void;
}

export interface InkInteraction {
  port: InteractionPort;
  subscribe(listener: () => void): () => void;
  /** The checkpoint on screen, or null. */
  getSnapshot(): Checkpoint | null;
}

const outcome = (answer: string): string | undefined =>
  ({ y: ui.success(t().approved), n: ui.warn(t().rejected), q: ui.error(t().stopped) })[answer];

/**
 * An `InteractionPort` for the Ink views: each checkpoint waits in a queue (the step gate
 * can fire for several tool calls at once) until the panel answers it, or until the
 * response file does and the signal drops it. Once settled it is written to the history
 * through `note` — like the terminal port, it never reaches the session log.
 */
export function createInkInteraction(note: (text: string) => void): InkInteraction {
  const listeners = new Set<() => void>();
  let queue: Checkpoint[] = [];
  let nextId = 0;

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function remove(checkpoint: Checkpoint): boolean {
    if (!queue.includes(checkpoint)) return false;
    queue = queue.filter((c) => c !== checkpoint);
    emit();
    return true;
  }

  function record(prompt: ApprovalPrompt, outcome: string): void {
    note([ui.heading(`=== ${prompt.title} ===`), ...prompt.lines, outcome].join("\n"));
  }

  /** How a settled checkpoint is written to the history. */
  function settledAs(kind: CheckpointKind, value: string, choice?: ChoiceSettings): string {
    if (kind === "decision") return outcome(value) ?? value;
    if (kind === "text") return value ? ui.success(`✔ ${value}`) : ui.dim(t().noAnswer);
    if (kind === "choice" && choice) {
      const answer = parseChoice(value, choice.options, choice.multiple);
      const words = [...answer.chosen, ...(answer.other ? [answer.other] : [])];
      return words.length ? ui.success(`✔ ${words.join("; ")}`) : ui.dim(t().noAnswer);
    }
    return ui.success(t().done);
  }

  function ask(kind: CheckpointKind, prompt: ApprovalPrompt, signal: AbortSignal, choice?: ChoiceSettings): Promise<string> {
    return new Promise<string>((resolve) => {
      const checkpoint: Checkpoint = {
        id: nextId++,
        kind,
        prompt,
        ...(choice ? { choice } : {}),
        answer(value: string): void {
          if (!remove(checkpoint)) return;
          record(prompt.markdown ? { ...prompt, lines: renderMarkdown(prompt.lines.join("\n"), 80) } : prompt, settledAs(kind, value, choice));
          resolve(value);
        },
      };
      signal.addEventListener(
        "abort",
        () => {
          if (remove(checkpoint)) record(prompt, ui.dim(t().answeredByFile));
        },
        { once: true },
      );
      queue = [...queue, checkpoint];
      emit();
    });
  }

  return {
    port: {
      askDecision: (prompt, signal) => ask("decision", prompt, signal),
      askManualIntervention: (prompt, signal) => ask("manual-intervention", prompt, signal),
      askText: (prompt, signal) => ask("text", prompt, signal),
      askChoice: (prompt, choice, signal) => ask("choice", prompt, signal, choice),
      notify: (message) => note(message),
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => queue[0] ?? null,
  };
}

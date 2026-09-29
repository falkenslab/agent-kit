import { stdin, stdout } from "node:process";
import { useSyncExternalStore } from "react";
import { render, useInput } from "ink";
import type { Mode } from "../../core/agentSpec.js";
import { getInteractionPort, setInteractionPort } from "../../core/interaction.js";
import { createConsoleRenderer, type ConsoleRenderer, type ConsoleRendererOptions } from "../consoleRenderer.js";
import { createInkInteraction, type InkInteraction } from "./inkInteraction.js";
import { createSessionModel, liveWidth, type SessionModel } from "./sessionModel.js";
import { SessionView, type RenderApproval } from "./SessionView.js";
import type { ToolPhrase } from "./toolGroup.js";
import { applyLanguage } from "../language.js";

export interface ProgressViewOptions extends Omit<ConsoleRendererOptions, "output"> {
  /** How one of the agent's own tools counts in a folded group's summary (see `InkChatOptions.toolPhrase`). */
  toolPhrase?: (toolName: string) => ToolPhrase | undefined;
  /** Replaces the default preview in the approval and manual-intervention panels. */
  renderApproval?: RenderApproval;
  /** Shown in the status bar. */
  mode?: Mode;
  /** Use the plain console renderer even on a TTY. */
  plain?: boolean;
  /**
   * The language of the kit's texts ("en", "es", "fr", "de"). `--language=<code>` on the
   * command line wins; without either, the one `buildSessionOptions()` chose from
   * `config.language`, or else the system's.
   */
  language?: string;
}

export interface ProgressView extends ConsoleRenderer {
  /** Removes the live area and restores the previous interaction port; await it before printing anything else. */
  close(): Promise<void>;
}

function ProgressApp({ model, interaction, renderApproval, mode, closed }: {
  model: SessionModel;
  interaction: InkInteraction;
  renderApproval?: RenderApproval;
  mode?: Mode;
  closed: boolean;
}) {
  const checkpoint = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);
  // Only a panel reads the keyboard (and so puts stdin in raw mode, where Ctrl+C no longer
  // raises SIGINT): there, Ctrl+C stops the checkpoint and is passed on as the SIGINT the
  // caller's own handler expects.
  useInput(
    (text, key) => {
      if (!(key.ctrl && text === "c") || !checkpoint) return;
      checkpoint.answer(checkpoint.kind === "decision" ? "q" : "");
      process.kill(process.pid, "SIGINT");
    },
    { isActive: checkpoint !== null },
  );
  return <SessionView model={model} interaction={interaction} renderApproval={renderApproval} mode={mode} closed={closed} />;
}

/**
 * The Ink counterpart of `createConsoleRenderer()` for one-shot ("run"-style) sessions: the
 * same methods and the same text (so `onWrite` logs exactly what the console version
 * would), plus a spinner with the current action, approval panels and a status bar.
 * Checkpoints go through an Ink `InteractionPort` until `close()`.
 *
 * Without a TTY or with `plain`, it is `createConsoleRenderer()` with a no-op `close()`.
 */
export function createProgressView(options: ProgressViewOptions = {}): ProgressView {
  applyLanguage(options.language);
  if (options.plain || !stdin.isTTY || !stdout.isTTY) {
    const renderer = createConsoleRenderer(options);
    return Object.assign(renderer, { close: async () => {} });
  }

  const model = createSessionModel({ ...options, width: () => liveWidth(stdout.columns) });
  const interaction = createInkInteraction((text) => model.note(text));
  const previousPort = getInteractionPort();
  setInteractionPort(interaction.port);

  const app = (closed: boolean) => (
    <ProgressApp model={model} interaction={interaction} renderApproval={options.renderApproval} mode={options.mode} closed={closed} />
  );
  const instance = render(app(false), { exitOnCtrlC: false });
  model.startTurn();
  let closing: Promise<void> | null = null;

  return {
    render: model.render,
    write: (text) => model.renderer.write(text),
    writeLine: (text) => model.renderer.writeLine(text),
    endLine: () => model.renderer.endLine(),
    startTurn: () => model.startTurn(),
    get atLineStart() {
      return model.renderer.atLineStart;
    },
    close(): Promise<void> {
      closing ??= (async () => {
        setInteractionPort(previousPort);
        model.endTurn();
        instance.rerender(app(true));
        await new Promise((resolve) => setTimeout(resolve, 0));
        instance.unmount();
        await instance.waitUntilExit();
      })();
      return closing;
    },
  };
}

import { stdin, stdout } from "node:process";
import { useSyncExternalStore } from "react";
import { render, useInput } from "ink";
import type { Mode } from "../../core/agentSpec.js";
import { getInteractionPort, setInteractionPort } from "../../core/interaction.js";
import { createConsoleRenderer, type ConsoleRenderer, type ConsoleRendererOptions } from "../consoleRenderer.js";
import { createInkInteraction, type InkInteraction } from "./inkInteraction.js";
import { createSessionModel, liveWidth, type SessionModel } from "./sessionModel.js";
import { SessionView, type RenderApproval } from "./SessionView.js";
import type { ResultFormatter, ToolDetail, ToolPhrase } from "./toolGroup.js";
import { applyLanguage } from "../language.js";
import { applyTheme, type Theme } from "../theme.js";
import { KitTheme } from "./inkTheme.js";

/** Options of `createProgressView()`. */
export interface ProgressViewOptions extends Omit<ConsoleRendererOptions, "output"> {
  /** How one of the agent's own tools counts in a folded group's summary (see `InkChatOptions.toolPhrase`). */
  toolPhrase?: (toolName: string) => ToolPhrase | undefined;
  /** How much of the tool calls shows (see `InkChatOptions.toolDetail`); "full" if not given. */
  toolDetail?: ToolDetail;
  /** The result line under a tool call (see `InkChatOptions.formatResult`). */
  formatResult?: ResultFormatter;
  /** Replaces the default preview in the approval and manual-intervention panels. */
  renderApproval?: RenderApproval;
  /** Shown in the status bar. */
  mode?: Mode;
  /** Use the plain console renderer even on a TTY. */
  plain?: boolean;
  /**
   * Colors for the kit's roles (see `Theme`), on top of the kit's defaults: only the roles
   * given change, e.g. `{ toolResult: "yellow", selection: "#00ff00" }`. One theme per
   * process: without this option, the one already set stays.
   */
  theme?: Partial<Theme>;
  /**
   * The language of the kit's texts ("en", "es", "fr", "de"). `--language=<code>` on the
   * command line wins; without either, the one `buildSessionOptions()` chose from
   * `config.language`, or else the system's.
   */
  language?: string;
}

/** A one-shot run's live view: a console renderer drawn with Ink, plus `close()`. */
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
 * The console renderer's methods on top of a session model, so what a caller writes lands in
 * the view (and in `onWrite`, through the model), not only in the model's inner console
 * renderer, whose own output goes nowhere. The view draws whole lines: `write()` text waits
 * until its line ends (a "\n" in it, `writeLine()` or `endLine()`).
 */
export function progressRenderer(model: SessionModel): ConsoleRenderer {
  let partial = "";
  const flush = (): void => {
    if (!partial) return;
    const line = partial;
    partial = "";
    model.writeLine(line);
  };
  return {
    render: (event) => {
      flush();
      model.render(event);
    },
    write(text) {
      const lines = (partial + text).split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines) model.writeLine(line);
    },
    writeLine(text) {
      flush();
      model.writeLine(text);
    },
    endLine: flush,
    startTurn: () => model.startTurn(),
    get atLineStart() {
      return partial === "" && model.renderer.atLineStart;
    },
  };
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
  applyTheme(options.theme);
  if (options.plain || !stdin.isTTY || !stdout.isTTY) {
    const renderer = createConsoleRenderer(options);
    return Object.assign(renderer, { close: async () => {} });
  }

  const model = createSessionModel({ ...options, width: () => liveWidth(stdout.columns) });
  const interaction = createInkInteraction((text) => model.note(text));
  const previousPort = getInteractionPort();
  setInteractionPort(interaction.port);

  const app = (closed: boolean) => (
    <KitTheme>
      <ProgressApp model={model} interaction={interaction} renderApproval={options.renderApproval} mode={options.mode} closed={closed} />
    </KitTheme>
  );
  const instance = render(app(false), { exitOnCtrlC: false });
  model.startTurn();
  let closing: Promise<void> | null = null;

  return {
    ...progressRenderer(model),
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

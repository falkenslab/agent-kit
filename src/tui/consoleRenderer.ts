import { stdout } from "node:process";
import type { AgentEvent } from "../core/runner.js";
import { createFriendlyToolLabel } from "../core/toolLabels.js";
import * as ui from "./ui.js";

export interface ConsoleRendererOptions {
  /** Turns a tool call into its console label; defaults to `createFriendlyToolLabel()`. */
  formatAction?: (toolName: string, toolInput: unknown) => string;
  /** Printed (already styled) before the first text of each turn, e.g. "my-agent>". */
  agentLabel?: string;
  /** Where the text goes; defaults to `process.stdout`. */
  output?: (text: string) => void;
  /** Called after every write with the same text, e.g. to mirror it into a log file. */
  onWrite?: (text: string) => void;
}

export interface ConsoleRenderer {
  /** Prints one normalized event from `runQuery()`. */
  render(event: AgentEvent): void;
  write(text: string): void;
  /** Writes `text` on a line of its own: after ending the current line if needed. */
  writeLine(text: string): void;
  /** Ends the current line, if the cursor isn't already at the start of one. */
  endLine(): void;
  /** Marks the start of a new turn, so the agent label is printed again before its text. */
  startTurn(): void;
  /** Whether the cursor sits at the start of a line (after anything ending in "\n"). */
  readonly atLineStart: boolean;
}

/**
 * The console rendering of `runQuery()`'s event stream, shared by `runChatTui()` and by any
 * one-shot run that prints the same events. Streamed text rarely ends in a newline, so
 * every other line (actions, notices, errors) starts by ending the current line only if
 * it isn't already ended — never with a fixed "\n", which leaves a blank line between
 * consecutive actions.
 */
export function createConsoleRenderer(options: ConsoleRendererOptions = {}): ConsoleRenderer {
  const formatAction = options.formatAction ?? createFriendlyToolLabel();
  const output = options.output ?? ((text: string) => void stdout.write(text));
  let atLineStart = true;
  let labelPrinted = false;

  function write(text: string): void {
    if (text.length === 0) return;
    output(text);
    options.onWrite?.(text);
    atLineStart = text.endsWith("\n");
  }

  function endLine(): void {
    if (!atLineStart) write("\n");
  }

  function writeLine(text: string): void {
    endLine();
    write(`${text}\n`);
  }

  function render(event: AgentEvent): void {
    switch (event.type) {
      case "text":
        if (options.agentLabel && !labelPrinted) {
          endLine();
          write(`${options.agentLabel} `);
          labelPrinted = true;
        }
        write(ui.agent(event.text));
        return;
      case "action":
        writeLine(ui.action(`[action] ${formatAction(event.toolName, event.input)}`));
        return;
      case "mcp-error":
        writeLine(ui.warn(`Some MCP servers failed to connect: ${event.failedServers.join(", ")}`));
        return;
      case "info":
        writeLine((event.level === "warning" ? ui.warn : ui.dim)(`(${event.text})`));
        return;
      case "turn-end":
        if (event.failed) writeLine(ui.error(event.errorText));
        return;
    }
  }

  return {
    render,
    write,
    writeLine,
    endLine,
    startTurn: () => {
      labelPrinted = false;
    },
    get atLineStart() {
      return atLineStart;
    },
  };
}

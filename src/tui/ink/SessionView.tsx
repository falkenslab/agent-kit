import { useSyncExternalStore, type ReactNode } from "react";
import { Box, Static, Text, useInput, useStdout } from "ink";
import { Select, Spinner } from "@inkjs/ui";
import type { ApprovalPrompt } from "../../core/interaction.js";
import type { Mode } from "../../core/agentSpec.js";
import type { SessionUsage } from "../../core/runner.js";
import { liveWidth, type SessionModel } from "./sessionModel.js";
import type { Checkpoint, InkInteraction } from "./inkInteraction.js";
import { fitWidth, stripAnsi } from "./lineBuffer.js";
import * as ui from "../ui.js";

/** Replaces the default preview (title and lines) of an approval panel; the choices stay. */
export type RenderApproval = (prompt: ApprovalPrompt) => ReactNode;

const DECISION_OPTIONS = [
  { label: "Approve (y)", value: "y" },
  { label: "Reject (n)", value: "n" },
  { label: "Stop (q)", value: "q" },
];
const MANUAL_OPTIONS = [{ label: "Done, continue", value: "continue" }];

/**
 * The preview's lines, capped so the whole live area stays shorter than the terminal: Ink
 * clears the entire screen (scrollback included) to redraw anything taller, and a step-gate
 * preview carries the tool's parameters, which can be a whole file.
 */
export function previewLines(lines: readonly string[], terminalRows: number | undefined): string[] {
  const all = lines.flatMap((line) => line.split("\n"));
  const max = Math.max(3, (terminalRows || 24) - 12);
  return all.length <= max ? all : [...all.slice(0, max - 1), ui.dim(`… (${all.length - max + 1} more lines)`)];
}

function CheckpointPanel({ checkpoint, renderApproval }: { checkpoint: Checkpoint; renderApproval?: RenderApproval }) {
  const decision = checkpoint.kind === "decision";
  useInput((input) => {
    const key = input.toLowerCase();
    if (decision && (key === "y" || key === "n" || key === "q")) checkpoint.answer(key);
  });

  const { prompt } = checkpoint;
  const { stdout } = useStdout();
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      {renderApproval ? (
        renderApproval(prompt)
      ) : (
        <>
          <Text bold>{prompt.title}</Text>
          {previewLines(prompt.lines, stdout.rows).map((line, index) => (
            <Text key={index}>{line}</Text>
          ))}
          {!decision && prompt.question ? <Text dimColor>{prompt.question}</Text> : null}
        </>
      )}
      <Box marginTop={1}>
        <Select
          key={checkpoint.id}
          options={decision ? DECISION_OPTIONS : MANUAL_OPTIONS}
          onChange={(value) => checkpoint.answer(decision ? value : "")}
        />
      </Box>
    </Box>
  );
}

function formatTokens(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

export function statusText(mode: Mode | undefined, turns: number, usage: SessionUsage | null): string {
  const parts = [
    ...(mode ? [mode] : []),
    `${turns} ${turns === 1 ? "turn" : "turns"}`,
    ...(usage ? [`${formatTokens(usage.inputTokens)} in / ${formatTokens(usage.outputTokens)} out`] : []),
  ];
  return parts.join(" · ");
}

export interface SessionViewProps {
  model: SessionModel;
  interaction: InkInteraction;
  renderApproval?: RenderApproval;
  mode?: Mode;
  /** Leaves only the history, so the last frame Ink leaves on screen is just the scrollback. */
  closed?: boolean;
  /** Shown under the live area when no checkpoint is waiting (the chat's input). */
  children?: ReactNode;
}

/** History, line in progress, current action, checkpoint panel and status bar. */
export function SessionView({ model, interaction, renderApproval, mode, closed, children }: SessionViewProps) {
  const session = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const checkpoint = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);
  // Nothing in the live area may reach the terminal's edge (see lineBuffer.ts).
  const width = liveWidth(useStdout().stdout.columns);

  return (
    <>
      <Static items={session.items}>{(item) => <Text key={item.id}>{item.text || " "}</Text>}</Static>
      {closed ? null : (
        <Box flexDirection="column" width={width} marginTop={session.liveGap ? 1 : 0}>
          {stripAnsi(session.live) ? <Text>{session.live}</Text> : null}
          {checkpoint ? (
            <CheckpointPanel checkpoint={checkpoint} renderApproval={renderApproval} />
          ) : session.busy ? (
            <Box flexDirection="column">
              <Spinner label={fitWidth(session.activity ?? "Thinking…", width - 2)} />
              {session.subagentActivity ? <Text dimColor>{fitWidth(`  ↳ ${session.subagentActivity}`, width)}</Text> : null}
            </Box>
          ) : null}
          {checkpoint ? null : children}
          <Text>{ui.dim(fitWidth(statusText(mode, session.turns, session.usage), width))}</Text>
        </Box>
      )}
    </>
  );
}

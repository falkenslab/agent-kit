import { useSyncExternalStore, type ReactNode } from "react";
import { Box, Static, Text, useInput } from "ink";
import { Select, Spinner } from "@inkjs/ui";
import type { ApprovalPrompt } from "../../core/interaction.js";
import type { Mode } from "../../core/agentSpec.js";
import type { SessionUsage } from "../../core/runner.js";
import type { SessionModel } from "./sessionModel.js";
import type { Checkpoint, InkInteraction } from "./inkInteraction.js";
import { stripAnsi } from "./lineBuffer.js";
import * as ui from "../ui.js";

/** Replaces the default preview (title and lines) of an approval panel; the choices stay. */
export type RenderApproval = (prompt: ApprovalPrompt) => ReactNode;

const DECISION_OPTIONS = [
  { label: "Approve (y)", value: "y" },
  { label: "Reject (n)", value: "n" },
  { label: "Stop (q)", value: "q" },
];
const MANUAL_OPTIONS = [{ label: "Done, continue", value: "continue" }];

function CheckpointPanel({ checkpoint, renderApproval }: { checkpoint: Checkpoint; renderApproval?: RenderApproval }) {
  const decision = checkpoint.kind === "decision";
  useInput((input) => {
    const key = input.toLowerCase();
    if (decision && (key === "y" || key === "n" || key === "q")) checkpoint.answer(key);
  });

  const { prompt } = checkpoint;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      {renderApproval ? (
        renderApproval(prompt)
      ) : (
        <>
          <Text bold>{prompt.title}</Text>
          {prompt.lines.map((line, index) => (
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
    ...(usage
      ? [`${formatTokens(usage.inputTokens)} in / ${formatTokens(usage.outputTokens)} out`, `$${usage.costUsd.toFixed(4)}`]
      : []),
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

  return (
    <>
      <Static items={session.items}>{(item) => <Text key={item.id}>{item.text || " "}</Text>}</Static>
      {closed ? null : (
        <Box flexDirection="column">
          {stripAnsi(session.live) ? <Text>{session.live}</Text> : null}
          {checkpoint ? (
            <CheckpointPanel checkpoint={checkpoint} renderApproval={renderApproval} />
          ) : session.busy ? (
            <Box flexDirection="column">
              <Spinner label={session.activity ?? "Thinking…"} />
              {session.subagentActivity ? <Text dimColor>{`  ↳ ${session.subagentActivity}`}</Text> : null}
            </Box>
          ) : null}
          {checkpoint ? null : children}
          <Text>{ui.dim(statusText(mode, session.turns, session.usage))}</Text>
        </Box>
      )}
    </>
  );
}

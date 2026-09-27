import { useEffect, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Box, measureElement, Static, Text, useInput, useStdout, type DOMElement } from "ink";
import { Select, Spinner } from "@inkjs/ui";
import type { ApprovalPrompt } from "../../core/interaction.js";
import type { Mode } from "../../core/agentSpec.js";
import type { SessionUsage } from "../../core/runner.js";
import { liveWidth, type SessionModel, type SessionSnapshot } from "./sessionModel.js";
import { createRowCache, isMouseReport, rowsBelow, scrollBy, visibleRows, wheelSteps, type ScrollAnchor } from "./fullscreen.js";
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
  /**
   * Draws the whole terminal: the history in a scrollable view above the live area, instead
   * of in the terminal's own scrollback. The caller switches the terminal to the alternate
   * screen (see fullscreen.ts's enterFullscreen()).
   */
  fullscreen?: boolean;
  /** Full screen only: lines pinned above the history (see header.ts's headerLines()). */
  header?: string[];
  /** Shown under the live area when no checkpoint is waiting (the chat's input). */
  children?: ReactNode;
}

interface LiveAreaProps {
  session: SessionSnapshot;
  checkpoint: Checkpoint | null;
  renderApproval?: RenderApproval;
  mode?: Mode;
  width: number;
  /** Appended to the status bar, e.g. the scroll position in full screen. */
  statusExtra?: string;
  children?: ReactNode;
}

/** Line in progress, checkpoint panel or spinner, the input, and the status bar. */
function LiveArea({ session, checkpoint, renderApproval, mode, width, statusExtra, children }: LiveAreaProps) {
  const status = statusText(mode, session.turns, session.usage) + (statusExtra ? ` · ${statusExtra}` : "");
  return (
    <Box flexDirection="column" flexShrink={0} width={width} marginTop={session.liveGap ? 1 : 0}>
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
      <Text>{ui.dim(fitWidth(status, width))}</Text>
    </Box>
  );
}

/** The terminal's size, re-read on resize (Ink re-lays out on resize but doesn't re-render components). */
function useTerminalSize(): { columns: number; rows: number } {
  const { stdout } = useStdout();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    stdout.on("resize", rerender);
    return () => void stdout.off("resize", rerender);
  }, [stdout]);
  return { columns: stdout.columns || 80, rows: stdout.rows || 24 };
}

const WHEEL_ROWS = 3;

/**
 * The full-screen layout: a frame exactly as tall as the terminal (so Ink redraws it whole
 * from the top every time, never relative to where it thinks the cursor is — a shorter frame
 * left stale copies behind on Windows Terminal) and one column narrower. The history fills
 * what the live area leaves, bottom-aligned, and scrolls on its own: PageUp/PageDown and the
 * wheel move it, Ctrl+End or typing brings it back to the bottom, and output arriving while
 * scrolled up doesn't move it.
 */
function FullscreenSession({ session, checkpoint, renderApproval, mode, header, children }: Omit<LiveAreaProps, "width" | "statusExtra"> & { header?: string[] }) {
  const { columns, rows } = useTerminalSize();
  const width = liveWidth(columns);
  const rowCache = useRef(createRowCache()).current;
  const allRows = rowCache(session.items, width);
  const total = allRows.length;

  const historyRef = useRef<DOMElement>(null);
  const [historyHeight, setHistoryHeight] = useState(rows);
  useEffect(() => {
    if (!historyRef.current) return;
    const { height } = measureElement(historyRef.current);
    if (height !== historyHeight) setHistoryHeight(height);
  });

  const [anchor, setAnchor] = useState<ScrollAnchor>(null);
  // Rows are re-wrapped when the width changes, so a row index no longer means the same
  // place: go back to the bottom.
  useEffect(() => setAnchor(null), [width]);

  useInput((text, key) => {
    const page = Math.max(1, historyHeight - 1);
    const steps = wheelSteps(text);
    if (steps !== 0) setAnchor((a) => scrollBy(a, steps * WHEEL_ROWS, total, historyHeight));
    else if (isMouseReport(text)) return;
    else if (key.pageUp) setAnchor((a) => scrollBy(a, -page, total, historyHeight));
    else if (key.pageDown) setAnchor((a) => scrollBy(a, page, total, historyHeight));
    else if (key.ctrl && key.end) setAnchor(null);
    else if (text && !key.ctrl && !key.meta && !key.escape) setAnchor(null); // typing
  });

  const [start, end] = visibleRows(total, historyHeight, anchor);
  const below = rowsBelow(anchor, total);
  return (
    <Box flexDirection="column" width={columns - 1} height={rows}>
      {header && header.length > 0 ? (
        <Box flexDirection="column" flexShrink={0} marginBottom={1}>
          {header.map((line, i) => (
            <Text key={i} wrap="truncate-end">
              {line || " "}
            </Text>
          ))}
        </Box>
      ) : null}
      <Box ref={historyRef} flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden" justifyContent="flex-end">
        {allRows.slice(start, end).map((row, i) => (
          <Text key={start + i} wrap="truncate-end">
            {row || " "}
          </Text>
        ))}
      </Box>
      <LiveArea
        session={session}
        checkpoint={checkpoint}
        renderApproval={renderApproval}
        mode={mode}
        width={width}
        statusExtra={anchor === null ? undefined : `↓ ${below} more ${below === 1 ? "line" : "lines"} (Ctrl+End)`}
      >
        {children}
      </LiveArea>
    </Box>
  );
}

/** History, line in progress, current action, checkpoint panel and status bar. */
export function SessionView({ model, interaction, renderApproval, mode, closed, fullscreen, header, children }: SessionViewProps) {
  const session = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const checkpoint = useSyncExternalStore(interaction.subscribe, interaction.getSnapshot);
  // Nothing in the live area may reach the terminal's edge (see lineBuffer.ts).
  const width = liveWidth(useStdout().stdout.columns);

  if (fullscreen) {
    return closed ? null : (
      <FullscreenSession session={session} checkpoint={checkpoint} renderApproval={renderApproval} mode={mode} header={header}>
        {children}
      </FullscreenSession>
    );
  }
  return (
    <>
      <Static items={session.items}>{(item) => <Text key={item.id}>{item.text || " "}</Text>}</Static>
      {closed ? null : (
        <LiveArea session={session} checkpoint={checkpoint} renderApproval={renderApproval} mode={mode} width={width}>
          {children}
        </LiveArea>
      )}
    </>
  );
}

# The progress view drops writeLine()'s text

Issue: [#6](https://github.com/falkenslab/agent-kit/issues/6)

## Problem

In `createProgressView()` on a TTY, text written with the view's `writeLine()` (or `write()`) never shows. teacher-agent's "Interrupting… (Ctrl+C again to exit without waiting)" notice, written that way on the first Ctrl+C of a one-shot run, vanished once it moved from `createConsoleRenderer()` to the progress view (kit 0.13.0). Without a TTY (the console renderer) it shows.

## Cause

`progressView.tsx` maps `write`/`writeLine` to `model.renderer.write`/`writeLine`: the session model's inner console renderer, created with `output: () => {}` (it only feeds `onWrite`, e.g. a log). The model's own `writeLine(text)`, which also pushes the text into the view's items, isn't used. `render(event)` is fine: it goes through `model.render`.

## Solution

- `writeLine: (text) => model.writeLine(text)`, so the text lands in the view (and still in `onWrite`).
- `write(text)`: the model has no partial-line equivalent; push it once the line ends, or document that the view only takes whole lines.
- A test in `progressView`/`sessionModel` that `writeLine()` text reaches the view's items.

## Verification

- A one-shot run in a TTY: a `writeLine()` notice appears above the spinner, once, and in the session's log.
- teacher-agent can go back from its workaround (an `info` event) to `writeLine()`.
- `verify` passes.

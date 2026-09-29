import { stdin, stdout } from "node:process";
import { useState } from "react";
import { Box, render, Static, Text, useApp, useInput, useStdout } from "ink";
import wrapAnsi from "wrap-ansi";
import { liveWidth } from "./sessionModel.js";
import { ConfirmInput, PasswordInput, Select, TextInput } from "@inkjs/ui";
import * as inquirer from "@inquirer/prompts";
import * as ui from "../ui.js";
import { t } from "../../core/messages/index.js";
import { applyLanguage } from "../language.js";
import { applyTheme, type Theme } from "../theme.js";
import { KitTheme } from "./inkTheme.js";

export type WizardAnswers = Record<string, unknown>;

/** A value, or one computed from the answers given so far. */
type FromAnswers<T> = T | ((answers: WizardAnswers) => T);

interface BaseStep {
  /** Key of this step's answer in the result. */
  name: string;
  message: FromAnswers<string>;
  /** Skips the step (leaving no answer) when it returns false. */
  when?: (answers: WizardAnswers) => boolean;
}

export interface SelectStep<T = unknown> extends BaseStep {
  type: "select";
  choices: FromAnswers<{ name: string; value: T }[]>;
  /** Preselects the choice with this value. */
  default?: FromAnswers<T>;
}

export interface InputStep extends BaseStep {
  type: "input";
  default?: FromAnswers<string>;
  /** `true` to accept, or the message to show. */
  validate?: (value: string, answers: WizardAnswers) => true | string;
}

export interface PasswordStep extends BaseStep {
  type: "password";
  validate?: (value: string, answers: WizardAnswers) => true | string;
}

export interface ConfirmStep extends BaseStep {
  type: "confirm";
  default?: FromAnswers<boolean>;
}

export type WizardStep = SelectStep | InputStep | PasswordStep | ConfirmStep;

export interface WizardOptions {
  /** Printed above the first question. */
  title?: string;
  /** Use the plain @inquirer/prompts questions even on a TTY. */
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

function resolve<T>(value: FromAnswers<T>, answers: WizardAnswers): T {
  return typeof value === "function" ? (value as (answers: WizardAnswers) => T)(answers) : value;
}

/** The error @inquirer/prompts throws on Ctrl+C, so `isExitPromptError()` covers both. */
function exitPromptError(): Error {
  const error = new Error("User force closed the prompt with Ctrl+C");
  error.name = "ExitPromptError";
  return error;
}

function StepInput({ step, answers, onAnswer }: { step: WizardStep; answers: WizardAnswers; onAnswer(value: unknown): void }) {
  const [error, setError] = useState<string | null>(null);
  const { stdout } = useStdout();
  const width = liveWidth(stdout.columns);
  const message = `${ui.success("?")} ${ui.heading(resolve(step.message, answers))}`;

  function validated(value: string): void {
    const check = step.type === "input" || step.type === "password" ? (step.validate?.(value, answers) ?? true) : true;
    if (check === true) onAnswer(value);
    else setError(check);
  }

  let field;
  switch (step.type) {
    case "select": {
      const choices = resolve(step.choices, answers);
      const preselected = step.default === undefined ? -1 : choices.findIndex((c) => c.value === resolve(step.default, answers));
      field = (
        <Select
          visibleOptionCount={visibleOptions(choices.length, wrapAnsi(message, width, { hard: true }).split(NEWLINE).length, stdout.rows)}
          options={choices.map((choice, index) => ({ label: choice.name, value: String(index) }))}
          defaultValue={preselected >= 0 ? String(preselected) : undefined}
          onChange={(index) => onAnswer(choices[Number(index)].value)}
        />
      );
      break;
    }
    case "input":
      field = <TextInput defaultValue={step.default === undefined ? undefined : resolve(step.default, answers)} onSubmit={validated} />;
      break;
    case "password":
      field = <PasswordInput onSubmit={validated} />;
      break;
    case "confirm": {
      const yes = step.default === undefined ? true : resolve(step.default, answers);
      field = <ConfirmInput defaultChoice={yes ? "confirm" : "cancel"} onConfirm={() => onAnswer(true)} onCancel={() => onAnswer(false)} />;
      break;
    }
  }

  return (
    <Box flexDirection="column" width={width}>
      <Text>{message}</Text>
      {field}
      {error ? <Text>{ui.error(error)}</Text> : null}
    </Box>
  );
}

const NEWLINE = String.fromCharCode(10);

/**
 * How many choices a select shows at once, so the question, its choices and a validation
 * line stay shorter than the terminal: Ink clears the whole screen to redraw anything
 * taller (see SessionView.tsx's previewLines()).
 */
export function visibleOptions(choices: number, messageRows: number, terminalRows: number | undefined): number {
  return Math.max(1, Math.min(choices, (terminalRows || 24) - messageRows - 3));
}

function summary(step: WizardStep, value: unknown, answers: WizardAnswers): string {
  if (step.type === "password") return "*".repeat(String(value).length);
  if (step.type === "confirm") return value ? t().yes : t().no;
  if (step.type === "select") return resolve(step.choices, answers).find((c) => c.value === value)?.name ?? String(value);
  return String(value);
}

export function Wizard({ steps, title, onDone }: { steps: WizardStep[]; title?: string; onDone(answers: WizardAnswers | null): void }) {
  const { exit } = useApp();
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [done, setDone] = useState<{ message: string; text: string }[]>([]);
  const [index, setIndex] = useState(() => nextIndex(steps, -1, {}));

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      onDone(null);
      exit();
    }
  });

  function answer(value: unknown): void {
    const step = steps[index];
    const next = { ...answers, [step.name]: value };
    setAnswers(next);
    setDone([...done, { message: resolve(step.message, answers), text: summary(step, value, answers) }]);
    const following = nextIndex(steps, index, next);
    setIndex(following);
    if (following >= steps.length) {
      onDone(next);
      exit();
    }
  }

  // The title and the answered steps go to <Static>: written once, never redrawn, so a long
  // menu can't grow the live area past the terminal's height.
  const history = [
    ...(title ? [{ id: "title", text: ui.heading(title) }] : []),
    ...done.map(({ message, text }, i) => ({ id: String(i), text: `${ui.success("✔")} ${message} ${ui.agent(text)}` })),
  ];
  const current = steps[index];
  return (
    <>
      <Static items={history}>{(item) => <Text key={item.id}>{item.text}</Text>}</Static>
      {current ? <StepInput key={index} step={current} answers={answers} onAnswer={answer} /> : null}
    </>
  );
}

function nextIndex(steps: WizardStep[], from: number, answers: WizardAnswers): number {
  let index = from + 1;
  while (index < steps.length && steps[index].when && !steps[index].when!(answers)) index++;
  return index;
}

/** The same steps as plain @inquirer/prompts questions, for hosts without a TTY. */
async function runPlainWizard(steps: WizardStep[], title?: string): Promise<WizardAnswers> {
  if (title) console.log(ui.heading(title));
  const answers: WizardAnswers = {};
  for (const step of steps) {
    if (step.when && !step.when(answers)) continue;
    const message = resolve(step.message, answers);
    switch (step.type) {
      case "select":
        answers[step.name] = await inquirer.select({
          message,
          choices: resolve(step.choices, answers),
          default: step.default === undefined ? undefined : resolve(step.default, answers),
        });
        break;
      case "input":
        answers[step.name] = await inquirer.input({
          message,
          default: step.default === undefined ? undefined : resolve(step.default, answers),
          validate: step.validate ? (value) => step.validate!(value, answers) : undefined,
        });
        break;
      case "password":
        answers[step.name] = await inquirer.password({
          message,
          mask: "*",
          validate: step.validate ? (value) => step.validate!(value, answers) : undefined,
        });
        break;
      case "confirm":
        answers[step.name] = await inquirer.confirm({ message, default: step.default === undefined ? true : resolve(step.default, answers) });
        break;
    }
  }
  return answers;
}

/**
 * Asks `steps` in order and resolves with every answer by step name. A step's message,
 * choices or default can depend on earlier answers, and `when` skips it, so a consumer's
 * whole interactive menu becomes a list of step definitions.
 *
 * Ctrl+C rejects with an error named "ExitPromptError", like @inquirer/prompts, so
 * `isExitPromptError()` keeps working. Without a TTY (or with `plain`) it asks the same
 * steps through @inquirer/prompts.
 */
export async function runWizard(steps: WizardStep[], options: WizardOptions = {}): Promise<WizardAnswers> {
  applyLanguage(options.language);
  applyTheme(options.theme);
  if (options.plain || !stdin.isTTY || !stdout.isTTY) return await runPlainWizard(steps, options.title);

  if (nextIndex(steps, -1, {}) >= steps.length) return {};

  let result: WizardAnswers | null = null;
  const app = render(
    <KitTheme>
      <Wizard steps={steps} title={options.title} onDone={(answers) => (result = answers)} />
    </KitTheme>,
    { exitOnCtrlC: false },
  );
  await app.waitUntilExit();
  if (result === null) throw exitPromptError();
  return result;
}

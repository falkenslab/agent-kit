import { stdin, stdout } from "node:process";
import { useState } from "react";
import { Box, render, Text, useApp, useInput } from "ink";
import { ConfirmInput, PasswordInput, Select, TextInput } from "@inkjs/ui";
import * as inquirer from "@inquirer/prompts";
import * as ui from "../ui.js";

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
    <Box flexDirection="column">
      <Text>
        {ui.success("?")} {ui.heading(resolve(step.message, answers))}
      </Text>
      {field}
      {error ? <Text>{ui.error(error)}</Text> : null}
    </Box>
  );
}

function summary(step: WizardStep, value: unknown, answers: WizardAnswers): string {
  if (step.type === "password") return "*".repeat(String(value).length);
  if (step.type === "confirm") return value ? "Yes" : "No";
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

  const current = steps[index];
  return (
    <Box flexDirection="column">
      {title ? <Text>{ui.heading(title)}</Text> : null}
      {done.map(({ message, text }, i) => (
        <Text key={i}>
          {ui.success("✔")} {message} {ui.agent(text)}
        </Text>
      ))}
      {current ? <StepInput key={index} step={current} answers={answers} onAnswer={answer} /> : null}
    </Box>
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
  if (options.plain || !stdin.isTTY || !stdout.isTTY) return await runPlainWizard(steps, options.title);

  if (nextIndex(steps, -1, {}) >= steps.length) return {};

  let result: WizardAnswers | null = null;
  const app = render(<Wizard steps={steps} title={options.title} onDone={(answers) => (result = answers)} />, { exitOnCtrlC: false });
  await app.waitUntilExit();
  if (result === null) throw exitPromptError();
  return result;
}

import type { ElicitationRequest, ElicitationResult } from "@anthropic-ai/claude-agent-sdk";
import { askForChoice, askForDecision, askForManualIntervention, askForText } from "./hooks/humanInput.js";
import { getInteractionPort } from "./interaction.js";
import { t } from "./messages/index.js";

/**
 * MCP elicitation in the kit's chats (#58): an MCP server asks the person for something in the
 * middle of a tool (a form, or a page to open), and the answer goes back to the server, never
 * through the model. The SDK hands each request to `onElicitation` (without one it declines
 * them all); the kit's asks through the interaction port: a whole form when the port can show
 * one (`askForm`, the web and desktop chats), field by field with its usual panels otherwise
 * (the terminal), and the response file as for any checkpoint. Nothing the person answers is
 * written to the transcript or the session log; an autonomous session, with no one to ask,
 * declines.
 */

/** One field of a form a server asks for, from its JSON Schema (MCP's flat, primitive one). */
export interface FormField {
  key: string;
  title: string;
  description?: string;
  type: "string" | "number" | "integer" | "boolean";
  /** The values it may take (a choice), and what each is called, when the schema names them. */
  options?: { value: string; label: string }[];
  /** Several of `options` (an array of an enum). */
  multiple?: boolean;
  required: boolean;
  default?: string | number | boolean | string[];
  minimum?: number;
  maximum?: number;
}

/** A form a server asks for, as the port shows it. */
export interface FormRequest {
  /** Who asks: the MCP server's name (the person must always see it). */
  server: string;
  message: string;
  fields: FormField[];
}

/** The person's answer to a form: its values when accepted. */
export type FormAnswer = {
  action: "accept" | "decline" | "cancel";
  content?: Record<string, string | number | boolean | string[]>;
};

type Schema = Record<string, unknown>;

/** A form's fields from MCP's `requestedSchema`: an object of primitive properties. */
export function formFields(schema: Record<string, unknown> | undefined): FormField[] {
  const properties = (schema?.properties ?? {}) as Record<string, Schema>;
  const required = new Set(Array.isArray(schema?.required) ? (schema.required as string[]) : []);
  return Object.entries(properties).map(([key, property]) => {
    const items = property.items as Schema | undefined;
    const multiple = property.type === "array";
    const choices = (multiple ? items : property) ?? {};
    // A choice: `enum` (with `enumNames`), or `oneOf`/`anyOf` of `{ const, title }`.
    const titled = (choices.oneOf ?? choices.anyOf) as { const?: unknown; title?: string }[] | undefined;
    const values = Array.isArray(choices.enum) ? (choices.enum as unknown[]).map(String) : titled?.map((option) => String(option.const));
    const names = Array.isArray(choices.enumNames) ? (choices.enumNames as unknown[]).map(String) : titled?.map((option) => option.title ?? String(option.const));
    const type = multiple ? "string" : (["number", "integer", "boolean"].includes(String(property.type)) ? property.type : "string") as FormField["type"];
    return {
      key,
      title: typeof property.title === "string" ? property.title : key,
      ...(typeof property.description === "string" ? { description: property.description } : {}),
      type,
      ...(values?.length ? { options: values.map((value, index) => ({ value, label: names?.[index] ?? value })) } : {}),
      ...(multiple ? { multiple: true } : {}),
      required: required.has(key),
      ...(property.default !== undefined ? { default: property.default as FormField["default"] } : {}),
      ...(typeof property.minimum === "number" ? { minimum: property.minimum } : {}),
      ...(typeof property.maximum === "number" ? { maximum: property.maximum } : {}),
    };
  });
}

/** A typed value for `field` from what the person typed, or why it isn't one. */
export function fieldValue(field: FormField, typed: string): string | number | boolean | string[] | { problem: string } {
  const text = typed.trim();
  if (field.type === "boolean") return /^(y|yes|true|1|s|si|sí|oui|ja)$/i.test(text);
  if (field.type === "number" || field.type === "integer") {
    const number = Number(text);
    if (!text || Number.isNaN(number) || (field.type === "integer" && !Number.isInteger(number))) return { problem: t().elicitNotANumber(text) };
    if ((field.minimum !== undefined && number < field.minimum) || (field.maximum !== undefined && number > field.maximum)) return { problem: t().elicitOutOfRange(field.minimum, field.maximum) };
    return number;
  }
  return text;
}

/** Asks for a form field by field, with the port's usual panels: a choice for options and yes/no, text for the rest. */
async function askFieldByField(runDir: string, request: FormRequest): Promise<FormAnswer> {
  const shown = await askForDecision(runDir, {
    title: t().elicitTitle(request.server),
    lines: [request.message, "", ...request.fields.map((field) => `- ${field.title}${field.required ? " *" : ""}${field.description ? `: ${field.description}` : ""}`)],
    question: t().elicitQuestion,
  });
  if (shown === "n") return { action: "decline" };
  if (shown !== "y" && shown !== "") return { action: "cancel" };
  const content: Record<string, string | number | boolean | string[]> = {};
  for (const field of request.fields) {
    const prompt = { title: `${request.server}: ${field.title}${field.required ? " *" : ""}`, lines: field.description ? [field.description] : [] };
    if (field.options || field.type === "boolean") {
      const options = field.options ?? [
        { value: "true", label: t().yes },
        { value: "false", label: t().no },
      ];
      const answer = await askForChoice(runDir, prompt, options.map((option) => option.label), Boolean(field.multiple));
      const chosen = answer.chosen.map((label) => options.find((option) => option.label === label)!.value);
      if (!chosen.length) {
        if (field.required) return { action: "decline" };
        continue;
      }
      content[field.key] = field.multiple ? chosen : field.type === "boolean" ? chosen[0] === "true" : field.type === "string" ? chosen[0]! : Number(chosen[0]);
      continue;
    }
    // Typed: asked again while it isn't a value of its type.
    for (let tries = 0; ; tries++) {
      const typed = await askForText(runDir, tries ? { ...prompt, lines: [...prompt.lines, t().elicitAgain] } : prompt);
      if (!typed.trim()) {
        if (field.required) return { action: "decline" };
        break;
      }
      const value = fieldValue(field, typed);
      if (typeof value === "object" && !Array.isArray(value)) {
        if (tries >= 2) return { action: "decline" };
        continue;
      }
      content[field.key] = value;
      break;
    }
  }
  return { action: "accept", content };
}

/** A page a server asks the person to open (a sign-in elsewhere): shown, never opened for them; only https, or http on this computer. */
async function askToOpen(runDir: string, request: ElicitationRequest): Promise<FormAnswer> {
  const url = request.url ?? "";
  const safe = /^https:\/\//i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(url);
  if (!safe) return { action: "decline" };
  const answer = await askForManualIntervention(runDir, { title: t().elicitUrlTitle(request.serverName), lines: [request.message, "", url], question: t().elicitUrlQuestion });
  return answer === "n" || answer === "q" ? { action: "decline" } : { action: "accept" };
}

/**
 * The session's `onElicitation`: in every mode but autonomous (`asks()`), the request goes to the
 * person through the interaction port; otherwise, or with no port, it's declined.
 */
export function createElicitationHandler(runDir: string, asks: () => boolean): (request: ElicitationRequest, options: { signal: AbortSignal }) => Promise<ElicitationResult> {
  return async (request, { signal }) => {
    const port = getInteractionPort();
    if (!asks() || !port) return { action: "decline" };
    if (request.mode === "url") return await askToOpen(runDir, request);
    const form: FormRequest = { server: request.displayName ?? request.serverName, message: request.message, fields: formFields(request.requestedSchema) };
    if (port.askForm) return await port.askForm(form, signal);
    return await askFieldByField(runDir, form);
  };
}

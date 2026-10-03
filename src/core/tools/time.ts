import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

/**
 * The date and time, and date arithmetic, for every agent: the kit puts no date in the
 * prompt and only subagents have Bash, so without these an agent can't know what day it
 * is, and models get "days until" and "three weeks from" wrong often enough to matter
 * (deadlines, a course's calendar). Only reads: the plan gate lets the server through.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "now" in `timeZone`, as calendar parts. */
export function nowIn(timeZone: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "longOffset",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    date,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
    weekday: WEEKDAYS[toDay(date).getUTCDay()],
    timeZone,
    utcOffset: (parts.timeZoneName as string).replace("GMT", "") || "+00:00",
    utc: now.toISOString(),
  };
}

/** A YYYY-MM-DD calendar date as midnight UTC, so arithmetic never meets daylight saving. */
function toDay(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`"${date}" isn't a date in YYYY-MM-DD form.`);
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (day.toISOString().slice(0, 10) !== date) throw new Error(`"${date}" isn't a real date.`);
  return day;
}

const fromDay = (day: Date): string => day.toISOString().slice(0, 10);
const isWorkingDay = (day: Date): boolean => day.getUTCDay() !== 0 && day.getUTCDay() !== 6;

/** Days, weeks and working days (Monday to Friday) from `from` to `to`; negative when `to` is earlier. */
export function dateDifference(from: string, to: string) {
  const start = toDay(from);
  const end = toDay(to);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  // Working days counted from the day after the earlier date up to the later one included, as
  // "in N working days"; the same count, negative, when `to` is earlier.
  const [first, last] = days < 0 ? [end, start] : [start, end];
  let workingDays = 0;
  for (let day = first.getTime() + DAY_MS; day <= last.getTime(); day += DAY_MS) if (isWorkingDay(new Date(day))) workingDays++;
  return { from, to, days, weeks: Math.trunc(days / 7), remainderDays: days % 7, workingDays: days < 0 ? -workingDays : workingDays, toWeekday: WEEKDAYS[end.getUTCDay()] };
}

export type DateUnit = "days" | "weeks" | "months" | "working_days";

/** `date` plus `amount` (negative to go back) `unit`s; months keep the day, or the month's last one. */
export function dateAdd(date: string, amount: number, unit: DateUnit) {
  if (!Number.isInteger(amount)) throw new Error("The amount must be a whole number.");
  const start = toDay(date);
  let result: Date;
  if (unit === "days" || unit === "weeks") {
    result = new Date(start.getTime() + amount * (unit === "weeks" ? 7 : 1) * DAY_MS);
  } else if (unit === "months") {
    const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + amount, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    result = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(start.getUTCDate(), lastDay)));
  } else {
    result = start;
    const step = Math.sign(amount);
    for (let left = Math.abs(amount); left > 0; ) {
      result = new Date(result.getTime() + step * DAY_MS);
      if (isWorkingDay(result)) left--;
    }
  }
  return { date: fromDay(result), weekday: WEEKDAYS[result.getUTCDay()] };
}

const text = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });
const failure = (error: unknown) => ({ content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }], isError: true });

/** The time zone the tools answer in: `timeZone` if valid, otherwise the system's. */
export function resolveTimeZone(timeZone?: string): string {
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZone) return system;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    throw new Error(`Unknown time zone "${timeZone}" (an IANA name, e.g. "Europe/Madrid").`);
  }
}

/** `current_time` and `date_math`, in `timeZone` (an IANA name; the system's if not given). */
export function createTimeServer(timeZone?: string) {
  const zone = resolveTimeZone(timeZone);
  const currentTime = tool(
    "current_time",
    "The current date and time: the local date (YYYY-MM-DD), time, weekday, time zone and UTC offset, and the instant in UTC. Use it whenever you need today's date or the time; don't guess them.",
    {},
    async () => text(nowIn(zone)),
    { annotations: { readOnlyHint: true } },
  );
  const dateMath = tool(
    "date_math",
    'Exact date arithmetic on calendar dates (YYYY-MM-DD, local). "difference": days, weeks and working days (Monday to Friday) from `from` to `to`. "add": `from` plus `amount` (negative to go back) days, weeks, months or working days. `from` defaults to today. Use it instead of counting dates yourself.',
    {
      operation: z.enum(["difference", "add"]),
      from: z.string().optional().describe("Start date, YYYY-MM-DD; today if omitted"),
      to: z.string().optional().describe('End date, YYYY-MM-DD (for "difference")'),
      amount: z.number().int().optional().describe('How many units to add, negative to subtract (for "add")'),
      unit: z.enum(["days", "weeks", "months", "working_days"]).optional().describe('The unit of `amount` (for "add"); days if omitted'),
    },
    async (args) => {
      try {
        const from = args.from ?? nowIn(zone).date;
        if (args.operation === "difference") {
          if (!args.to) throw new Error('"difference" needs `to`.');
          return text(dateDifference(from, args.to));
        }
        if (args.amount === undefined) throw new Error('"add" needs `amount`.');
        return text({ from, ...dateAdd(from, args.amount, args.unit ?? "days") });
      } catch (error) {
        return failure(error);
      }
    },
    { annotations: { readOnlyHint: true } },
  );
  return createSdkMcpServer({ name: "time", version: "1.0.0", tools: [currentTime, dateMath] });
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { dateAdd, dateDifference, nowIn, resolveTimeZone } from "../../../src/core/tools/time.js";
import { buildSessionOptions } from "../../../src/core/session.js";
import { checkPlanScope } from "../../../src/core/hooks/planGate.js";
import { createFriendlyToolLabel } from "../../../src/core/toolLabels.js";
import { setLanguage } from "../../../src/core/messages/index.js";

test("now in a time zone: its calendar date, time, weekday and offset", () => {
  const instant = new Date("2026-10-01T23:30:00Z");
  const madrid = nowIn("Europe/Madrid", instant);
  assert.deepEqual(
    { date: madrid.date, time: madrid.time, weekday: madrid.weekday, offset: madrid.utcOffset },
    { date: "2026-10-02", time: "01:30:00", weekday: "Friday", offset: "+02:00" },
  );
  assert.equal(nowIn("UTC", instant).date, "2026-10-01");
  assert.equal(nowIn("UTC", instant).utcOffset, "+00:00");
});

test("differences in days, weeks and working days, across months, leap years and daylight saving", () => {
  assert.deepEqual(dateDifference("2026-10-01", "2026-11-15"), {
    from: "2026-10-01",
    to: "2026-11-15",
    days: 45,
    weeks: 6,
    remainderDays: 3,
    workingDays: 31,
    toWeekday: "Sunday",
  });
  // 25 October 2026 is a daylight saving change in Europe: still whole days.
  assert.equal(dateDifference("2026-10-24", "2026-10-26").days, 2);
  assert.equal(dateDifference("2028-02-28", "2028-03-01").days, 2); // leap year
  assert.equal(dateDifference("2026-11-15", "2026-10-01").days, -45);
  assert.equal(dateDifference("2026-11-15", "2026-10-01").workingDays, -31);
  // Friday to Monday: one working day.
  assert.equal(dateDifference("2026-10-02", "2026-10-05").workingDays, 1);
});

test("adding days, weeks, months and working days", () => {
  assert.deepEqual(dateAdd("2026-10-01", 3, "weeks"), { date: "2026-10-22", weekday: "Thursday" });
  assert.equal(dateAdd("2026-01-31", 1, "months").date, "2026-02-28"); // the month's last day
  assert.equal(dateAdd("2028-01-31", 1, "months").date, "2028-02-29");
  assert.equal(dateAdd("2026-03-31", -1, "months").date, "2026-02-28");
  assert.equal(dateAdd("2026-10-02", 1, "working_days").date, "2026-10-05"); // Friday + 1 = Monday
  assert.equal(dateAdd("2026-10-05", -1, "working_days").date, "2026-10-02");
  assert.equal(dateAdd("2026-12-31", 1, "days").date, "2027-01-01");
});

test("bad dates and time zones are refused with the reason", () => {
  assert.throws(() => dateDifference("2026-02-30", "2026-03-01"), /isn't a real date/);
  assert.throws(() => dateAdd("1/10/2026", 1, "days"), /YYYY-MM-DD/);
  assert.throws(() => dateAdd("2026-10-01", 1.5, "days"), /whole number/);
  assert.throws(() => resolveTimeZone("Mars/Olympus"), /Unknown time zone/);
  assert.equal(resolveTimeZone("Atlantic/Canary"), "Atlantic/Canary");
});

test("every session has the time server, in every mode, and plan mode lets it through", async () => {
  const runDir = await mkdtemp(path.join(tmpdir(), "agent-kit-"));
  try {
    const spec = { buildSystemPrompt: () => "test", buildMcpServers: () => ({}), pluginRoots: () => [], buildSubagents: () => undefined };
    for (const mode of ["autonomous", "guided", "plan"] as const) {
      const { options } = await buildSessionOptions({ mode, projectDir: runDir, timeZone: "UTC" }, runDir, spec);
      assert.ok(options.mcpServers?.time, mode);
    }
    assert.equal(checkPlanScope({ projectDir: runDir }, "mcp__time__current_time", {}), undefined);
    assert.equal(checkPlanScope({ projectDir: runDir }, "mcp__time__date_math", {}), undefined);
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
});

test("the time tools have friendly labels", () => {
  setLanguage("en");
  const label = createFriendlyToolLabel();
  assert.equal(label("mcp__time__current_time", {}), "Checking the date and time");
  assert.equal(label("mcp__time__date_math", { operation: "add" }), "Calculating dates");
});

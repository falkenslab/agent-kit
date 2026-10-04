import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agentKitVersion } from "../../src/core/version.js";

test("agentKitVersion() is the version in the kit's package.json", () => {
  const { version } = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string };
  assert.equal(agentKitVersion(), version);
  assert.match(agentKitVersion(), /^\d+\.\d+\.\d+/);
});

import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { BaseSessionConfig } from "../../core/agentSpec.js";
import { describeCapability } from "../../core/extensions.js";
import { extensionCatalog, knownMarketplaces, marketplacesDir, type CatalogEntry } from "../../core/extensionCatalog.js";
import { extensionOptionStates, listInstalled, type ExtensionDirs } from "../../core/externalExtensions.js";
import { updateMarketplace } from "../../core/marketplaces.js";
import type { SessionFacts } from "../../core/sessionFacts.js";

/**
 * The agent as an advisor on extensions (#64): `extensions_catalog` tells it what's installed and
 * how it stands, what its catalogs offer (from their copies on this computer, instant and offline),
 * and, with `refresh`, what's new in them, so it can suggest an extension the person lacks. It
 * never installs, enables or configures anything: refreshing renews the catalogs' copies only, so
 * the tool stays read-only for plan mode.
 */

const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });

/** How long ago an ISO date was, as the model reads it. */
function age(iso: string, now: number): string {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  return Number.isNaN(days) ? "at an unknown time" : days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

/** A catalog entry in one line: what installs it, what it is and does, what it needs, where it talks to, how it stands here. */
function describeEntry(entry: CatalogEntry): string {
  const parts = [`- **${entry.spec}**${entry.version ? ` ${entry.version}` : ""}: ${entry.description || "(no description)"}`];
  if (entry.capabilities.length) parts.push(`Can: ${entry.capabilities.map(({ id, label }) => `${label} (${id})`).join(", ")}.`);
  if (entry.requirements.length) parts.push(`Needs on the computer: ${entry.requirements.map(({ name, for: needed }) => (needed.length ? `${name} (for ${needed.join(", ")})` : name)).join(", ")}.`);
  if (entry.remote.length) parts.push(`Talks to ${entry.remote.join(", ")}.`);
  if (entry.topics.length) parts.push(`Topics: ${entry.topics.join(", ")}.`);
  parts.push(entry.installed ? (entry.update ? `Installed, with an update here: \`/extensions update ${entry.plugin.name}\`.` : "Installed.") : `Not installed: \`/extensions install ${entry.spec}\`.`);
  return parts.join(" ");
}

/** The awareness's catalog tool, over the agent's extension folders and its own marketplace and topics. */
export function createCatalogTool(config: BaseSessionConfig, session: () => Promise<SessionFacts>) {
  const dirs: ExtensionDirs | undefined = config.extensionDirs;
  const official = config.officialMarketplace;
  const topics = config.catalogTopics;
  // At most one fetch per marketplace and session: a second "what's new" answers from that copy.
  const refreshed = new Set<string>();

  return tool(
    "extensions_catalog",
    "Your extensions and your catalogs: what's installed here and how it stands (running, or off and why, options missing), what the catalogs you know offer (from their copies on this computer, with each copy's age) and, with `refresh: true`, what's new in them online. With `words`, only what matches (name, description, capabilities, topics). Read-only: it never installs, enables or configures anything; installing is the person's, with `/extensions install <name>@<marketplace>`.",
    {
      words: z.string().optional().describe("A few words of the task or extension to look for, e.g. `grading rubrics` or `weather`. Without them, everything."),
      refresh: z.boolean().optional().describe("Fetch the catalogs again from their source first, and say what's new: only when the person asks what's new, or the copies are over a week old."),
    },
    async ({ words, refresh }) => {
      if (!dirs || !marketplacesDir(dirs)) return ok("This agent has no folder for extensions: it can't install any. Say so if the person asks for one.");
      const now = Date.now();
      const sections: string[] = [];

      // What's installed, and how it stands in this session.
      const facts = await session().catch(() => undefined);
      const running = new Set(facts?.extensions.active.map(({ name }) => name) ?? []);
      const off = new Map(facts?.extensions.inactive.map(({ name, reason }) => [name, reason]) ?? []);
      const installed = (await listInstalled(dirs)).filter((extension) => !extension.shadowed);
      const installedLines = await Promise.all(
        installed.map(async (extension) => {
          const state = !extension.lock.enabled ? "disabled (`/extensions enable " + extension.name + "`)" : running.has(extension.name) ? "running" : off.has(extension.name) ? `off: it ${off.get(extension.name)}` : "enabled, from the next session";
          const missing = (await extensionOptionStates(extension).catch(() => [])).filter(({ option, set }) => option.required && !set).map(({ key }) => key);
          const can = (extension.manifest?.capabilities ?? []).map((capability) => describeCapability(capability, "en").label);
          return `- **${extension.name}**${extension.manifest?.version ? ` ${extension.manifest.version}` : ""} (${extension.scope} scope): ${state}.${can.length ? ` Can: ${can.join(", ")}.` : ""}${missing.length ? ` Options to set: ${missing.join(", ")} (\`/extensions config ${extension.name}\`; a secret through the agent's settings or \`extension config\`, never in the chat).` : ""}`;
        }),
      );
      sections.push(`## Installed here\n\n${installedLines.join("\n") || "None."}`);

      // Fetching the catalogs again, when asked: what's new, compared with the copies before.
      let before: CatalogEntry[] = [];
      const failed: string[] = [];
      if (refresh) {
        before = await extensionCatalog(dirs, { ...(official ? { official } : {}), ...(topics?.length ? { topics } : {}), language: "en" }).catch(() => []);
        for (const marketplace of await knownMarketplaces(dirs, official).catch(() => [])) {
          if (refreshed.has(marketplace.name)) continue;
          refreshed.add(marketplace.name);
          await updateMarketplace(marketplacesDir(dirs)!, marketplace.name).catch(() => failed.push(marketplace.name));
        }
      }

      const known = await knownMarketplaces(dirs, official).catch(() => []);
      const entries = await extensionCatalog(dirs, {
        ...(official ? { official } : {}),
        ...(topics?.length ? { topics } : {}),
        ...(words?.trim() ? { words: words.trim().split(/\s+/) } : {}),
        language: "en",
      }).catch(() => [] as CatalogEntry[]);
      const copies = known.map((marketplace) => `${marketplace.name}${marketplace.official ? " (yours)" : ""}, copied ${age(marketplace.updated, now)}`).join("; ");
      sections.push(
        `## Offered by your catalogs\n\n${known.length ? `From their copies on this computer: ${copies}.` : "No catalog is known: the person adds one with `/extensions` (a marketplace)."}${words?.trim() ? ` Matching "${words.trim()}".` : ""}\n\n${entries.map(describeEntry).join("\n") || "Nothing matches."}`,
      );

      if (refresh) {
        const was = new Map(before.map((entry) => [entry.spec, entry.version]));
        const added = entries.filter((entry) => !was.has(entry.spec));
        const updates = entries.filter((entry) => entry.update);
        const lines = [...added.map((entry) => `- New: **${entry.spec}**${entry.version ? ` ${entry.version}` : ""}: ${entry.description}`), ...updates.map((entry) => `- A newer version of **${entry.plugin.name}**: ${entry.version}.`)];
        const unreachable = failed.length ? `\n\nCouldn't fetch ${failed.join(", ")} (no network, or it's unavailable): what's above is its copy on this computer.` : "";
        sections.push(`## What's new online\n\n${lines.join("\n") || "Nothing new since the last copies."}${unreachable}`);
      }

      return ok(sections.join("\n\n"));
    },
    { annotations: { readOnlyHint: true } },
  );
}

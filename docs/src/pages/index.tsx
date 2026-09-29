import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import styles from "./index.module.css";

const FEATURES: { title: string; text: string }[] = [
  {
    title: "Oversight you choose",
    text: "Autonomous, guided (approval before anything visible or hard to undo) or step by step. Switch between guided and step by step in the middle of a conversation.",
  },
  {
    title: "Guardrails in hooks, not prompts",
    text: "File scope, protected paths, Bash only for subagents, only declared subagents, always in the foreground. Enforced on every tool call.",
  },
  {
    title: "Memory between sessions",
    text: "A built-in knowledge base the agent keeps as a wiki, originals kept untouched, and every conversation resumable with --continue or /resume.",
  },
  {
    title: "A terminal UI like Claude Code",
    text: "Full screen Ink chat with live markdown, folded tool calls, approval panels, history search, file mentions, themes and four languages.",
  },
  {
    title: "Your domain, nothing else",
    text: "An AgentSpec says who the agent is and what it has: prompt, MCP servers, skills, subagents. The kit wires the session around it.",
  },
  {
    title: "Also without a terminal",
    text: "The core never touches the terminal: drive the same agent from an Electron app or a server with a normalized event stream.",
  },
];

const MINIMAL = `import path from "node:path";
import { buildSessionOptions, ensureClaudeAuth, runChatInk, type AgentSpec, type BaseSessionConfig } from "@falkenslab/agent-kit";

const spec: AgentSpec<BaseSessionConfig> = {
  buildSystemPrompt: () => "You are a pirate cat who tells jokes. Always answer in character.",
  buildMcpServers: () => ({}),
  pluginRoots: () => [],
  buildSubagents: () => undefined,
};

await ensureClaudeAuth();
const config: BaseSessionConfig = { mode: "guided", projectDir: process.cwd() };

await runChatInk((run) => buildSessionOptions(config, run.dir, spec, { run }), {
  runsDir: path.resolve(".run"),
  header: { title: "My agent" },
  mode: config.mode,
  fullscreen: true,
});`;

export default function Home(): ReactNode {
  return (
    <Layout title="Build Claude agents" description="agent-kit: scaffolding for agents on top of the Claude Agent SDK">
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>agent-kit</h1>
          <p className={styles.tagline}>
            Everything an agent built on the Claude Agent SDK needs, solved once: human oversight, safety, memory and a terminal
            interface. You write only your domain.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/installation">
              Get started
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/api">
              API reference
            </Link>
          </div>
          <code className={styles.install}>npm install @falkenslab/agent-kit</code>
        </div>
      </header>
      <main className="container margin-vert--xl">
        <div className="row">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="col col--4 margin-bottom--lg">
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
        <div className="row margin-top--lg">
          <div className="col col--6">
            <h2>A whole agent in one file</h2>
            <p>
              The spec says who the agent is; <code>buildSessionOptions()</code> turns it into the SDK's session options, with the
              tools, hooks and guardrails of the chosen mode; <code>runChatInk()</code> gives it a full screen chat whose
              conversations can be resumed.
            </p>
            <CodeBlock language="ts">{MINIMAL}</CodeBlock>
          </div>
          <div className="col col--6">
            <h2>Captain Whiskers</h2>
            <p>
              The kit's example agent: a retired pirate cat with a crew of subagents, its own tools and skills, a theme and its texts in
              four languages. <Link to="/docs/examples/captain-whiskers">Walk through it</Link>.
            </p>
            <img src={useBaseUrl("/captain-whiskers.png")} alt="Captain Whiskers running full screen in Windows Terminal" />
          </div>
        </div>
      </main>
    </Layout>
  );
}

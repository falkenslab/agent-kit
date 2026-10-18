import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Translate, { translate } from "@docusaurus/Translate";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import ThemedImage from "@theme/ThemedImage";
import styles from "./index.module.css";

// Every text through Docusaurus' translations (i18n/<locale>/code.json), under stable ids.
const FEATURES: { title: string; text: string }[] = [
  {
    title: translate({ id: "home.feature.oversight.title", message: "Oversight you choose" }),
    text: translate({
      id: "home.feature.oversight.text",
      message: "Autonomous, guided (approval before anything visible or hard to undo) or step by step. Switch between guided and step by step in the middle of a conversation.",
    }),
  },
  {
    title: translate({ id: "home.feature.guardrails.title", message: "Guardrails in hooks, not prompts" }),
    text: translate({
      id: "home.feature.guardrails.text",
      message: "File scope, protected paths, Bash only for subagents, only declared subagents, always in the foreground. Enforced on every tool call.",
    }),
  },
  {
    title: translate({ id: "home.feature.memory.title", message: "Memory between sessions" }),
    text: translate({
      id: "home.feature.memory.text",
      message: "A built-in knowledge base the agent keeps as a wiki, originals kept untouched, and every conversation resumable with --continue or /resume.",
    }),
  },
  {
    title: translate({ id: "home.feature.terminal.title", message: "A terminal UI like Claude Code" }),
    text: translate({
      id: "home.feature.terminal.text",
      message: "Full screen Ink chat with live markdown, folded tool calls, approval panels, history search, file mentions, themes and four languages.",
    }),
  },
  {
    title: translate({ id: "home.feature.domain.title", message: "Your domain, nothing else" }),
    text: translate({
      id: "home.feature.domain.text",
      message: "An AgentSpec says who the agent is and what it has: prompt, MCP servers, skills, subagents. The kit wires the session around it.",
    }),
  },
  {
    title: translate({ id: "home.feature.headless.title", message: "Also without a terminal" }),
    text: translate({
      id: "home.feature.headless.text",
      message: "The core never touches the terminal: drive the same agent from an Electron app or a server with a normalized event stream.",
    }),
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
    <Layout
      title={translate({ id: "home.title", message: "Build Claude agents" })}
      description={translate({ id: "home.description", message: "agent-kit: scaffolding for agents on top of the Claude Agent SDK" })}
    >
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>
            <ThemedImage
              className={styles.logo}
              alt="agent-kit"
              sources={{ light: useBaseUrl("/logo-readme.svg"), dark: useBaseUrl("/logo-readme-dark.svg") }}
            />
          </h1>
          <p className={styles.tagline}>
            <Translate id="home.tagline">
              Everything an agent built on the Claude Agent SDK needs, solved once: human oversight, safety, memory and a terminal interface. You write only your domain.
            </Translate>
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/installation">
              <Translate id="home.getStarted">Get started</Translate>
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/api">
              <Translate id="home.apiReference">API reference</Translate>
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
            <h2>
              <Translate id="home.oneFile.title">A whole agent in one file</Translate>
            </h2>
            <p>
              <Translate
                id="home.oneFile.text"
                values={{ build: <code>buildSessionOptions()</code>, chat: <code>runChatInk()</code> }}
              >
                {"The spec says who the agent is; {build} turns it into the SDK's session options, with the tools, hooks and guardrails of the chosen mode; {chat} gives it a full screen chat whose conversations can be resumed."}
              </Translate>
            </p>
            <CodeBlock language="ts">{MINIMAL}</CodeBlock>
          </div>
          <div className="col col--6">
            <h2>Captain Whiskers</h2>
            <p>
              <Translate
                id="home.captain.text"
                values={{
                  walk: (
                    <Link to="/docs/examples/captain-whiskers">
                      <Translate id="home.captain.walk">Walk through it</Translate>
                    </Link>
                  ),
                }}
              >
                {"The kit's example agent: a retired pirate cat with a crew of subagents, its own tools and skills, a theme and its texts in four languages. {walk}."}
              </Translate>
            </p>
            <img
              src={useBaseUrl("/captain-whiskers.png")}
              alt={translate({ id: "home.captain.alt", message: "Captain Whiskers running full screen in Windows Terminal" })}
            />
          </div>
        </div>
      </main>
    </Layout>
  );
}

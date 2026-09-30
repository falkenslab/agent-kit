import { existsSync, readFileSync } from "node:fs";
import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// Released versions, newest first (`npm run docs:version -- <version>` at each release). The
// newest is what /docs shows; the work in progress on main is "Next", under /docs/next.
const versions: string[] = existsSync("./versions.json") ? JSON.parse(readFileSync("./versions.json", "utf8")) : [];

const config: Config = {
  title: "agent-kit",
  tagline: "Build Claude agents with human oversight, safety, memory and a terminal UI, on top of the Claude Agent SDK.",
  favicon: "img/favicon.svg",

  url: "https://falkenslab.github.io",
  baseUrl: "/agent-kit/",
  organizationName: "falkenslab",
  projectName: "agent-kit",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",
  markdown: {
    mermaid: true,
    // .md files (the guides and the generated API reference) are CommonMark, not MDX: doc
    // comments are full of `<placeholders>` MDX would read as tags.
    format: "detect",
    hooks: { onBrokenMarkdownLinks: "throw" },
  },

  i18n: { defaultLocale: "en", locales: ["en"] },

  // `assets/` is shared with the repository's README (the Captain Whiskers screenshot).
  staticDirectories: ["static", "assets"],

  presets: [
    [
      "classic",
      {
        docs: {
          path: "content",
          routeBasePath: "docs",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/falkenslab/agent-kit/edit/main/docs/",
          // Before the first versioned release, main is the only version, served at /docs.
          ...(versions.length > 0
            ? {
                lastVersion: versions[0],
                versions: { current: { label: "Next (unreleased)", path: "next", banner: "unreleased" } },
              }
            : { versions: { current: { label: "Next (unreleased)" } } }),
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["../src/index.ts"],
        tsconfig: "../tsconfig.json",
        out: "content/api",
        readme: "none",
        excludePrivate: true,
        excludeInternal: true,
        excludeExternals: true,
        disableSources: false,
        sourceLinkTemplate: "https://github.com/falkenslab/agent-kit/blob/main/{path}#L{line}",
        gitRevision: "main",
        parametersFormat: "table",
        interfacePropertiesFormat: "table",
        typeDeclarationFormat: "table",
        enumMembersFormat: "table",
        indexFormat: "table",
        useCodeBlocks: true,
        expandObjects: false,
        sidebar: { pretty: true },
      },
    ],
  ],

  themes: [
    "@docusaurus/theme-mermaid",
    [
      "@easyops-cn/docusaurus-search-local",
      { hashed: true, docsDir: "content", docsRouteBasePath: "docs", indexBlog: false, highlightSearchTermsOnTargetPage: true },
    ],
  ],

  themeConfig: {
    image: "captain-whiskers.png",
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "agent-kit",
      logo: { alt: "agent-kit", src: "img/logo.svg", srcDark: "img/logo-dark.svg" },
      items: [
        { type: "docSidebar", sidebarId: "guides", position: "left", label: "Guides" },
        { type: "docSidebar", sidebarId: "api", position: "left", label: "API reference" },
        { type: "docsVersionDropdown", position: "right" },
        { href: "https://www.npmjs.com/package/@falkenslab/agent-kit", label: "npm", position: "right" },
        { href: "https://github.com/falkenslab/agent-kit", label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "Getting started", to: "/docs/getting-started/installation" },
            { label: "API reference", to: "/docs/api" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "GitHub", href: "https://github.com/falkenslab/agent-kit" },
            { label: "npm", href: "https://www.npmjs.com/package/@falkenslab/agent-kit" },
            { label: "Design decisions (ADRs)", href: "https://github.com/falkenslab/agent-kit/tree/main/.minispec/decisions" },
          ],
        },
        {
          title: "Related",
          items: [
            { label: "Claude Agent SDK", href: "https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk" },
            { label: "Captain Whiskers example", href: "https://github.com/falkenslab/agent-kit/tree/main/examples/captain-whiskers" },
          ],
        },
      ],
      copyright: `MIT licensed. Copyright © ${new Date().getFullYear()} Francisco Vargas Ruiz.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "diff"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

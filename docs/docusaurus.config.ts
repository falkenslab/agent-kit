import { existsSync, readFileSync } from "node:fs";
import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// Released versions, newest first (`npm run docs:version -- <version>` at each release). The
// newest is what /docs shows; the work in progress on main is "Next", under /docs/next. Only
// those two are kept and built: in 0.x nobody stays on an old version, and each release's
// documentation is still in its git tag. The release removes the previous one.
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

  // The guides in Spanish too, under /es/ (their translations in i18n/es/); the API reference,
  // generated from the code's doc comments, stays in English in both.
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    localeConfigs: { en: { label: "English" }, es: { label: "Español" } },
  },

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
          // A page's source in its language: the English under content/, a translation under i18n/<locale>/.
          editUrl: ({ locale, versionDocsDirPath, docPath }) =>
            locale === "en"
              ? `https://github.com/falkenslab/agent-kit/edit/main/docs/${versionDocsDirPath}/${docPath}`
              : `https://github.com/falkenslab/agent-kit/edit/main/docs/i18n/${locale}/docusaurus-plugin-content-docs/${versionDocsDirPath === "content" ? "current" : versionDocsDirPath.replace(/^versioned_docs\//, "")}/${docPath}`,
          // Before the first versioned release, main is the only version, served at /docs.
          ...(versions.length > 0
            ? {
                lastVersion: versions[0],
                onlyIncludeVersions: ["current", versions[0]!],
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
      { hashed: true, language: ["en", "es"], docsDir: "content", docsRouteBasePath: "docs", indexBlog: false, highlightSearchTermsOnTargetPage: true },
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
        { type: "localeDropdown", position: "right" },
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
      // Falken's Lab's signature, the footer's only line, never translated.
      copyright: "Made with 💖 by Falken's Lab Team",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "diff"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

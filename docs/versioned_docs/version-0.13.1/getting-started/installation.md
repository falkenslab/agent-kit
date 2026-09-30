---
sidebar_position: 1
title: Installation
description: Install agent-kit in a new or existing Node.js project.
---

# Installation

## Requirements

- **Node.js 20 or later.** The kit uses `process.loadEnvFile()`, top-level `await` in examples and other modern Node APIs.
- **An ES module project.** The kit is published as ESM only: your `package.json` needs `"type": "module"` (or your files use the `.mjs`/`.mts` extension).
- **TypeScript is recommended but optional.** Types ship with the package (`dist/index.d.ts`). The examples in this documentation are TypeScript run with [`tsx`](https://tsx.is/), which needs no build step.
- **Claude authentication**: a Claude Pro/Max subscription token or an Anthropic API key (see [Authentication](authentication.md)).

## Install

```bash
npm install @falkenslab/agent-kit
```

The kit depends on `@anthropic-ai/claude-agent-sdk` itself and re-exports the SDK types and functions an agent usually needs (`Options`, `McpServerConfig`, `AgentDefinition`, `tool()`, `createSdkMcpServer()`), so you don't need the SDK in your own `package.json` unless you call `query()` directly.

For TypeScript without a build step:

```bash
npm install --save-dev tsx typescript @types/node
```

A minimal `package.json`:

```json title="package.json"
{
  "name": "my-agent",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "tsx agent.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@falkenslab/agent-kit": "^0.13.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

And a `tsconfig.json` that matches how the kit is built:

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["**/*.ts"]
}
```

## Everything comes from the package root

Every public symbol is exported from `@falkenslab/agent-kit` itself. Never import from `@falkenslab/agent-kit/dist/...`: internal paths change between versions without notice.

```ts
import { buildSessionOptions, runChatInk, ui, type AgentSpec } from "@falkenslab/agent-kit";
```

## Trying a local clone of the kit

To try changes to the kit without publishing it, point your agent at a local clone and build the kit after each change:

```json
"dependencies": {
  "@falkenslab/agent-kit": "file:../agent-kit"
}
```

```bash
cd ../agent-kit && npm install && npm run build
```

The example agent in the kit's repository, [Captain Whiskers](../examples/captain-whiskers.md), is set up exactly like this.

## Versions

The kit follows semantic versioning while in `0.x`: a minor version (`0.12.0` → `0.13.0`) may change behavior or the API, a patch version doesn't. Read the [release notes](https://github.com/falkenslab/agent-kit/releases) before bumping, and see [Versioning](../reference/versioning.md) for how this documentation follows the versions.

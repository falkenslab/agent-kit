---
sidebar_position: 1
title: Instalación
description: Instala agent-kit en un proyecto de Node.js nuevo o existente.
---

# Instalación

## Requisitos {#requirements}

- **Node.js 20 o posterior.** El kit usa `process.loadEnvFile()`, `await` de nivel superior en los ejemplos y otras API modernas de Node.
- **Un proyecto de módulos ES.** El kit se publica solo como ESM: tu `package.json` necesita `"type": "module"` (o tus ficheros usan la extensión `.mjs`/`.mts`).
- **TypeScript es recomendable, pero opcional.** Los tipos vienen con el paquete (`dist/index.d.ts`). Los ejemplos de esta documentación son TypeScript ejecutado con [`tsx`](https://tsx.is/), que no necesita paso de compilación.
- **Claude**: una cuenta de Claude (Pro/Max) con la que la persona inicia sesión en la propia página de Anthropic, o una clave de API de Anthropic (consulta [Autenticación](authentication.md)).

## Instalar {#install}

```bash
npm install @falkenslab/agent-kit
```

El kit depende él mismo de `@anthropic-ai/claude-agent-sdk` y reexporta los tipos y funciones del SDK que un agente suele necesitar (`Options`, `McpServerConfig`, `AgentDefinition`, `tool()`, `createSdkMcpServer()`), así que no necesitas el SDK en tu propio `package.json` salvo que llames a `query()` directamente.

### Bibliotecas opcionales {#optional-libraries}

Unas pocas herramientas del kit necesitan bibliotecas que solo instalas si tu agente las usa (son dependencias peer opcionales, así que npm no las instala por ti):

| Para | Instala |
| --- | --- |
| Leer originales DOCX, PPTX y XLSX (`extract_text`) | `npm install mammoth fflate turndown` |
| Guardar una página web descargada como markdown (`download_to_sources`) | `npm install @mozilla/readability linkedom turndown` |
| Instalar extensiones desde fuentes `npm` o `archive` de un marketplace | `npm install fflate` |

Sin ellas, esas herramientas (y esas instalaciones) dicen qué instalar; nada más cambia.

Para TypeScript sin paso de compilación:

```bash
npm install --save-dev tsx typescript @types/node
```

Un `package.json` mínimo:

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

Y un `tsconfig.json` que encaje con cómo se compila el kit:

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

## Todo sale de la raíz del paquete {#everything-comes-from-the-package-root}

Cada símbolo público se exporta desde el propio `@falkenslab/agent-kit`. No importes nunca desde `@falkenslab/agent-kit/dist/...`: las rutas internas cambian entre versiones sin previo aviso.

```ts
import { buildSessionOptions, runChatInk, ui, type AgentSpec } from "@falkenslab/agent-kit";
```

## Probar un clon local del kit {#trying-a-local-clone-of-the-kit}

Para probar cambios en el kit sin publicarlo, apunta tu agente a un clon local y compila el kit después de cada cambio:

```json
"dependencies": {
  "@falkenslab/agent-kit": "file:../agent-kit"
}
```

```bash
cd ../agent-kit && npm install && npm run build
```

El agente de ejemplo del repositorio del kit, [Captain Whiskers](../examples/captain-whiskers.md), está configurado exactamente así.

## Versiones {#versions}

El kit sigue el versionado semántico mientras está en `0.x`: una versión menor (`0.12.0` → `0.13.0`) puede cambiar el comportamiento o la API; una versión de parche, no. Lee las [notas de la versión](https://github.com/falkenslab/agent-kit/releases) antes de actualizar, y consulta [Versionado](../reference/versioning.md) para ver cómo sigue esta documentación a las versiones.

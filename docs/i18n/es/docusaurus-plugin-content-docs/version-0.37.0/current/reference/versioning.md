---
sidebar_position: 3
title: Versionado
description: Cómo se versiona y se publica el kit, y cómo sigue esta documentación las versiones.
---

# Versionado

## El paquete {#the-package}

`@falkenslab/agent-kit` sigue el [versionado semántico](https://semver.org). Mientras esté en `0.x`:

- una versión **minor** (`0.12.0` → `0.13.0`) añade funcionalidades y puede cambiar el comportamiento o la API;
- una versión **patch** (`0.12.0` → `0.12.1`) solo corrige cosas.

Cada versión publicada es una etiqueta de git (`vX.Y.Z`), una [release de GitHub](https://github.com/falkenslab/agent-kit/releases) con notas (funcionalidades nuevas, correcciones, cambios incompatibles con cómo migrar) y la misma versión en [npm](https://www.npmjs.com/package/@falkenslab/agent-kit). Lee las notas antes de actualizar; fija la versión minor que probaste (`"^0.13.0"` solo admite patches mientras esté en `0.x`).

## Esta documentación {#this-documentation}

El sitio mantiene una versión de la documentación por cada versión publicada:

- **el selector de versión** (arriba a la derecha) las lista;
- **la predeterminada es la última versión publicada**, en `/docs`;
- **"Next (unreleased)"** es lo que hay en `main` y aún no se ha publicado, en `/docs/next`, con un aviso;
- las versiones anteriores se quedan en `/docs/<version>`.

Cada versión incluye su propia referencia de la API, generada a partir del código fuente de esa versión.

La documentación forma parte de la publicación: cada cambio en el kit actualiza `docs/` en el mismo cambio, y cada versión publicada guarda una instantánea de ella como versión nueva antes de publicarse.

---
sidebar_position: 8
title: Publicar un marketplace
description: "Publica extensiones como un marketplace de Claude Code: su repositorio, marketplace.json, versiones y topics, catalog.json construido con @falkenslab/agent-kit-catalog, una página pública del catálogo, su CI y ser el marketplace oficial de un agente."
---

# Publicar un marketplace

Las extensiones se publican como un [marketplace de Claude Code](https://code.claude.com/docs/en/plugins/marketplace-reference): un repositorio git (o una carpeta) con `.claude-plugin/marketplace.json`, que las lista. El mismo repositorio sirve a Claude Code y a todos los agentes basados en el kit. El de Falken's Lab es [falkenslab/agent-extensions](https://github.com/falkenslab/agent-extensions).

## El repositorio {#the-repository}

```text
my-extensions/
├── .claude-plugin/marketplace.json   the list: its name, its owner, an entry per extension
├── weather/                          an extension, as in "Writing one"
├── moodle/                           another
├── catalog.json                      the catalog, built (below)
├── site/index.html                   optional: a public page drawn from catalog.json
├── .gitattributes                    * text=auto eol=lf
└── .github/workflows/                validation, the catalog, the page
```

```json title=".claude-plugin/marketplace.json"
{
  "name": "ada",
  "owner": { "name": "Ada Lovelace" },
  "metadata": { "description": "Ada's extensions." },
  "plugins": [
    { "name": "weather", "source": "./weather", "version": "0.1.0", "description": "The weather in your city: today and the next days.", "category": "productivity", "tags": ["weather"] }
  ]
}
```

- **`name`** es cómo se nombran sus extensiones: `weather@ada`.
- **El `source` de una entrada** es dónde está la extensión: una carpeta del repositorio (`./weather`, que se guarda con él, lo más sencillo), u otro repositorio, una carpeta de uno, un paquete de npm o un zip ([Fuentes de un marketplace](reference.md#marketplace-sources)).
- **`version`** debe coincidir con el `plugin.json` de la extensión (si no, Claude Code avisa y el catálogo la rechaza).
- **`description`, `category`, `tags`** se muestran en un catálogo; junto con los `keywords` de la extensión, son sus [topics](installing.md#the-catalog).

La gente lo añade con `claude plugin marketplace add owner/repo` en Claude Code, o con `my-agent extension marketplace add owner/repo` en un agente.

## Topics y públicos {#topics-and-audiences}

Un topic es cualquier palabra sobre la que trata una extensión o para quien es, en minúsculas: `weather`, `moodle`, `teaching`. Un **público** también es un topic: etiqueta una extensión con `miyagi` y un agente que solo ofrece las suyas (`catalogTopics: ["miyagi"]`) la muestra, mientras que uno que ofrece todas las extensiones también la muestra. Así, un mismo marketplace puede servir a varios agentes, cada uno viendo lo que está pensado para él.

## El fichero del catálogo {#the-catalog-file}

Fuera de un agente, un marketplace muestra sus extensiones a partir de un fichero, `catalog.json` en su raíz: el nombre de cada extensión, su versión, su descripción (y `descriptions` por idioma, cuando tiene otros además del inglés), topics, categoría, autor, enlaces, comandos de instalación, sus README por idioma (`readmes`, cuando tiene un `README.es.md` u otro), sus [capacidades](overview.md#capabilities) (en todos los idiomas que da, para que la página elija), los programas que [necesita](writing.md#programs-it-needs) en el ordenador, los hosts con los que hablan sus [servidores remotos](writing.md#a-remote-server) (`remote`), su logo y su banner como URL que cualquiera puede cargar, y una ficha técnica de lo que contiene: sus servidores MCP (`servers`: un paquete npm con su versión, un programa que trae, un host remoto, nunca un secreto), sus `skills`, `commands` y `agents` con sus descripciones, las `tools` que conoce su manifiesto con sus etiquetas y si solo leen o siempre preguntan, y las versiones de agent-kit con las que funciona (`kit`). Una página dibuja una cuadrícula a partir de él, y cualquier cliente lo lee sin clonar el repositorio. Los agentes no lo necesitan: su catálogo lee la copia del marketplace.

`@falkenslab/agent-kit-catalog` lo escribe, sin dependencias:

```bash
npx @falkenslab/agent-kit-catalog            # writes catalog.json
npx @falkenslab/agent-kit-catalog --check    # in CI: fails when it's out of date
```

- **A dónde apuntan sus enlaces**: `--repo owner/name`; si no, `GITHUB_REPOSITORY` (GitHub Actions); si no, el remoto `origin`; si no, el `repository` que nombra cada `plugin.json`. La rama, `--branch`; si no, `main` (nunca la que está descargada, para que el fichero sea igual en todas las ramas y `--check` pase en las pull requests).
- **Lo que comprueba**: que la versión de cada extensión coincide con su entrada, que sus imágenes existen dentro de su carpeta, que existen las skills que nombran sus capacidades, y que su `metadata["agent-kit"]` se ajusta al esquema de agent-kit; dice todos los problemas a la vez y no escribe nada.
- **Solo se catalogan las extensiones guardadas en el repositorio** (una fuente `./folder`).

```json title="catalog.json (one extension)"
{
  "name": "weather",
  "version": "0.1.0",
  "description": "The weather in your city: today and the next days.",
  "category": "productivity",
  "topics": ["weather", "planning", "productivity"],
  "author": "Ada Lovelace",
  "license": "MIT",
  "homepage": "https://github.com/ada/my-extensions/tree/main/weather",
  "readme": "https://github.com/ada/my-extensions/blob/main/weather/README.md",
  "install": { "claudeCode": "claude plugin install weather@ada", "agentKit": "extension add weather@ada" },
  "capabilities": [
    { "id": "weather-forecast", "skills": ["plan-the-day"], "tools": ["forecast"], "texts": { "en": { "label": "Planning around the weather", "description": "Today's and the next days' forecast in your city." } } }
  ],
  "logo": "https://raw.githubusercontent.com/ada/my-extensions/main/weather/assets/logo.svg"
}
```

El formato es el contrato de agent-kit: `schemas/marketplace-catalog.schema.json` (el fichero) y `schemas/agent-kit-metadata.schema.json` (`metadata["agent-kit"]`), distribuidos en `@falkenslab/agent-kit`.

## Una página pública {#a-public-page}

`catalog.json` basta para una página estática: una cuadrícula de tarjetas (logo, nombre, versión, descripción, topics), un buscador, chips de topics y los detalles de cada extensión con sus comandos de instalación. La [página de extensiones](https://falkenslab.github.io/agent-extensions/) de Falken's Lab es un solo fichero, `site/index.html`, que descarga `catalog.json`; `?topic=miyagi` la abre filtrada, para que un agente pueda enlazar a lo que ofrece. Su código fuente está en [agent-extensions](https://github.com/falkenslab/agent-extensions/tree/main/site): cópialo para la tuya.

## Su CI {#its-ci}

```yaml title=".github/workflows/validate.yml"
name: validate
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install --global @anthropic-ai/claude-code@latest
      - run: npx @falkenslab/agent-kit-catalog --check
      - run: claude plugin validate --strict .
      - run: for plugin in */.claude-plugin/plugin.json; do claude plugin validate --strict "$(dirname "$(dirname "$plugin")")"; done
```

Un segundo workflow publica `site/index.html` y `catalog.json` en GitHub Pages (con la fuente de Pages configurada como GitHub Actions): consulta el `pages.yml` de agent-extensions.

## Publicar una versión de una extensión {#releasing-an-extension}

1. Cámbiala, constrúyela (`npm run build` para un servidor empaquetado) y sube su `version` en `plugin.json` y en su entrada del marketplace.
2. `npx @falkenslab/agent-kit-catalog` para volver a escribir el catálogo.
3. Haz commit y push: la CI la valida, y la página se actualiza.

Los agentes de la gente ven la versión nueva como una actualización en su catálogo (`extension update`, o el botón Update); Claude Code, con `claude plugin update`.

## El marketplace oficial de un agente {#an-agents-official-marketplace}

Un agente nombra su propio marketplace, para que sus usuarios encuentren sus extensiones sin añadir nada y las instalen sin confirmación:

```ts
const config = { /* … */ officialMarketplace: "ada/my-extensions", catalogTopics: ["my-agent"] };
await runExtensionCommand(argv, { dirs, command: "my-agent", official: "ada/my-extensions", catalogTopics: ["my-agent"] });
```

El de Captain Whiskers es una carpeta que se distribuye con el capitán, `shipyard`; el de miyagi podría ser el de Falken's Lab, con `catalogTopics: ["miyagi"]`.

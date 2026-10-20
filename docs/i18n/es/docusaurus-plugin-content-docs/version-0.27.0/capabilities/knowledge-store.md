---
sidebar_position: 5
title: Almacén de conocimiento
description: La interfaz KnowledgeStore detrás de las herramientas knowledge_* - el almacén del kit sobre ficheros markdown, y cómo conectar el tuyo (una base de datos, un almacén vectorial).
---

# Almacén de conocimiento

Las herramientas de la [base de conocimiento](knowledge-base.md) trabajan sobre un `KnowledgeStore`, nunca sobre ficheros. El kit incluye uno sobre ficheros markdown; un agente puede conectar otro (una base de datos, un almacén vectorial) y las herramientas, el prompt y las skills siguen siendo los mismos.

## El almacén del kit {#the-kits-store}

`createFileKnowledgeStore(dir, { pageTypes? })` guarda las páginas como ficheros markdown con la estructura que la base de conocimiento ha tenido siempre (consulta [En disco](knowledge-base.md#on-disk)). La extensión `knowledge` lo crea por ti sobre su carpeta, con su opción `pageTypes`, y `buildSessionOptions()` lo devuelve entre las `apis` de las extensiones, como `apis.knowledge.knowledgeStore`, para que un host también pueda leer la base de conocimiento (para mostrarla en una app de escritorio, por ejemplo):

```ts
const { options, apis } = await buildSessionOptions(config, runDir, spec);
const knowledgeStore = apis.knowledge?.knowledgeStore as KnowledgeStore | undefined;
const topics = (await knowledgeStore?.list())?.filter((page) => page.type === "topic");
```

También se puede usar por sí solo, en un script o en un test:

```ts
import { createFileKnowledgeStore } from "@falkenslab/agent-kit";

const store = createFileKnowledgeStore("course/knowledge");
console.log(await store.index());
const report = await store.check();
```

## La interfaz {#the-interface}

```ts
interface KnowledgeStore {
  types(): readonly PageType[];
  list(): Promise<PageInfo[]>; // every page but the retired ones
  read(id: string): Promise<KnowledgePage | null>; // with linkedFrom: the pages that link to it
  create(type: string, slug: string, title: string, content: string, fields?: FieldChanges): Promise<string>;
  createMany(pages: readonly NewPage[]): Promise<string[]>; // links among them allowed; all or none
  edit(id: string, oldText: string, newText: string, fields?: FieldChanges): Promise<void>;
  rewrite(id: string, content: string, fields?: FieldChanges): Promise<void>;
  supersede(id: string, by: string, reason?: string): Promise<void>;
  retire(id: string, reason: string): Promise<void>;
  search(query: string, limit?: number): Promise<SearchHit[]>;
  index(): Promise<string>; // the catalog, linked by id
  log(operation: string, what: string, pages?: readonly string[]): Promise<void>;
  recentLog?(limit?: number): Promise<string[]>; // optional: the latest log entries, newest first
  check(): Promise<CheckReport>;
  overview(): Promise<string>;
  writeOverview(content: string): Promise<void>;
}
```

Lo que un almacén debe respetar, guarde las páginas donde las guarde:

- **Los ids son `type/slug`**, y los enlaces en el contenido son `[text](type/slug)`: devuélvelos así desde `read()` e `index()`, los guardes como los guardes internamente (el almacén del kit escribe enlaces a ficheros en el `index.md` en disco, pero las herramientas reciben ids). Se exportan `parseId()` y `linkedIds()` para ayudarte.
- **Los enlaces deben resolverse**: `create`, `createMany`, `edit`, `rewrite` y `writeOverview` rechazan un enlace a una página que no existe, con un mensaje sobre el que el modelo pueda actuar (las herramientas transmiten los errores tal cual).
- **Las páginas nunca se borran ni se renombran.** `supersede` y `retire` las marcan (`fields.status`: `superseded` o `retired`); una página retirada sale de `list()`, `index()` y `search()`, pero `read()` la sigue devolviendo.
- **`edit` sustituye exactamente una aparición**, y falla si no hay ninguna o hay varias.
- **`recentLog()`** es opcional: sin él, `knowledge_read("log")` dice que el almacén no puede mostrar su registro.
- **`check()`** devuelve los enlaces rotos, las páginas huérfanas y los enlaces a páginas retiradas.
- **El `ingested` de un resumen** lo pone el almacén: se fija cuando se crea o se reescribe, nunca se toma de quien llama. Su `file` se guarda tal como llega. Un almacén no sabe nada de la carpeta de fuentes (consulta [Base de conocimiento y fuentes](knowledge-base.md#knowledge-base-and-sources)).

`BUILT_IN_PAGE_TYPES` son los tipos del kit (summary, concept, entity, synthesis, preference) con sus plantillas; un almacén también recibe los que declara el agente, y debería tratar el tipo de una página como una etiqueta, para poder guardar cualquier tipo.

## Conectar el tuyo {#plugging-in-your-own}

```ts
import { knowledge, type AgentSpec } from "@falkenslab/agent-kit";
import { createPgKnowledgeStore } from "./pgStore.js"; // yours

const spec: AgentSpec<Config> = {
  // …
  extensions: [
    knowledge({
      dir: (config) => path.join(config.projectDir, "knowledge"),
      store: (config, dir) => createPgKnowledgeStore(process.env.DATABASE_URL!, { pageTypes: myTypes }),
    }),
  ],
};
```

`store(config, dir)` recibe la configuración de la sesión y la carpeta de la extensión. Con él, el kit no toca los ficheros de la carpeta; la extensión sigue necesitando `dir` (mantiene las herramientas de ficheros fuera de esa carpeta, y tu almacén puede usarla).

Un almacén vectorial suele mantener las páginas curadas como fuente de verdad e indexarlas para `search()`: búsqueda por similitud sobre embeddings de cada página (o de cada sección), con el mismo resultado `SearchHit`. Anthropic no tiene API de embeddings; Voyage AI es la opción habitual, y hay opciones locales (LanceDB o sqlite-vec con un modelo local). `index()` y `check()` no cambian.

## Conectar las herramientas tú mismo {#wiring-the-tools-yourself}

Un host que construye sus propias opciones de sesión obtiene las mismas herramientas con `createKnowledgeServer(store, options)`:

```ts
import { createKnowledgeServer } from "@falkenslab/agent-kit";

mcpServers: {
  knowledge: createKnowledgeServer(store, { runDir, interactive: true }),
},
```

`interactive` añade `knowledge_retire`, que pregunta antes a una persona; déjalo desactivado donde no haya nadie a quien preguntar. Llama al servidor `knowledge`, para que la puerta (gate) del plan, la puerta de los pasos y las etiquetas de las herramientas reconozcan sus herramientas.

---
sidebar_position: 4
title: Base de conocimiento
description: La wiki LLM integrada - páginas a las que se llega con las herramientas knowledge_*, tipos de página, skills y comandos - y la carpeta de fuentes con los originales intactos.
---

# Base de conocimiento

Un agente lo olvida todo cuando termina una sesión, salvo lo que dejó escrito. La extensión `knowledge` del kit le da a un agente una forma integrada de guardar sus notas: una wiki de páginas enlazadas entre sí, con reglas en el prompt del sistema, skills para mantenerla (el patrón "LLM wiki") y herramientas propias para acceder a ella. Los originales con los que trabaja el agente quedan aparte, en la carpeta de la extensión `sources`.

## Activarla {#turning-it-on}

```ts
import { knowledge, sources, type AgentSpec, type BaseSessionConfig } from "@falkenslab/agent-kit";

const spec: AgentSpec<BaseSessionConfig> = {
  // …
  extensions: [
    sources({ dir: (config) => path.join(config.projectDir, "sources") }), // optional
    knowledge({ dir: (config) => path.join(config.projectDir, "knowledge") }),
  ],
};
```

Es la [extensión](../extensions/overview.md) `knowledge` del kit, activada en la especificación con su carpeta (`dir`, una ruta o una función de la configuración de la sesión), con `sources` a su lado para los originales:

- el agente recibe las **herramientas `knowledge_*`** (un servidor MCP, `knowledge`) y solo accede a la base de conocimiento a través de ellas: las herramientas de ficheros no pueden leer, escribir ni buscar en su carpeta (el [ámbito de ficheros](../security/file-scope.md) lo indica, remitiendo a las herramientas);
- se añade al prompt del sistema una **sección "Knowledge base"**, con los tipos de página y las reglas de trabajo (y, cuando una extensión activa proporciona `sources`, cómo emparejar los resúmenes con sus originales);
- se carga el **plugin `knowledge`**, que viene con el kit: tres skills y tres comandos.

Las herramientas de ficheros se mantienen para los originales (`Read`, `Glob`, `Grep` sobre la carpeta de fuentes) y para `extraWritableDirs` (también `Write` y `Edit`). Un agente que solo tiene base de conocimiento no tiene ninguna herramienta de ficheros.

### Por qué herramientas y no ficheros {#why-tools-and-not-files}

El agente trabaja con **páginas**, no con ficheros: una página se identifica por su tipo y su slug, `concept/spring-tides`, y los enlaces entre páginas usan ese id. Así el almacenamiento puede cambiar por debajo (hoy ficheros markdown; una base de datos o un almacén vectorial, consulta [Almacén de conocimiento](knowledge-store.md)) sin tocar las herramientas, el prompt ni las skills. Y las reglas de la wiki las hace cumplir el código: el índice se genera, los enlaces inversos se calculan, los enlaces deben resolverse y las páginas nunca se borran ni se renombran.

También ahorra trabajo. En una base de conocimiento de prueba de 33 páginas, un `/knowledge:lint` llevó 66 llamadas a herramientas, 175 segundos y 469k tokens de entrada con las herramientas de ficheros, y de 13 a 18 llamadas, alrededor de un minuto y 200-250k tokens con estas herramientas; una ingesta pasó de 20 llamadas a 13-15, y ambas costaron entre un tercio y dos tercios menos.

## Las herramientas {#the-tools}

| Herramienta | Qué hace | Modo plan |
| --- | --- | --- |
| `knowledge_index` | El catálogo: todas las páginas, una línea cada una (título, id, qué es), por secciones | Permitida |
| `knowledge_search(query)` | Las páginas que coinciden con palabras de su título, sus alias o su contenido, de mejor a peor, con la línea que coincidió | Permitida |
| `knowledge_read(page)` | Una página: sus campos, su contenido (los enlaces como ids) y las páginas que enlazan a ella; o `"overview"`; o `"log"`, las últimas entradas del registro de operaciones, de la más reciente a la más antigua | Permitida |
| `knowledge_create(type, slug, title, content?, fields?, also?)` | Una página nueva; sin contenido, la plantilla del tipo. `also` crea más páginas en la misma llamada, que pueden enlazarse entre sí: todas o ninguna | Denegada |
| `knowledge_edit(page, oldText, newText, fields?)` | Cambia un fragmento, único en la página | Denegada |
| `knowledge_rewrite(page, content, fields?)` | Sustituye todo el contenido de una página, conservando su id y los enlaces a ella; o el `"overview"` | Denegada |
| `knowledge_supersede(page, by, reason?)` | Marca una página como sustituida por otra, con un aviso en su parte superior | Denegada |
| `knowledge_retire(page, reason)` | Saca del índice y de la búsqueda una página cuyo conocimiento era erróneo (se conserva y se puede restaurar), tras la aprobación de la persona | No se ofrece en modo autónomo; denegada |
| `knowledge_log(operation, what, pages?)` | Añade una entrada al registro, con la fecha de hoy | Denegada |
| `knowledge_check` | Los problemas mecánicos en una sola llamada (ver abajo) | Permitida |

`fields` es una lista de campos del frontmatter que fijar, `[{ "name": "aliases", "value": "king tides" }]` (`value: null` elimina uno). El `file` de un resumen es su original relativo a `sources/`; el almacén registra el hash del original, de modo que `list_sources` lo indica como *changed* si cambia más adelante.

### Enlaces y plantillas {#links-and-templates}

Las páginas se enlazan por id: `[Spring tides](concept/spring-tides)`. Un enlace a una página que no existe se rechaza con el motivo, así que el agente la crea antes, o en la misma llamada con `also` (un resumen y los conceptos nuevos que alimenta suelen enlazarse entre sí). Los enlaces inversos no los escribe el agente: `knowledge_read` devuelve lo que enlaza a una página.

`knowledge_create` sin contenido devuelve la plantilla del tipo de página; el agente la rellena y vuelve a llamar. Los tipos del kit y sus plantillas:

| Tipo | Qué contiene | Campos |
| --- | --- | --- |
| `summary` | Uno por cada fuente ingerida: qué dice, los puntos clave, las páginas que alimenta | `file` (el original, tal como lo nombra `list_sources`) o `url`; `ingested`, cuándo se escribió, que fija el propio almacén. El índice los muestra |
| `concept` | Una idea: definición, explicación, conexiones, fuentes | `aliases` |
| `entity` | Una cosa concreta: un sistema, un componente, una organización, un documento | `kind`, `aliases` |
| `synthesis` | Una respuesta que merece la pena guardar: una comparación, un análisis, un informe | `question` |
| `preference` | Cómo quiere la persona que se hagan las cosas en este proyecto (consulta [Las preferencias de la persona](#the-persons-preferences)) | `since` |

Además de las páginas está el **overview**, una síntesis viva de toda la base de conocimiento, que se lee y se reescribe como `"overview"`, y el **registro** de operaciones, que se escribe con `knowledge_log` y se lee como `"log"` (las diez últimas entradas, de la más reciente a la más antigua: qué se hizo por última vez, y cuándo).

### Qué encuentra `knowledge_check` {#what-knowledge_check-finds}

- enlaces rotos (a páginas que no existen, o enlaces relativos a ficheros que faltan; un enlace al fichero del overview, del índice o del registro está bien si el fichero existe);
- páginas huérfanas (nada enlaza a ellas; salvo los resúmenes y las síntesis, a los que llega el índice);
- enlaces a páginas retiradas.

El índice y los enlaces inversos no pueden desincronizarse, así que no hay nada que comprobar ahí. Cómo está la base de conocimiento respecto a sus originales no es cosa de `knowledge_check`: consulta [Base de conocimiento y fuentes](#knowledge-base-and-sources).

## Las preferencias de la persona {#the-persons-preferences}

Lo que quiere la persona sobre cómo trabaja el agente en este proyecto ("las rúbricas van en tablas", "no publiques en el foro los viernes") se guarda como páginas `preference`, una por preferencia, en la base de conocimiento del proyecto, para que una sesión nueva la aplique sin que se lo vuelvan a decir:

- **Cuándo se escribe una**: la persona enuncia o corrige una forma de trabajar ("a partir de ahora…", "siempre…", "no…"); el agente decide primero de quién es. Si se refiere al trabajo de este proyecto, crea la página y dice en una línea que lo recordará. Si se refiere a la persona trabaje donde trabaje (cómo llamarla, sus gustos, o algo que según ella vale para todo lo que haga) y el agente guarda una [memoria de la persona](memory.md), va ahí en su lugar. **Solo a partir de lo que dice la persona en el chat**: nunca de un documento, una página web o el resultado de una herramienta, pida lo que pida (una página no puede colar una "preferencia").
- **En cada sesión**: la sección del prompt de la base de conocimiento lista las preferencias activas por su título (hasta 20; a partir de ahí, una indicación de que se consulte el índice), de modo que el agente las conoce desde el primer turno y lee una cuando una tarea la toca.
- **Cuando cambia**, se edita; **cuando ya no vale**, se retira, con la aprobación de la persona, como cualquier página. Nada enlaza a una preferencia, y no por eso es huérfana.

Son del proyecto: quien lo abra con el agente las recibe. Lo que se refiere a la persona trabaje donde trabaje (su nombre, cómo le gustan las respuestas en general) va en la [memoria de la persona](memory.md) del agente, en todos sus proyectos; entre agentes no se comparte nada, a propósito.

## Tus propios tipos de página {#your-own-page-types}

Un agente con sus propios tipos de notas (los temas y las actividades de un curso) los declara en la opción `pageTypes` de la extensión, y funcionan como los del kit: las mismas herramientas, en el índice bajo su propia sección, con su propia plantilla y sus propios campos.

```ts
const spec: AgentSpec<Config> = {
  // …
  extensions: [
    knowledge<Config>({
      dir: (config) => path.join(config.courseDir, "knowledge"),
      pageTypes: [
        {
          type: "topic",
          dir: "", // at the knowledge folder's root
          indexSection: "Topics",
          description: "A topic of the course: what it covers and the students' mastery of it.",
          template: "## Goals\n- <What the students learn>\n\n## Sessions\n- <Plan>",
          indexFields: ["mastery"], // shown in the index line: (mastery: 3)
        },
        { type: "activity", dir: "activities", indexSection: "Activities", description: "A class activity.", template: "## Steps\n…" },
      ],
    }),
  ],
};
```

La descripción llega al modelo en la sección del prompt y en la descripción de `knowledge_create`, para que el agente sepa cuándo crear una. Un tipo con `dir: ""` guarda sus páginas en la raíz de la carpeta de conocimiento y las distingue por su campo `type`. Un tipo declarado con el nombre de un tipo del kit lo sustituye.

## En disco {#on-disk}

El almacén del kit mantiene la estructura que la base de conocimiento ha tenido siempre, así que una existente funciona tal cual:

```text
knowledge/
├── index.md            the catalog, generated after every change
├── log.md              the operation log
├── overview.md         the living synthesis
├── summaries/<slug>.md one page per ingested source
├── concepts/<slug>.md  one page per idea
├── entities/<slug>.md  one page per concrete thing
├── syntheses/<slug>.md answers worth keeping
└── <slug>.md           pages of a declared type with dir: ""
```

Cada página es markdown con un frontmatter YAML (`type`, `title`, los campos, `updated`); los enlaces se guardan como rutas relativas, para que los ficheros se lean bien en un editor o en GitHub, y vuelven al agente como ids. El agente crea las páginas sobre la marcha; no necesitas crear nada salvo la carpeta.

## Las reglas que sigue el agente {#the-rules-the-agent-follows}

La sección del prompt le dice al agente, entre otras cosas:

- empezar por `knowledge_search` o `knowledge_index`, y después leer solo las páginas que necesita la tarea;
- enlazar por id; cambiar una página por fragmentos; no borrar ni renombrar nunca una: sustituirla o retirarla;
- registrar cada operación cuando termina;
- toda afirmación debe poder rastrearse hasta una página de resumen, un original o contenido web claramente etiquetado;
- las contradicciones se conservan con su atribución, no se sobrescriben;
- escribir las páginas en el idioma de la conversación.

## Skills y comandos {#skills-and-commands}

| Skill | Qué hace |
| --- | --- |
| `knowledge:knowledge-ingest` | Ingiere una fuente: su página de resumen, las páginas de conceptos y entidades que toca, y el registro; y qué hacer cuando un original era erróneo o se ha sustituido. |
| `knowledge:knowledge-query` | Responde a una pregunta a partir de la base de conocimiento, citando sus páginas, y guarda la respuesta como síntesis cuando merece la pena. |
| `knowledge:knowledge-lint` | Revisión de salud: `knowledge_check` para los problemas mecánicos, y después duplicados, páginas que faltan, contradicciones y procedencia. |

| Comando | Qué hace |
| --- | --- |
| `/knowledge:ingest <files or topic>` | Ingiere el material indicado, o todos los originales que aún no se han ingerido. |
| `/knowledge:query <question>` | Responde a partir de la base de conocimiento. |
| `/knowledge:lint` | Revisa toda la base de conocimiento, arregla lo mecánico e informa del resto. |

Si tu especificación enumera sus [skills](skills-and-plugins.md#choosing-which-skills-the-agent-offers), estas tres se añaden automáticamente.

## Fuentes: los originales tal como se obtuvieron {#sources-originals-kept-as-obtained}

La carpeta de la extensión `sources` (`sources({ dir })`) contiene el material con el que trabaja el agente: ficheros que deja la persona y ficheros que guarda ahí el agente. El agente puede leerla y buscar en ella, pero nunca escribirla ni editarla: el [ámbito de ficheros](../security/file-scope.md) lo deniega, con un mensaje que remite a sus carpetas con permiso de escritura.

El agente la mantiene con las herramientas del kit (servidor `sourceFiles`), nunca con las herramientas de ficheros:

| Herramienta | Qué hace | Modos |
| --- | --- | --- |
| `list_sources` | Todos los originales con su estado, cuándo cambió su contenido por última vez (`changedAt`), tipo, tamaño, páginas (PDF) o diapositivas (PPTX), procedencia y la versión que sustituyen; también los que faltan y los retirados | Todos, incluido el plan |
| `extract_text` | Un original DOCX, PPTX o XLSX como markdown, que `Read` no puede leer | Todos, incluido el plan |
| `save_to_sources` | Copia dentro un fichero de la carpeta de esta ejecución | Todos salvo el plan |
| `download_to_sources` | Descarga un original desde una URL http(s) directamente dentro | Todos salvo el plan |
| `request_file` | Pide un fichero a la persona y lo copia dentro | Ni autónomo ni plan |
| `retire_source` | Retira un original erróneo o sustituido, tras la aprobación de la persona | Ni autónomo ni plan |

### Estado de cada original {#status-of-each-original}

| Estado | Significado |
| --- | --- |
| `present` | En la carpeta. Los ficheros que la persona copia a mano también aparecen aquí. |
| `missing` | El kit lo conocía, pero el fichero ya no está (se borró a mano). |
| `retired` | Retirado con `retire_source`: con cuándo, por qué (`wrong` o `replaced`) y qué lo sustituyó. |

Cada original presente tiene `changedAt`, cuándo cambió su **contenido** por última vez (ISO 8601): cuando se añadió, o cuando su hash cambió por última vez. Tocar un fichero sin cambiarlo no lo mueve.

El kit lleva la contabilidad en un manifiesto dentro de la carpeta, `sources/.agent-kit/sources.json`, donde las herramientas de ficheros no pueden escribir: el hash, el tamaño, la procedencia (de la ejecución, de una URL, de la persona o copiado a mano) y el `changedAt` de cada original. Los hashes nunca salen de ahí. Las páginas de un PDF y las diapositivas de un PPTX se cuentan sin analizarlos, para que el agente pueda leer uno largo por partes.

La sección propia de las fuentes en el prompt del sistema (qué son los originales, cómo llegan y se van) está presente siempre que la extensión `sources` está activada, con o sin base de conocimiento.

### Añadir originales {#adding-originals}

```text
save_to_sources({ source: "downloads/slides.pdf", destination: "topic-3/slides.pdf" })
download_to_sources({ url: "https://example.com/syllabus.pdf", destination: "topic-3/syllabus.pdf" })
request_file({ description: "The official syllabus of the module, to build the calendar from it" })
```

- `save_to_sources` toma `source` relativo a **la carpeta de esta ejecución** (`runDir`), donde un navegador u otra herramienta suele descargar los ficheros; las herramientas de ficheros no llegan a ella. Tolera nombres de fichero con tildes en otra normalización Unicode (una descarga del navegador en macOS, por ejemplo).
- `download_to_sources` descarga hasta 50 MB por http o https, sin que el contenido pase por el contexto del modelo. Una **página web** también se guarda como su contenido principal en markdown a su lado (`web/rules.html` y `web/rules.md`), para citarla literalmente y volver a leerla; `WebFetch` solo devuelve un resumen. Para eso hacen falta tres bibliotecas opcionales en tu agente, `npm install @mozilla/readability linkedom turndown`; sin ellas solo se guarda el HTML, y la herramienta lo dice.
- `request_file` le muestra a la persona un panel con la descripción; ella indica una ruta (arrastrar el fichero al terminal la pega) o pulsa Enter si no lo tiene. Se copia con la persona como procedencia.
- `destination` es relativo a la carpeta de fuentes; las carpetas ocultas son del kit.
- Nunca se **sobrescribe** nada: un destino que ya existe es un error que pide otro nombre.
- Un fichero **idéntico** a uno que ya está no se vuelve a copiar: la herramienta devuelve la ruta de ese.
- Una **versión nueva** va con un nombre nuevo y `replaces` apuntando a la antigua (`topic-3/slides-v2.pdf` sustituyendo a `topic-3/slides.pdf`); se conservan ambas y el manifiesto las enlaza.

`Read` lee PDF e imágenes, así que un original guardado de esos tipos se puede leer enseguida. **No puede leer DOCX ni PPTX** (confirmado: los rechaza como ficheros binarios); `extract_text` los lee, y también XLSX:

```text
extract_text({ source: "topic-3/slides.pptx", from: 1, to: 10 })
```

- **DOCX**: encabezados, párrafos, listas y tablas.
- **PPTX**: una sección por diapositiva, su título y su texto como lista, y sus **notas del orador**, que a menudo llevan la explicación; `from`/`to` eligen diapositivas de una presentación larga (`list_sources` da el recuento).
- **XLSX**: una tabla por hoja, hasta 200 filas (el resto se cuentan).
- Las imágenes se omiten, y se cuentan.

Necesita las bibliotecas opcionales `mammoth`, `fflate` y `turndown` (consulta [Instalación](../getting-started/installation.md#optional-libraries)); sin ellas, dice qué instalar. Personaliza la descripción de `save_to_sources` para tu dominio con la opción `saveDescription` de la extensión: `sources({ dir, saveDescription })`.

### Retirar un original {#retiring-an-original}

Un original que era erróneo (las diapositivas de otro curso) o al que sustituye uno mejor se retira con `retire_source`, nunca se borra:

```text
retire_source({ source: "topic-3/slides.pdf", why: "replaced", reason: "a newer edition", replacedBy: "topic-3/slides-v2.pdf" })
```

1. La persona lo aprueba en un panel; si lo rechaza, no cambia nada.
2. El fichero se mueve a `sources/.agent-kit/retired/`, y el manifiesto registra el motivo. Borrarlo definitivamente le corresponde a la persona, vaciando esa carpeta.
3. `list_sources` lo muestra como retirado. Sus resúmenes son de la base de conocimiento, así que la herramienta no los toca: le recuerda al agente que revise lo que construyó a partir de él, y la skill `knowledge-ingest` dice cómo (`knowledge_retire` para el resumen de uno erróneo, `knowledge_supersede` para el de uno sustituido, con el nuevo resumen, cada uno con la aprobación de la persona).

La puerta (gate) del plan deniega todas estas herramientas salvo `list_sources` y `extract_text`, y `request_file` y `retire_source` no existen en modo autónomo.

## Base de conocimiento y fuentes {#knowledge-base-and-sources}

Están separadas a propósito: **cada una es dueña de sus datos, y el modelo las conecta** con sus herramientas. Las fuentes conocen sus originales y cuándo cambió cada uno; la base de conocimiento conoce sus páginas, de qué original trata cada resumen y cuándo se escribió. Ninguna lee ni escribe los datos de la otra, de modo que el almacén de la base de conocimiento puede ser cualquier cosa (una base de datos, un almacén vectorial) y las fuentes funcionan sin base de conocimiento.

El modelo las empareja, como le indican las skills `knowledge-ingest` y `knowledge-lint`, y también la sección del prompt de la base de conocimiento cuando una extensión activa proporciona la [capacidad](../extensions/overview.md#capabilities) `sources`:

- **Para ingerir**: un original sobre el que no trata ningún resumen necesita ingerirse; uno cuyo `changedAt` (de `list_sources`) es posterior al `ingested` de su resumen (de `knowledge_index`) ha cambiado desde entonces, y su resumen se rehace con `knowledge_rewrite`, que vuelve a fijar `ingested`. Ambas fechas son ISO 8601 en UTC, así que la posterior se ordena detrás también como texto; `date_math` está ahí por si hay dudas. (Se descartó una regla para usar siempre `date_math`: en sesiones reales el modelo las comparaba como texto, correctamente, y se saltaba la herramienta).
- **Para retirar**: después de `retire_source`, las propias herramientas de la base de conocimiento retiran o sustituyen los resúmenes, con la aprobación de la persona.

El modelo solo lleva de una a otra identificadores cortos (la ruta de un original, el id de una página) y fechas, nunca datos que tengan que ser exactos. El kit no comprueba que exista el `file` de un resumen, ni marca los resúmenes cuando se va un original: un lint (`/knowledge:lint`) encuentra lo que se haya pasado por alto.

## Tus propias reglas en su lugar {#your-own-rules-instead}

Un agente que quiera notas sencillas, o unas reglas completamente suyas, deja `knowledge()` fuera de sus extensiones y pone una carpeta de notas propias en `extraWritableDirs`, que mantiene con las herramientas de ficheros (las cinco, escritura incluida):

```ts
const spec: AgentSpec<Config> = {
  buildSystemPrompt: (config) => `${loadPrompt("system.md")}\n\n${myNotesRules(config)}`,
  // …
  extensions: [sources({ dir: (config) => path.join(config.projectDir, "sources") })], // no knowledge()
};

const config: Config = {
  // …
  extraWritableDirs: [path.join(workspace, "notes")],
};
```

Las piezas se exportan para reutilizarlas por separado: `knowledgePromptSection({ withSources?, pageTypes?, preferences? })`, `knowledgePluginRoot()`, y el almacén y sus herramientas (consulta [Almacén de conocimiento](knowledge-store.md)).

# context/

Carpeta de demo, vacía a propósito. Su única función es darle a `agent.ts` un
`contextDir` real: es lo que activa `includeFileTools` en `buildSessionOptions()`
(`src/session.ts`), que a su vez cablea `cwd`, `skills: "all"` y `plugins` — sin esto el
capitán no tendría forma de descubrir la skill/comando en `../plugin/`.

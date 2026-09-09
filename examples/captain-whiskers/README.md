# Captain Whiskers

Ejemplo mínimo de un agente construido sobre agent-kit: un gato pirata que solo cuenta
chistes si el humano se lo aprueba primero.

Con el mínimo código posible, demuestra:
- `AgentSpec` + `buildSessionOptions()` (../../src/agentSpec.ts, session.ts)
- El chat en terminal ya armado: `runChatTui()`
- El checkpoint humano de modo `guided`: `request_human_approval`
- Autenticación automática con Claude: `createClaudeAuthTui()`

## Ejecutar

Desde la raíz del repo:

```
npx tsx examples/captain-whiskers/agent.ts [modo]
```

`modo` es opcional: `interactive` | `guided` (por defecto) | `autonomous` | `chat`. Prueba
`interactive` para ver que hasta una búsqueda web pide confirmación paso a paso, o
`autonomous` para ver que el capitán no tiene ningún canal para pedir permiso — ni
siquiera para los chistes.

La primera vez, si no tienes ya un token de Claude configurado, te lo pedirá.

El registro completo de la sesión (`transcript.jsonl`) queda en `.run/<marca-de-tiempo>/`
dentro de esta carpeta (ignorado por git).

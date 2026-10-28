# Interface: RemoteServer

Defined in: [core/externalExtensions.ts:56](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L56)

A remote server (#61), over HTTP or SSE: nothing runs here. `${user_config.KEY}` and `${VAR}` in
its URL and headers take their values when the session opens.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-headers"></a> `headers?` | `Record`\<`string`, `string`\> | [core/externalExtensions.ts:59](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L59) |
| <a id="property-type"></a> `type` | `"http"` \| `"sse"` | [core/externalExtensions.ts:57](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L57) |
| <a id="property-url"></a> `url` | `string` | [core/externalExtensions.ts:58](https://github.com/falkenslab/agent-kit/blob/main/src/core/externalExtensions.ts#L58) |

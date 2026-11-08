/**
 * How deep in a chain of agents served over MCP this process is (ADR-027): an agent that serves
 * itself reads it, and passes it on one higher to the servers it starts, so a loop (A asks B asks
 * A) stops instead of spawning agents forever. An installed extension's server never gets it: its
 * environment is stripped, and no server should depend on the kit's variables.
 */
export const MCP_DEPTH_ENV = "AGENT_KIT_MCP_DEPTH";

/** The depth this process runs at: 0 when no agent served over MCP started it. */
export function mcpDepth(): number {
  const depth = Number(process.env[MCP_DEPTH_ENV]);
  return Number.isInteger(depth) && depth > 0 ? depth : 0;
}

import { parsePort } from "@mcb/config";
import { DEFAULT_PORTS } from "@mcb/contracts";
import { createAgentGatewayApp } from "./app.ts";

export function resolveAgentGatewayPort(value: string | undefined): number {
  return parsePort(value, DEFAULT_PORTS["agent-gateway"], "MCB_AGENT_PORT");
}

export function startAgentGatewayServer(environment: NodeJS.ProcessEnv = process.env) {
  const port = resolveAgentGatewayPort(environment.MCB_AGENT_PORT);
  return Bun.serve({ port, fetch: createAgentGatewayApp().fetch });
}

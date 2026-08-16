import { parsePort } from "@mcb/config";
import { DEFAULT_PORTS } from "@mcb/contracts";
import { createNanoBrainApp } from "./app.ts";

export function resolveNanoBrainPort(value: string | undefined): number {
  return parsePort(value, DEFAULT_PORTS["nano-brain"], "MCB_NANO_PORT");
}

export function startNanoBrainServer(environment: NodeJS.ProcessEnv = process.env) {
  const port = resolveNanoBrainPort(environment.MCB_NANO_PORT);
  return Bun.serve({ port, fetch: createNanoBrainApp().fetch });
}

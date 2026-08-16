import { makeHealthResponse } from "@mcb/contracts";
import { Hono } from "hono";

export function createAgentGatewayApp(): Hono {
  const app = new Hono();
  app.get("/health", (context) =>
    context.json(makeHealthResponse("agent-gateway", "0.1.0")),
  );
  return app;
}

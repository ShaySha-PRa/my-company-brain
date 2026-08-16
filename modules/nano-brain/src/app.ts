import { makeHealthResponse } from "@mcb/contracts";
import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { ensureDefaultSource, getNanoPool } from "./db.ts";

type NanoOptions = { internalToken?: string; databaseUrl?: string; pool?: Parameters<typeof ensureDefaultSource>[2] };

function validInternalHeaders(context: any, token: string | undefined): { userId: string; username: string } | null {
  const received = context.req.header("x-mcb-internal-token");
  if (!token || !received || received.length !== token.length || !timingSafeEqual(Buffer.from(received), Buffer.from(token))) return null;
  const userId = context.req.header("x-mcb-user-id");
  const username = context.req.header("x-mcb-username");
  const isAdmin = context.req.header("x-mcb-is-admin");
  if (!userId || !username || !["true", "false"].includes(isAdmin ?? "")) return null;
  return { userId, username };
}

export function createNanoBrainApp(options: NanoOptions = {}): Hono {
  const app = new Hono();
  app.get("/health", (context) =>
    context.json(makeHealthResponse("nano-brain", "0.1.0")),
  );
  app.post("/internal/users/default-source", async (context) => {
    const user = validInternalHeaders(context, options.internalToken ?? process.env.MCB_INTERNAL_TOKEN);
    if (!user) return context.json({ error: { code: "unauthorized", message: "internal authentication required" } }, 401);
    try {
      const source = await ensureDefaultSource(user.userId, user.username, options.pool ?? getNanoPool(options.databaseUrl));
      return context.json({ source });
    } catch { return context.json({ error: { code: "storage_unavailable", message: "module storage unavailable" } }, 503); }
  });
  return app;
}

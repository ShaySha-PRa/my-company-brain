import { serve } from '@hono/node-server';
import { assertInternalTokenValid } from '@mcb/contracts';
import { createApp } from './app';

export function resolveApiPort(value = process.env.MCB_API_PORT ?? process.env.API_PORT): number {
  const port = value === undefined ? 3101 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('MCB_API_PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function startApiServer(environment: NodeJS.ProcessEnv = process.env) {
  // A5：监听前校验，占位/空/过短内部 token 直接拒绝启动。
  assertInternalTokenValid(environment.RAG_INTERNAL_TOKEN ?? environment.MCB_INTERNAL_TOKEN);
  const app = createApp();
  const port = resolveApiPort(environment.MCB_API_PORT ?? environment.API_PORT);
  return { server: serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }), port };
}

if (import.meta.main) {
  const server = startApiServer();
  console.log(`My Company Brain API listening on http://0.0.0.0:${server.port}`);
}

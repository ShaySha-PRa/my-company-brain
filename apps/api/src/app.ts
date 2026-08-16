import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { systemRouter } from './routes/system';
import { createNanoRouter } from './routes/nano';
import { ragRouter } from './routes/rag';
import { createAuthRouter, type AuthDependencies } from './routes/auth';
import { createPlatformRouter, type PlatformDependencies } from './routes/platform';
import { toPublicUser } from './lib/serializers';

export { toPublicUser as serializePublicUser };

export type ApiAppOptions = Partial<AuthDependencies> & {
  identity?: Partial<AuthDependencies>;
  nanoBaseUrl?: string;
  agentGatewayBaseUrl?: string;
  internalToken?: string;
  platform?: PlatformDependencies;
};

// 组装统一 HTTP API：挂载中间件与各领域路由。
// 各路由自带完整路径前缀，统一挂在根上即可保持路径不变。
export function createApp(options: ApiAppOptions = {}): Hono {
  const app = new Hono();

  app.use('*', cors());

  app.route('/', systemRouter);
  const identity: any = options.identity ?? options;
  const method = (name: keyof AuthDependencies) => {
    const value = identity?.[name] ?? (options as any)[name];
    return typeof value === 'function' ? value.bind(identity) : undefined;
  };
  app.route('/', createAuthRouter({
    ...(method('listRegistrationTeams') ? { listRegistrationTeams: method('listRegistrationTeams') } : {}),
    ...(method('createUser') ? { createUser: method('createUser') } : {}),
    ...(method('login') ? { login: method('login') } : {}),
    ...(method('revokeBearerSession') ? { revokeBearerSession: method('revokeBearerSession') } : {}),
    ...(method('getUserByBearerToken') ? { getUserByBearerToken: method('getUserByBearerToken') } : {}),
    ...(method('provisionDefaults') ? { provisionDefaults: method('provisionDefaults') } : {}),
  }));
  app.route('/', createNanoRouter({
    internalBaseUrl: (options as any).nanoBaseUrl,
    internalToken: (options as any).internalToken,
    getUserByBearerToken: method('getUserByBearerToken'),
  }));
  app.route('/', createPlatformRouter({
    platform: options.platform,
    getUserByBearerToken: method('getUserByBearerToken'),
    agentGatewayBaseUrl: options.agentGatewayBaseUrl ?? process.env.AGENT_GATEWAY_INTERNAL_BASE_URL,
    internalToken: options.internalToken ?? process.env.RAG_INTERNAL_TOKEN,
  }));
  app.route('/', ragRouter);

  return app;
}

export const createApiApp = createApp;

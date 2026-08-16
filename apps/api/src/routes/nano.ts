import { Hono } from 'hono';
import { callModuleJson } from '@mcb/gateway';
import { protectedRoute } from '../lib/route';
import { getBearerToken, toUserContext } from '../lib/auth';
import type { IdentityUser } from '@mcb/identity';
import type { UserContext } from '@mcb/contracts';

// Nano Brain 统一代理路由。
// apps/api 只负责平台鉴权与 UserContext 注入，具体业务由 modules/nano-brain 的 HTTP 服务处理。
export type NanoRouterOptions = {
  internalBaseUrl?: string;
  internalToken?: string;
  getUserByBearerToken?: (token: string) => Promise<IdentityUser | null>;
};

async function readOptionalJsonBody(c: any): Promise<unknown> {
  const method = c.req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;
  return c.req.json().catch(() => undefined);
}

export function createNanoRouter(options: NanoRouterOptions = {}): Hono {
  const router = new Hono();
  const resolveUser = async (c: any): Promise<UserContext | Response> => {
    if (!options.getUserByBearerToken) return (await import('../lib/auth')).getRequiredUser(c);
    const token = getBearerToken(c.req.header('authorization'));
    if (!token) return c.json({ error: 'unauthorized', message: '缺少 Bearer Token' }, 401);
    const user = await options.getUserByBearerToken(token);
    return user ? toUserContext(user) : c.json({ error: 'unauthorized', message: '未登录或登录已过期' }, 401);
  };
  router.all(
  '/nano/*',
  protectedRoute('Nano Brain 模块调用失败', async (c, ctx) => {
    const url = new URL(c.req.url);
    const response = await callModuleJson('nano-brain', {
      method: c.req.method,
      path: c.req.path === '/nano/health' ? '/health' : c.req.path,
      queryString: url.search,
      body: await readOptionalJsonBody(c),
      user: ctx,
      internalBaseUrl: options.internalBaseUrl,
      internalToken: options.internalToken,
    });
    return c.json(response.body, response.status as any);
  }, resolveUser),
  );
  return router;
}

export const nanoRouter = createNanoRouter();

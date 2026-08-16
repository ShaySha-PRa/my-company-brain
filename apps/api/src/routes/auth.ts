import { Hono } from 'hono';
import {
  createUser,
  IdentityError,
  listRegistrationTeams,
  login,
  revokeBearerSession,
} from '@mcb/identity';
import type { IdentityUser } from '@mcb/identity';
import { initializeModuleUser } from '@mcb/gateway';
import { getBearerToken, toUserContext } from '../lib/auth';
import { handleError } from '../lib/errors';
import { toPublicUser } from '../lib/serializers';

export type AuthDependencies = {
  listRegistrationTeams: typeof listRegistrationTeams;
  createUser: typeof createUser;
  login: typeof login;
  revokeBearerSession: typeof revokeBearerSession;
  getUserByBearerToken: (token: string) => Promise<IdentityUser | null>;
  provisionDefaults: (user: IdentityUser) => Promise<void>;
};

const defaultDependencies: AuthDependencies = {
  listRegistrationTeams,
  createUser,
  login,
  revokeBearerSession,
  async getUserByBearerToken(token) {
    const { getUserByBearerToken } = await import('@mcb/identity');
    return getUserByBearerToken(token);
  },
  async provisionDefaults(user) {
    const context = toUserContext(user);
    await initializeModuleUser('nano-brain', context);
    await initializeModuleUser('traditional-rag', context);
    await initializeModuleUser('graph-rag', context);
  },
};

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function parseRegisterBody(value: unknown): {
  username: string;
  password: string;
  teamId?: string;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new IdentityError('注册请求体必须是 JSON 对象', 'invalid_input');
  }
  for (const field of ['organization_id', 'team_ids', 'is_admin']) {
    if (hasOwn(value, field)) {
      throw new IdentityError(`注册请求不允许字段 ${field}`, 'invalid_input');
    }
  }

  const body = value as Record<string, unknown>;
  const allowedFields = new Set(['username', 'password', 'team_id']);
  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      throw new IdentityError(`注册请求不允许字段 ${field}`, 'invalid_input');
    }
  }
  if (typeof body.username !== 'string' || typeof body.password !== 'string') {
    throw new IdentityError('用户名和密码必须是字符串', 'invalid_input');
  }
  if (
    body.team_id !== undefined
    && body.team_id !== null
    && typeof body.team_id !== 'string'
  ) {
    throw new IdentityError('team_id 必须是字符串', 'invalid_input');
  }
  const teamId =
    typeof body.team_id === 'string' && body.team_id.trim()
      ? body.team_id.trim()
      : undefined;
  return { username: body.username, password: body.password, teamId };
}

export function createAuthRouter(overrides: Partial<AuthDependencies> = {}): Hono {
  const dependencies = { ...defaultDependencies, ...overrides };
  const router = new Hono();

  async function protectedUser(c: any): Promise<IdentityUser | Response> {
    const token = getBearerToken(c.req.header('authorization'));
    if (!token) return c.json({ error: 'unauthorized', message: '缺少 Bearer Token' }, 401);
    const user = await dependencies.getUserByBearerToken(token);
    if (!user) return c.json({ error: 'unauthorized', message: '未登录或登录已过期' }, 401);
    return user;
  }

  router.get('/auth/registration-teams', async (c) => {
  try {
    return c.json({ teams: await dependencies.listRegistrationTeams() });
  } catch (error) {
    return handleError(c, error, '读取注册团队失败');
  }
  });

  router.post('/auth/register', async (c) => {
  try {
    const rawBody = await c.req.json().catch(() => {
      throw new IdentityError('注册请求体必须是有效 JSON', 'invalid_input');
    });
    const body = parseRegisterBody(rawBody);
    const user = await dependencies.createUser({
      username: body.username,
      password: body.password,
      isAdmin: false,
      teamId: body.teamId,
    });
    await dependencies.provisionDefaults(user);
    return c.json({ user: toPublicUser(user) }, 201);
  } catch (error) {
    return handleError(c, error, '注册失败');
  }
  });

  router.post('/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const result = await dependencies.login({ username: body.username, password: body.password });
    return c.json({ token: result.token, token_type: 'Bearer', user: toPublicUser(result.user) });
  } catch (error) {
    return handleError(c, error, '登录失败');
  }
  });

  router.get('/auth/me', async (c) => {
    try {
      const user = await protectedUser(c);
      if (user instanceof Response) return user;
      return c.json({ user: toPublicUser(user) });
    } catch (error) {
      return handleError(c, error, '读取用户失败');
    }
  });

  router.post('/auth/logout', async (c) => {
    try {
      const user = await protectedUser(c);
      if (user instanceof Response) return user;
    const token = getBearerToken(c.req.header('authorization'));
    // protectedRoute 已拒绝缺失或无效 bearer；这里重新读取只为把 DELETE
    // 精确绑定到刚刚通过认证的当前凭据，而不是按 user 批量删除 session。
    if (!token || !(await dependencies.revokeBearerSession(token))) {
      return c.json({ error: 'unauthorized', message: '未登录或登录已过期' }, 401);
    }
    return c.json({ ok: true });
    } catch (error) {
      return handleError(c, error, '退出登录失败');
    }
  });

  return router;
}

// 认证与用户路由。
export const authRouter = createAuthRouter();

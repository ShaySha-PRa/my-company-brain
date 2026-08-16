import { Hono } from 'hono';
import { getModuleHealth, getRegisteredModules } from '@mcb/gateway';

// 系统级公共路由：健康检查与模块清单。
export const systemRouter = new Hono();

systemRouter.get('/health', (c) => c.json({ status: 'ok', service: 'api', version: '0.1.0' }));

systemRouter.get('/modules', (c) => c.json({ modules: getRegisteredModules() }));

systemRouter.get('/modules/health', async (c) => {
  const modules = getRegisteredModules();
  const health = await Promise.all(modules.map((module) => getModuleHealth(module.id)));
  return c.json({ modules: health });
});

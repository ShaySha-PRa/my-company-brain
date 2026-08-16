// 分层数据库初始化：仅 identity / nano-brain / traditional-rag。
// 用途：本地调试时快速打通指定 RAG 链路。
//   - graph-rag 依赖独立 Neo4j readiness，本脚本仅初始化三条 PostgreSQL 链路，故跳过。
//   - agent-gateway 需要独立的 LangChain 运行环境，本脚本不负责启动它。
// 与 scripts/init-db.ts 的区别:只创建并迁移 identity / nano_brain / traditional_rag 三库,
// 不触发 graph-rag(Neo4j)与 agent-gateway(langchain)依赖。
import pg from 'pg';
import { migrateIdentityDatabase, closeIdentityPool } from '@mcb/identity';
import { migrateNanoBrainDatabase, closeNanoBrainPool } from '@mcb/nano-brain';

const { Client } = pg;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function databaseNameFromUrl(url: string): string {
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, '');
  if (!name) throw new Error(`Cannot infer database name from ${url}`);
  return name;
}

async function databaseExists(client: pg.Client, databaseName: string): Promise<boolean> {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  return (result.rowCount ?? 0) > 0;
}

async function createDatabaseIfMissing(client: pg.Client, databaseName: string): Promise<void> {
  if (await databaseExists(client, databaseName)) {
    console.log(`database exists: ${databaseName}`);
    return;
  }
  const safeName = '"' + databaseName.replaceAll('"', '""') + '"';
  await client.query(`CREATE DATABASE ${safeName}`);
  console.log(`created database: ${databaseName}`);
}

async function main() {
  const adminUrl = getRequiredEnv('POSTGRES_ADMIN_URL');
  const identityUrl = getRequiredEnv('IDENTITY_DATABASE_URL');
  const nanoBrainUrl = getRequiredEnv('NANO_BRAIN_DATABASE_URL');
  const traditionalRagUrl = getRequiredEnv('TRADITIONAL_RAG_DATABASE_URL');

  const adminClient = new Client({ connectionString: adminUrl });
  await adminClient.connect();
  await createDatabaseIfMissing(adminClient, databaseNameFromUrl(identityUrl));
  await createDatabaseIfMissing(adminClient, databaseNameFromUrl(nanoBrainUrl));
  await createDatabaseIfMissing(adminClient, databaseNameFromUrl(traditionalRagUrl));
  await adminClient.end();

  await migrateIdentityDatabase();
  await closeIdentityPool();
  console.log('identity database migrated');

  await migrateNanoBrainDatabase();
  await closeNanoBrainPool();
  console.log('nano brain database migrated');

  const traditionalMigration = Bun.spawn(
    ['uv', 'run', '--project', 'modules/traditional-rag', 'python', '-m', 'traditional_rag.db.migrations'],
    { stdout: 'inherit', stderr: 'inherit' },
  );
  const traditionalExitCode = await traditionalMigration.exited;
  if (traditionalExitCode !== 0) {
    throw new Error(`traditional rag database migration failed with exit code ${traditionalExitCode}`);
  }
  console.log('traditional rag database migrated');

  console.log('[staged] graph-rag + agent-gateway migrations skipped (Neo4j readiness / langchain not configured locally).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

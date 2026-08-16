import pg from 'pg';
import { migrateIdentityDatabase } from '@mcb/identity';
import { migratePlatformDatabase } from '@mcb/platform';
import { migrateNanoBrainDatabase } from '@mcb/nano-brain';
import { setupAgentCheckpointSchema } from '../apps/agent-gateway/src/agent/checkpointer';
import { migrateAgentGatewayDatabase } from '../apps/agent-gateway/src/migrations';
import { bootstrapDatabases } from '../deploy/database/migrate/bootstrap';
import { applyRuntimeGrants } from '../deploy/database/migrate/permissions';
import { runPostcheck } from '../deploy/database/migrate/postcheck';
import { assertFrozenUrls, requiredEnv } from '../deploy/database/migrate/topology';
import { ensureDefaultAdmin } from './create-admin';

const { Pool } = pg;

/**
 * Keep the checked-in local template and the Compose contract interoperable.
 * Compose supplies the explicit role URLs; a local root .env may still use
 * the MCB_* names.  This only fills missing process variables in memory and
 * never writes or logs credentials.
 */
function normalizeDatabaseEnvironment(): void {
  const aliases: Record<string, string> = {
    MCB_ADMIN_DATABASE_URL: 'POSTGRES_ADMIN_URL',
    MCB_MIGRATOR_PASSWORD: 'POSTGRES_MIGRATOR_PASSWORD',
    MCB_IDENTITY_DATABASE_URL: 'IDENTITY_DATABASE_URL',
    MCB_CORE_DATABASE_URL: 'PLATFORM_DATABASE_URL',
    MCB_NANO_DATABASE_URL: 'NANO_BRAIN_DATABASE_URL',
    MCB_TRADITIONAL_DATABASE_URL: 'TRADITIONAL_RAG_DATABASE_URL',
    MCB_GRAPH_DATABASE_URL: 'GRAPH_RAG_DATABASE_URL',
    MCB_AGENT_DATABASE_URL: 'AGENT_DATABASE_URL',
    MCB_IDENTITY_DATABASE_PASSWORD: 'IDENTITY_APP_PASSWORD',
    MCB_CORE_DATABASE_PASSWORD: 'PLATFORM_APP_PASSWORD',
    MCB_NANO_DATABASE_PASSWORD: 'NANO_APP_PASSWORD',
    MCB_TRADITIONAL_DATABASE_PASSWORD: 'TRADITIONAL_APP_PASSWORD',
    MCB_GRAPH_DATABASE_PASSWORD: 'GRAPH_APP_PASSWORD',
    MCB_AGENT_DATABASE_PASSWORD: 'AGENT_APP_PASSWORD',
  };
  for (const [source, target] of Object.entries(aliases)) {
    if (!process.env[target] && process.env[source]) process.env[target] = process.env[source];
  }

  const migratorBase = process.env.MCB_MIGRATOR_DATABASE_URL?.trim();
  const migratorPassword = process.env.POSTGRES_MIGRATOR_PASSWORD?.trim();
  if (!migratorBase || !migratorPassword) return;
  const migrationTargets: Record<string, string> = {
    IDENTITY_MIGRATION_DATABASE_URL: 'mcb_identity_db',
    PLATFORM_MIGRATION_DATABASE_URL: 'mcb_core_db',
    NANO_BRAIN_MIGRATION_DATABASE_URL: 'mcb_nano_db',
    AGENT_MIGRATION_DATABASE_URL: 'mcb_agent_db',
    TRADITIONAL_RAG_MIGRATION_DATABASE_URL: 'mcb_traditional_db',
    GRAPH_RAG_MIGRATION_DATABASE_URL: 'mcb_graph_db',
  };
  for (const [name, database] of Object.entries(migrationTargets)) {
    if (process.env[name]) continue;
    const url = new URL(migratorBase);
    url.username = 'mcb_migrator';
    url.password = migratorPassword;
    url.pathname = `/${database}`;
    process.env[name] = url.toString();
  }
}

async function step(name: string, action: () => Promise<void>): Promise<void> {
  console.log(`[migrate] start ${name}`);
  await action();
  console.log(`[migrate] done ${name}`);
}

async function run(command: string[], env: Record<string, string>): Promise<void> {
  const child = Bun.spawn(command, {
    env: { ...process.env, ...env },
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await child.exited;
  if (code !== 0) throw new Error(`${command.join(' ')} failed with exit code ${code}`);
}

async function migrateTypescriptDatabases(): Promise<void> {
  const targets = [
    [requiredEnv('IDENTITY_MIGRATION_DATABASE_URL'), migrateIdentityDatabase],
    [requiredEnv('PLATFORM_MIGRATION_DATABASE_URL'), migratePlatformDatabase],
    [requiredEnv('NANO_BRAIN_MIGRATION_DATABASE_URL'), migrateNanoBrainDatabase],
    [requiredEnv('AGENT_MIGRATION_DATABASE_URL'), migrateAgentGatewayDatabase],
  ] as const;
  for (const [connectionString, migrate] of targets) {
    const pool = new Pool({ connectionString });
    try {
      await migrate(pool);
    } finally {
      await pool.end();
    }
  }
  await setupAgentCheckpointSchema(requiredEnv('AGENT_MIGRATION_DATABASE_URL'));
}

async function migratePythonDatabases(): Promise<void> {
  await run(
    ['modules/traditional-rag/.venv/bin/python', '-m', 'traditional_rag.db.migrations'],
    { TRADITIONAL_RAG_DATABASE_URL: requiredEnv('TRADITIONAL_RAG_MIGRATION_DATABASE_URL') },
  );
  await run(
    ['modules/graph-rag/.venv/bin/python', '-m', 'graph_rag.db.migrations'],
    { GRAPH_RAG_DATABASE_URL: requiredEnv('GRAPH_RAG_MIGRATION_DATABASE_URL') },
  );
  await run(
    ['modules/graph-rag/.venv/bin/python', 'deploy/database/migrate/graph_setup.py'],
    { GRAPH_RAG_DATABASE_URL: requiredEnv('GRAPH_RAG_MIGRATION_DATABASE_URL') },
  );
}

export async function initializeDatabases(): Promise<void> {
  normalizeDatabaseEnvironment();
  assertFrozenUrls();
  await step('bootstrap roles, databases and extensions', bootstrapDatabases);
  await step('application migrations and migrate-only setup', async () => {
    await migrateTypescriptDatabases();
    await migratePythonDatabases();
  });
  await step('runtime grants', applyRuntimeGrants);
  await step('default administrator', async () => { await ensureDefaultAdmin(); });
  await step('postcheck', runPostcheck);
}

if (import.meta.main) {
  initializeDatabases().catch((error) => {
    console.error('[migrate] failed', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

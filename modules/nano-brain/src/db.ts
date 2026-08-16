import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function getNanoBrainDatabaseUrl(): string {
  const url = process.env.NANO_BRAIN_DATABASE_URL;
  if (!url) {
    throw new Error('NANO_BRAIN_DATABASE_URL is required');
  }
  return url;
}

export function getNanoBrainPool(databaseUrl?: string): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl ?? getNanoBrainDatabaseUrl() });
  }
  return pool;
}

export const getNanoPool = getNanoBrainPool;

export async function closeNanoBrainPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/**
 * Compatibility seam for the small internal provisioning adapter. The full
 * Nano service uses the richer source repository, while this function keeps
 * registration provisioning deterministic for API and smoke-test callers.
 */
export async function ensureDefaultSource(
  userId: string,
  username: string,
  sourcePool: Pick<pg.Pool, 'query'>,
): Promise<Record<string, unknown>> {
  const existing = await sourcePool.query(
    `SELECT id, name, owner_user_id FROM sources WHERE owner_user_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  if (existing.rows[0]) return { ...existing.rows[0], is_default: true };
  const result = await sourcePool.query(
    `INSERT INTO sources (id, name, kind, owner_user_id, created_by)
     VALUES ($1, $2, 'private', $3, $3)
     RETURNING id, name, owner_user_id`,
    [randomUUID(), `user/${username.trim().toLowerCase()}`, userId],
  );
  return { ...result.rows[0], is_default: true };
}

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const contractPath = join(root, "deploy/database/database-contract.json");
const migrationRoot = join(root, "deploy/database/migrations");

type DatabaseSpec = { name: string; runtimeRole: string; migrationKey: string; extensions: string[] };
type IndexRequirements = { hnswCosine?: string[]; fullText?: string[]; trigram?: string[] };
type Contract = { postgres: { migratorRole: string; bootstrapRole: string; approvedExtensions: string[]; databases: DatabaseSpec[] }; objects: Record<string, string[]>; indexes: { vectorDimensions: number; vectorDistance: string; vectorAccessMethod: string; textAccessPaths: string[] }; requiredIndexes: Record<string, IndexRequirements>; graphStore: { objects: string[] }; ownedObjectCount: number };

export async function loadContract(): Promise<Contract> {
  const value = JSON.parse(await readFile(contractPath, "utf8")) as Contract;
  const count = Object.values(value.objects).reduce((total, items) => total + items.length, 0) + value.graphStore.objects.length;
  if (count !== value.ownedObjectCount) throw new Error(`database contract object count is ${count}, expected ${value.ownedObjectCount}`);
  const names = new Set(value.postgres.databases.map((database) => database.name));
  if (names.size !== 6 || names.size !== value.postgres.databases.length) throw new Error("database contract must contain six unique databases");
  for (const database of value.postgres.databases) for (const extension of database.extensions) if (!value.postgres.approvedExtensions.includes(extension)) throw new Error(`unapproved extension in contract: ${extension}`);
  return value;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function quoteIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`invalid PostgreSQL identifier: ${value}`);
  return `"${value}"`;
}

function databaseUrl(baseUrl: string, database: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

function roleUrl(baseUrl: string, database: string, username: string, password: string): string {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${database}`;
  parsed.username = username;
  parsed.password = password;
  return parsed.toString();
}

function passwordFor(database: DatabaseSpec): string {
  const envName = `MCB_${database.migrationKey.toUpperCase()}_DATABASE_PASSWORD`;
  return process.env[envName] ?? (database.migrationKey === "core" ? required("MCB_PLATFORM_DATABASE_PASSWORD") : required(envName));
}

async function executeFile(client: pg.Client, path: string): Promise<void> {
  await client.query(await readFile(path, "utf8"));
}

function migrationVersions(database: DatabaseSpec): number[] {
  return [1, 2];
}

async function adoptMigrationOwnership(database: DatabaseSpec): Promise<void> {
  const adminUrl = required("MCB_ADMIN_DATABASE_URL");
  const client = await connect(databaseUrl(adminUrl, database.name));
  try {
    const tables = await client.query<{ schema: string; name: string }>("SELECT schemaname AS schema, tablename AS name FROM pg_tables WHERE schemaname IN ('public','mcb')");
    for (const table of tables.rows) await client.query(`ALTER TABLE ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)} OWNER TO mcb_migrator`);
    const sequences = await client.query<{ schema: string; name: string }>("SELECT sequence_schema AS schema, sequence_name AS name FROM information_schema.sequences WHERE sequence_schema IN ('public','mcb')");
    for (const sequence of sequences.rows) await client.query(`ALTER SEQUENCE ${quoteIdentifier(sequence.schema)}.${quoteIdentifier(sequence.name)} OWNER TO mcb_migrator`);
  } finally { await client.end(); }
}

async function connect(url: string): Promise<pg.Client> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await client.connect();
  return client;
}

export async function bootstrapTopology(): Promise<void> {
  const contract = await loadContract();
  const adminUrl = required("MCB_ADMIN_DATABASE_URL");
  const admin = await connect(adminUrl);
  try {
    const rolePasswords = new Map<string, string>([[contract.postgres.migratorRole, required("MCB_MIGRATOR_PASSWORD")]]);
    for (const database of contract.postgres.databases) rolePasswords.set(database.runtimeRole, passwordFor(database));
    for (const [role, password] of rolePasswords) {
      const result = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
      const sqlPassword = (await admin.query("SELECT quote_literal($1::text) AS value", [password])).rows[0].value as string;
      if (!result.rowCount) await admin.query(`CREATE ROLE ${quoteIdentifier(role)} LOGIN`);
      await admin.query(`ALTER ROLE ${quoteIdentifier(role)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${sqlPassword}`);
    }
    for (const database of contract.postgres.databases) {
      const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database.name]);
      if (!exists.rowCount) await admin.query(`CREATE DATABASE ${quoteIdentifier(database.name)} OWNER ${quoteIdentifier(contract.postgres.migratorRole)}`);
      else await admin.query(`ALTER DATABASE ${quoteIdentifier(database.name)} OWNER TO ${quoteIdentifier(contract.postgres.migratorRole)}`);
      await admin.query(`REVOKE CONNECT ON DATABASE ${quoteIdentifier(database.name)} FROM PUBLIC`);
      await admin.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(database.name)} TO ${quoteIdentifier(contract.postgres.migratorRole)}, ${quoteIdentifier(database.runtimeRole)}`);
    }
  } finally { await admin.end(); }
  for (const database of contract.postgres.databases) {
    const client = await connect(databaseUrl(adminUrl, database.name));
    try {
      for (const extension of database.extensions) {
        if (!contract.postgres.approvedExtensions.includes(extension)) throw new Error(`extension is not approved: ${extension}`);
        const available = await client.query<{ name: string }>("SELECT name FROM pg_available_extensions WHERE name = $1", [extension]);
        if (!available.rowCount) throw new Error(`required PostgreSQL extension is unavailable: ${extension}; install it before bootstrapping ${database.name}`);
        await client.query(`CREATE EXTENSION IF NOT EXISTS ${quoteIdentifier(extension)}`);
      }
      await client.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
      await client.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdentifier(database.runtimeRole)}`);
      if (database.migrationKey === "graph") {
        await client.query(`CREATE SCHEMA IF NOT EXISTS mcb AUTHORIZATION ${quoteIdentifier(contract.postgres.migratorRole)}`);
        await client.query(`GRANT USAGE, CREATE ON SCHEMA mcb TO ${quoteIdentifier(database.runtimeRole)}`);
      }
    } finally { await client.end(); }
  }
}

async function migrateDatabase(database: DatabaseSpec, direction: "up" | "down", target?: number): Promise<void> {
  const adminUrl = required("MCB_ADMIN_DATABASE_URL");
  await adoptMigrationOwnership(database);
  const targetUrl = process.env.MCB_MIGRATOR_DATABASE_URL
    ? databaseUrl(process.env.MCB_MIGRATOR_DATABASE_URL, database.name)
    : roleUrl(adminUrl, database.name, "mcb_migrator", required("MCB_MIGRATOR_PASSWORD"));
  const client = await connect(targetUrl);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS mcb_schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const migrations = migrationVersions(database);
    const currentRows = await client.query<{ version: number }>("SELECT version FROM mcb_schema_migrations ORDER BY version");
    const current = currentRows.rows.at(-1)?.version ?? 0;
    if (direction === "up") {
      await client.query("BEGIN");
      for (const version of migrations.filter((item) => item > current)) {
        await executeFile(client, join(migrationRoot, database.migrationKey, `${String(version).padStart(3, "0")}_up.sql`));
        await client.query("INSERT INTO mcb_schema_migrations(version) VALUES ($1) ON CONFLICT DO NOTHING", [version]);
      }
      await client.query("COMMIT");
    } else {
      const desired = target ?? 0;
      if (desired < 0 || desired > current) throw new Error(`rollback target ${desired} is outside current version ${current}`);
      await client.query("BEGIN");
      for (const version of migrations.filter((item) => item > desired && item <= current).sort((a, b) => b - a)) {
        await executeFile(client, join(migrationRoot, database.migrationKey, `${String(version).padStart(3, "0")}_down.sql`));
        await client.query("DELETE FROM mcb_schema_migrations WHERE version = $1", [version]);
      }
      await client.query("COMMIT");
    }
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* keep original error */ }
    throw error;
  } finally { await client.end(); }
}

async function grantRuntimePrivileges(database: DatabaseSpec, contract: Contract): Promise<void> {
  const adminUrl = required("MCB_ADMIN_DATABASE_URL");
  const client = await connect(roleUrl(adminUrl, database.name, contract.postgres.migratorRole, required("MCB_MIGRATOR_PASSWORD")));
  try {
    const role = quoteIdentifier(database.runtimeRole);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await client.query(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(contract.postgres.migratorRole)} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(contract.postgres.migratorRole)} IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`);
    if (database.migrationKey === "graph") {
      await client.query(`GRANT USAGE, CREATE ON SCHEMA mcb TO ${role}`);
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mcb TO ${role}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(contract.postgres.migratorRole)} IN SCHEMA mcb GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`);
    }
  } finally { await client.end(); }
}

export async function migrateAll(direction: "up" | "down" = "up", target?: number): Promise<void> {
  if (direction === "down") validateRollbackTarget(target);
  const contract = await loadContract();
  for (const database of contract.postgres.databases) {
    await migrateDatabase(database, direction, target);
    if (direction === "up") await grantRuntimePrivileges(database, contract);
  }
}

export function validateRollbackTarget(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > 2) throw new Error("rollback target must be an explicit finite integer between 0 and 2");
  return value;
}

export async function status(): Promise<Record<string, number>> {
  const contract = await loadContract();
  const result: Record<string, number> = {};
  const baseUrl = required("MCB_ADMIN_DATABASE_URL");
  for (const database of contract.postgres.databases) {
    const client = await connect(databaseUrl(baseUrl, database.name));
    try {
      const rows = await client.query<{ version: number }>("SELECT version FROM mcb_schema_migrations ORDER BY version DESC LIMIT 1").catch(() => ({ rows: [] as { version: number }[] }));
      result[database.name] = rows.rows[0]?.version ?? 0;
    } finally { await client.end(); }
  }
  return result;
}

function runtimeDatabaseUrl(database: DatabaseSpec): string {
  const key = database.migrationKey === "core" ? "CORE" : database.migrationKey.toUpperCase();
  return required(`MCB_${key}_DATABASE_URL`);
}

async function connectRuntime(database: DatabaseSpec, targetDatabase?: string, suppressFailure = false): Promise<pg.Client | null> {
  try {
    const base = runtimeDatabaseUrl(database);
    return await connect(targetDatabase ? databaseUrl(base, targetDatabase) : base);
  } catch (error) {
    if (suppressFailure) return null;
    throw error;
  }
}

function runtimeProbe(database: DatabaseSpec): { insert: string; update: string; remove: string } {
  switch (database.migrationKey) {
    case "identity": return { insert: "INSERT INTO organizations (id,name) VALUES ('verify-crud-org','verify')", update: "UPDATE organizations SET name='verify-updated' WHERE id='verify-crud-org'", remove: "DELETE FROM organizations WHERE id='verify-crud-org'" };
    case "core": return { insert: "INSERT INTO platform_config (key,value) VALUES ('verify-crud','{}'::jsonb)", update: "UPDATE platform_config SET value='{}'::jsonb WHERE key='verify-crud'", remove: "DELETE FROM platform_config WHERE key='verify-crud'" };
    case "agent": return { insert: "INSERT INTO checkpoint_migrations (v) VALUES (987654)", update: "UPDATE checkpoint_migrations SET applied_at=now() WHERE v=987654", remove: "DELETE FROM checkpoint_migrations WHERE v=987654" };
    case "nano": return { insert: "INSERT INTO audit_logs (id,action,resource_kind,outcome) VALUES ('verify-crud','verify','verify','allowed')", update: "UPDATE audit_logs SET outcome='denied' WHERE id='verify-crud'", remove: "DELETE FROM audit_logs WHERE id='verify-crud'" };
    case "traditional": return { insert: "INSERT INTO traditional_sources (id,name,kind,owner_user_id,visibility_kind) VALUES ('verify-crud','verify','private','verify-user','private')", update: "UPDATE traditional_sources SET name='verify-updated' WHERE id='verify-crud'", remove: "DELETE FROM traditional_sources WHERE id='verify-crud'" };
    case "graph": return { insert: "INSERT INTO graph_sources (id,name,owner_user_id,workspace,kind,visibility_kind) VALUES ('verify-crud','verify','verify-user','mcb_verify_crud','private','private')", update: "UPDATE graph_sources SET name='verify-updated' WHERE id='verify-crud'", remove: "DELETE FROM graph_sources WHERE id='verify-crud'" };
  }
  throw new Error(`unsupported runtime probe: ${database.migrationKey}`);
}

export async function verifyTopology(): Promise<void> {
  const contract = await loadContract();
  const adminUrl = required("MCB_ADMIN_DATABASE_URL");
  const admin = await connect(adminUrl);
  try {
    const expectedNames = new Set(contract.postgres.databases.map((database) => database.name));
    const actualRows = await admin.query<{ datname: string }>("SELECT datname FROM pg_database WHERE datname LIKE 'mcb\\_%\\_db' ESCAPE '\\'");
    const actualNames = new Set(actualRows.rows.map((row) => row.datname));
    if (actualNames.size !== expectedNames.size || [...expectedNames].some((name) => !actualNames.has(name))) throw new Error(`database topology mismatch; expected ${[...expectedNames].join(",")}`);
    for (const database of contract.postgres.databases) {
      const row = await admin.query<{ owner: string }>("SELECT pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datname = $1", [database.name]);
      if (row.rows[0]?.owner !== contract.postgres.migratorRole) throw new Error(`database ${database.name} owner is not ${contract.postgres.migratorRole}`);
      const role = await admin.query<{ rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean }>("SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1", [database.runtimeRole]);
      const roleRow = role.rows[0];
      if (!roleRow || roleRow.rolsuper || roleRow.rolcreatedb || roleRow.rolcreaterole) throw new Error(`runtime role flags are too broad: ${database.runtimeRole}`);
      const ownConnect = await admin.query("SELECT has_database_privilege($1, $2, 'CONNECT') AS allowed", [database.runtimeRole, database.name]);
      if (ownConnect.rows[0]?.allowed !== true) throw new Error(`runtime role cannot connect: ${database.runtimeRole}`);
      const client = await connect(databaseUrl(adminUrl, database.name));
      try {
        const extensions = await client.query<{ extname: string }>("SELECT extname FROM pg_extension");
        for (const extension of database.extensions) if (!extensions.rows.some((row) => row.extname === extension)) throw new Error(`required extension ${extension} is missing from ${database.name}`);
        const schemaObjects = await client.query<{ schema: string; name: string }>("SELECT n.nspname AS schema, c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('public','mcb') AND c.relkind IN ('r','p')");
        const present = new Set(schemaObjects.rows.map((row) => `${row.schema}.${row.name}`));
        for (const object of contract.objects[database.name] ?? []) {
          const schema = database.migrationKey === "graph" && object.startsWith("lightrag_vdb_") ? "mcb" : "public";
          if (!present.has(`${schema}.${object}`)) throw new Error(`missing ${schema}.${object} in ${database.name}`);
        }
        const vectorCount = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('public','mcb') AND a.attnum > 0 AND NOT a.attisdropped AND format_type(a.atttypid, a.atttypmod) = 'vector(1024)'");
        if (database.extensions.includes("vector") && Number(vectorCount.rows[0]?.count ?? 0) < 1) throw new Error(`no vector(1024) column in ${database.name}`);
        const indexRows = await client.query<{ indexname: string; indexdef: string }>("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname IN ('public','mcb')");
        const indexes = new Map(indexRows.rows.map((row) => [row.indexname, row.indexdef.toLowerCase()]));
        const requirements = contract.requiredIndexes[database.name] ?? {};
        for (const index of requirements.hnswCosine ?? []) if (!indexes.get(index)?.includes("using hnsw") || !indexes.get(index)?.includes("vector_cosine_ops")) throw new Error(`missing HNSW cosine index ${database.name}.${index}`);
        for (const index of requirements.fullText ?? []) if (!indexes.get(index)?.includes("using gin") || !indexes.get(index)?.includes("search_vector")) throw new Error(`missing full-text index ${database.name}.${index}`);
        for (const index of requirements.trigram ?? []) if (!indexes.get(index)?.includes("gin_trgm_ops")) throw new Error(`missing trigram index ${database.name}.${index}`);
      } finally { await client.end(); }
    }
  } finally { await admin.end(); }
  for (const database of contract.postgres.databases) {
    const runtime = await connectRuntime(database);
    if (!runtime) throw new Error(`runtime database URL is unavailable: ${database.name}`);
    try {
      await runtime.query("BEGIN");
      const probe = runtimeProbe(database);
      await runtime.query(probe.insert);
      await runtime.query(probe.update);
      await runtime.query(probe.remove);
      await runtime.query("ROLLBACK");
    } catch (error) {
      await runtime.query("ROLLBACK").catch(() => undefined);
      await runtime.end();
      throw new Error(`assigned CRUD denied for ${database.name}: ${error instanceof Error ? error.message : "query failed"}`);
    }
    await runtime.end();
    for (const other of contract.postgres.databases) if (other.name !== database.name) {
      const cross = await connectRuntime(database, other.name, true);
      if (cross) { await cross.end(); throw new Error(`cross-database CONNECT unexpectedly allowed: ${database.runtimeRole} -> ${other.name}`); }
    }
  }
  const versions = await status();
  for (const database of contract.postgres.databases) {
    const expected = Math.max(...migrationVersions(database));
    if (versions[database.name] !== expected) throw new Error(`database ${database.name} is at migration ${versions[database.name] ?? 0}, expected ${expected}`);
  }
  console.log(JSON.stringify({ verified: true, databases: contract.postgres.databases.length, journals: versions }));
}

export async function resetTargets(targets: string[]): Promise<void> {
  const contract = await loadContract();
  const allowed = new Set(contract.postgres.databases.map((database) => database.name));
  if (!targets.length || targets.some((target) => !allowed.has(target))) throw new Error(`reset requires exact database targets from the contract: ${[...allowed].join(",")}`);
  const admin = await connect(required("MCB_ADMIN_DATABASE_URL"));
  try {
    for (const target of targets) await admin.query(`DROP DATABASE ${quoteIdentifier(target)} WITH (FORCE)`);
  } finally { await admin.end(); }
}

if (import.meta.main) {
  const [command, targetText] = process.argv.slice(2);
  try {
    if (command === "bootstrap" || command === "initialize") await bootstrapTopology();
    else if (command === "migrate") await migrateAll("up");
    else if (command === "rollback") {
      if (targetText === undefined || !/^(0|[1-9][0-9]*)$/.test(targetText)) throw new Error("rollback target must be an explicit finite integer between 0 and 2");
      await migrateAll("down", validateRollbackTarget(Number(targetText)));
    }
    else if (command === "status") console.log(JSON.stringify(await status()));
    else if (command === "verify" || command === "topology" || command === "grants") await verifyTopology();
    else if (command === "reset") {
      if (targetText !== "--confirm") throw new Error("reset is destructive; use reset --confirm database_name[,database_name]");
      const targets = (process.argv[3] ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      await resetTargets(targets);
    } else throw new Error("usage: bun scripts/database.ts <initialize|migrate|rollback VERSION|status|verify|reset --confirm database_name>");
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, "$1<redacted>") : "database operation failed";
    console.error(message);
    process.exitCode = 1;
  }
}

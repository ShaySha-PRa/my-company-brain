export type DatabaseDefinition = {
  name: string;
  runtimeRole: string;
  runtimeUrlEnv: string;
  migrationUrlEnv: string;
  passwordEnv: string;
  extensions: string[];
  coreTables: string[];
};

export const MIGRATOR_ROLE = 'mcb_migrator';
export const LIGHTRAG_SCHEMA = 'lightrag';

export const DATABASES: readonly DatabaseDefinition[] = [
  {
    name: 'mcb_identity_db', runtimeRole: 'mcb_identity_app',
    runtimeUrlEnv: 'IDENTITY_DATABASE_URL', migrationUrlEnv: 'IDENTITY_MIGRATION_DATABASE_URL',
    passwordEnv: 'IDENTITY_APP_PASSWORD', extensions: [],
    coreTables: ['users', 'sessions', 'organizations', 'teams', 'user_team_memberships'],
  },
  {
    name: 'mcb_core_db', runtimeRole: 'mcb_platform_app',
    runtimeUrlEnv: 'PLATFORM_DATABASE_URL', migrationUrlEnv: 'PLATFORM_MIGRATION_DATABASE_URL',
    passwordEnv: 'PLATFORM_APP_PASSWORD', extensions: [], coreTables: [
      'scenarios', 'tasks', 'files', 'parsed_artifacts', 'knowledge_objects',
      'module_references', 'global_chat_sessions', 'scenario_chat_sessions',
      'admin_templates', 'audit_events', 'chat_traces', 'platform_config',
      'ingest_queue', 'notifications',
    ],
  },
  {
    name: 'mcb_nano_db', runtimeRole: 'mcb_nano_app',
    runtimeUrlEnv: 'NANO_BRAIN_DATABASE_URL', migrationUrlEnv: 'NANO_BRAIN_MIGRATION_DATABASE_URL',
    passwordEnv: 'NANO_APP_PASSWORD', extensions: ['vector'], coreTables: [
      'sources', 'pages', 'chunks', 'links', 'fact_submissions', 'facts', 'audit_logs',
      'dream_locks', 'dream_runs', 'dream_phase_runs', 'page_dream_state', 'raw_documents',
      'raw_chunks', 'page_provenance', 'page_members', 'raw_document_compile_state',
      'link_suppressions', 'page_versions', 'fact_conflicts',
    ],
  },
  {
    name: 'mcb_agent_db', runtimeRole: 'mcb_agent_app',
    runtimeUrlEnv: 'AGENT_DATABASE_URL', migrationUrlEnv: 'AGENT_MIGRATION_DATABASE_URL',
    passwordEnv: 'AGENT_APP_PASSWORD', extensions: [], coreTables: ['agent_conversations', 'agent_runs', 'agent_tool_calls'],
  },
  {
    name: 'mcb_traditional_db', runtimeRole: 'mcb_traditional_app',
    runtimeUrlEnv: 'TRADITIONAL_RAG_DATABASE_URL', migrationUrlEnv: 'TRADITIONAL_RAG_MIGRATION_DATABASE_URL',
    passwordEnv: 'TRADITIONAL_APP_PASSWORD', extensions: ['vector', 'pg_trgm'],
    coreTables: [
      'traditional_sources', 'traditional_documents', 'traditional_jobs', 'traditional_chunks',
      'traditional_tables', 'traditional_table_rows', 'traditional_structured_rows',
    ],
  },
  {
    name: 'mcb_graph_db', runtimeRole: 'mcb_graph_app',
    runtimeUrlEnv: 'GRAPH_RAG_DATABASE_URL', migrationUrlEnv: 'GRAPH_RAG_MIGRATION_DATABASE_URL',
    passwordEnv: 'GRAPH_APP_PASSWORD', extensions: ['vector', 'age'],
    coreTables: ['graph_sources', 'graph_documents', 'graph_extraction_review'],
  },
] as const;

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function databaseUrl(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

export function assertFrozenUrls(): void {
  const admin = new URL(requiredEnv('POSTGRES_ADMIN_URL'));
  const expectedHost = `${admin.hostname}:${admin.port || '5432'}`;
  for (const database of DATABASES) {
    for (const [envName, expectedRole] of [
      [database.runtimeUrlEnv, database.runtimeRole],
      [database.migrationUrlEnv, MIGRATOR_ROLE],
    ] as const) {
      const url = new URL(requiredEnv(envName));
      if (`${url.hostname}:${url.port || '5432'}` !== expectedHost) {
        throw new Error(`${envName} must use the same PostgreSQL service as POSTGRES_ADMIN_URL`);
      }
      if (url.pathname.slice(1) !== database.name || decodeURIComponent(url.username) !== expectedRole) {
        throw new Error(`${envName} does not match frozen database/role topology`);
      }
    }
  }
}

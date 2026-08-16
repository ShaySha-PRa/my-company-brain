CREATE TABLE IF NOT EXISTS scenarios (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '',
  owner_user_id text NOT NULL, visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft', metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (visibility_kind IN ('public','private','team')), CHECK (status IN ('draft','active','archived'))
);
CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY, scenario_id text REFERENCES scenarios(id) ON DELETE SET NULL, owner_user_id text NOT NULL,
  title text NOT NULL, status text NOT NULL DEFAULT 'queued', visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}',
  input jsonb NOT NULL DEFAULT '{}', output jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (visibility_kind IN ('public','private','team')), CHECK (status IN ('queued','running','succeeded','failed','cancelled'))
);
CREATE TABLE IF NOT EXISTS files (
  id text PRIMARY KEY, owner_user_id text NOT NULL, scenario_id text REFERENCES scenarios(id) ON DELETE SET NULL,
  filename text NOT NULL, media_type text NOT NULL, storage_key text NOT NULL UNIQUE, size_bytes bigint NOT NULL DEFAULT 0, checksum text,
  visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (visibility_kind IN ('public','private','team'))
);
CREATE TABLE IF NOT EXISTS parsed_artifacts (
  id text PRIMARY KEY, file_id text NOT NULL REFERENCES files(id) ON DELETE CASCADE, kind text NOT NULL, content jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS knowledge_objects (
  id text PRIMARY KEY, owner_user_id text NOT NULL, scenario_id text REFERENCES scenarios(id) ON DELETE SET NULL, object_kind text NOT NULL,
  title text NOT NULL, visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (visibility_kind IN ('public','private','team'))
);
CREATE TABLE IF NOT EXISTS module_references (
  id text PRIMARY KEY, knowledge_object_id text NOT NULL REFERENCES knowledge_objects(id) ON DELETE CASCADE, module_kind text NOT NULL, external_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (module_kind, external_id)
);
CREATE TABLE IF NOT EXISTS global_chat_sessions (
  id text PRIMARY KEY, owner_user_id text NOT NULL, title text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS scenario_chat_sessions (
  id text PRIMARY KEY, scenario_id text NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE, owner_user_id text NOT NULL, title text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_templates (
  id text PRIMARY KEY, owner_user_id text NOT NULL, name text NOT NULL, template_kind text NOT NULL, body jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY, actor_user_id text, action text NOT NULL, resource_kind text NOT NULL, resource_id text, outcome text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), CHECK (outcome IN ('allowed','denied','error'))
);
CREATE TABLE IF NOT EXISTS chat_traces (
  id text PRIMARY KEY, owner_user_id text, session_id text, run_id text, status text NOT NULL DEFAULT 'started', payload jsonb NOT NULL DEFAULT '{}', started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, CHECK (status IN ('started','completed','failed','cancelled'))
);
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY, value jsonb NOT NULL DEFAULT '{}', updated_by_user_id text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ingest_queue (
  id text PRIMARY KEY, owner_user_id text NOT NULL, module_kind text NOT NULL, resource_id text NOT NULL, status text NOT NULL DEFAULT 'queued', attempts integer NOT NULL DEFAULT 0, payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('queued','running','succeeded','failed'))
);
CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY, user_id text NOT NULL, kind text NOT NULL, title text NOT NULL, body text NOT NULL DEFAULT '', read_at timestamptz, payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_visibility ON scenarios (visibility_kind, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks (owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_files_owner ON files (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_objects_visibility ON knowledge_objects (visibility_kind, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_created ON audit_events (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_owner_started ON chat_traces (owner_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_queue_status ON ingest_queue (status, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;

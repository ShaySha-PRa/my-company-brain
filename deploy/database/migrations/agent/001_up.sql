CREATE TABLE IF NOT EXISTS agent_conversations (
  id text PRIMARY KEY, owner_user_id text NOT NULL, title text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'active', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('active','archived','deleted'))
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id text PRIMARY KEY, conversation_id text NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE, owner_user_id text NOT NULL, status text NOT NULL DEFAULT 'started', input jsonb NOT NULL DEFAULT '{}', output jsonb, error_code text, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, CHECK (status IN ('started','running','completed','failed','cancelled'))
);
CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id text PRIMARY KEY, run_id text NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE, tool_name text NOT NULL, status text NOT NULL DEFAULT 'started', input jsonb NOT NULL DEFAULT '{}', output jsonb, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, CHECK (status IN ('started','succeeded','failed'))
);
CREATE TABLE IF NOT EXISTS checkpoint_migrations (
  v integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id text NOT NULL, checkpoint_ns text NOT NULL DEFAULT '', checkpoint_id text NOT NULL, parent_checkpoint_id text, type text NOT NULL, checkpoint jsonb NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);
CREATE TABLE IF NOT EXISTS checkpoint_blobs (
  thread_id text NOT NULL, checkpoint_ns text NOT NULL DEFAULT '', channel text NOT NULL, version text NOT NULL, type text NOT NULL, blob bytea, PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);
CREATE TABLE IF NOT EXISTS checkpoint_writes (
  thread_id text NOT NULL, checkpoint_ns text NOT NULL DEFAULT '', checkpoint_id text NOT NULL, task_id text NOT NULL, idx integer NOT NULL, channel text NOT NULL, type text NOT NULL, value bytea, PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation ON agent_runs (conversation_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_owner_status ON agent_runs (owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_run ON agent_tool_calls (run_id, started_at);
CREATE INDEX IF NOT EXISTS idx_checkpoints_thread ON checkpoints (thread_id, checkpoint_ns, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoint_writes_checkpoint ON checkpoint_writes (thread_id, checkpoint_ns, checkpoint_id);

CREATE TABLE IF NOT EXISTS sources (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '', kind text NOT NULL DEFAULT 'private', owner_user_id text NOT NULL, visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}', is_default boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (kind IN ('public','private','team')), CHECK (visibility_kind IN ('public','private','team'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_nano_default_source_owner ON sources (owner_user_id) WHERE is_default AND active;
CREATE INDEX IF NOT EXISTS idx_nano_sources_visibility ON sources (visibility_kind, owner_user_id);
CREATE TABLE IF NOT EXISTS pages (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE, slug text NOT NULL, title text NOT NULL, content text NOT NULL DEFAULT '', owner_user_id text NOT NULL, visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'active', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (source_id, slug), CHECK (visibility_kind IN ('public','private','team'))
);
CREATE TABLE IF NOT EXISTS chunks (
  id text PRIMARY KEY, page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE, chunk_index integer NOT NULL, content text NOT NULL, embedding vector(1024), search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (page_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS links (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE, from_page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE, to_slug text NOT NULL, relation_kind text NOT NULL DEFAULT 'references', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (source_id, from_page_id, to_slug, relation_kind)
);
CREATE TABLE IF NOT EXISTS fact_submissions (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE, submitted_by_user_id text NOT NULL, subject text NOT NULL, predicate text NOT NULL, object_value text NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('pending','accepted','rejected','conflict'))
);
CREATE TABLE IF NOT EXISTS facts (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE, entity_slug text NOT NULL, predicate text NOT NULL, object_value text NOT NULL, confidence numeric(5,4) NOT NULL DEFAULT 1, embedding vector(1024), search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', entity_slug || ' ' || predicate || ' ' || object_value)) STORED, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (confidence >= 0 AND confidence <= 1)
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY, actor_user_id text, action text NOT NULL, resource_kind text NOT NULL, resource_id text, outcome text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dream_locks (
  source_id text PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE, owner_user_id text NOT NULL, acquired_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS dream_runs (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE, started_by_user_id text NOT NULL, status text NOT NULL DEFAULT 'started', started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, error_message text, CHECK (status IN ('started','running','completed','failed','cancelled'))
);
CREATE TABLE IF NOT EXISTS dream_phase_runs (
  id text PRIMARY KEY, dream_run_id text NOT NULL REFERENCES dream_runs(id) ON DELETE CASCADE, phase text NOT NULL, status text NOT NULL DEFAULT 'started', payload jsonb NOT NULL DEFAULT '{}', started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, CHECK (status IN ('started','running','completed','failed','skipped'))
);
CREATE TABLE IF NOT EXISTS page_dream_state (
  page_id text PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE, last_run_id text REFERENCES dream_runs(id) ON DELETE SET NULL, state jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS raw_documents (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE, owner_user_id text NOT NULL, filename text NOT NULL, content_type text NOT NULL, content bytea, status text NOT NULL DEFAULT 'submitted', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('submitted','compiling','compiled','failed'))
);
CREATE TABLE IF NOT EXISTS raw_chunks (
  id text PRIMARY KEY, raw_document_id text NOT NULL REFERENCES raw_documents(id) ON DELETE CASCADE, chunk_index integer NOT NULL, content text NOT NULL, embedding vector(1024), search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED, UNIQUE (raw_document_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS page_provenance (
  id text PRIMARY KEY, page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE, raw_document_id text REFERENCES raw_documents(id) ON DELETE SET NULL, source_uri text, excerpt text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS page_members (
  page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE, team_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (page_id, team_id)
);
CREATE TABLE IF NOT EXISTS raw_document_compile_state (
  raw_document_id text PRIMARY KEY REFERENCES raw_documents(id) ON DELETE CASCADE, state text NOT NULL DEFAULT 'pending', attempt_count integer NOT NULL DEFAULT 0, last_error text, updated_at timestamptz NOT NULL DEFAULT now(), CHECK (state IN ('pending','running','completed','failed'))
);
CREATE TABLE IF NOT EXISTS link_suppressions (
  source_id text NOT NULL REFERENCES sources(id) ON DELETE CASCADE, from_page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE, to_slug text NOT NULL, created_by_user_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (source_id, from_page_id, to_slug)
);
CREATE TABLE IF NOT EXISTS page_versions (
  id text PRIMARY KEY, page_id text NOT NULL REFERENCES pages(id) ON DELETE CASCADE, version_number integer NOT NULL, title text NOT NULL, content text NOT NULL, created_by_user_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (page_id, version_number)
);
CREATE TABLE IF NOT EXISTS fact_conflicts (
  id text PRIMARY KEY, fact_id text NOT NULL REFERENCES facts(id) ON DELETE CASCADE, submission_id text NOT NULL REFERENCES fact_submissions(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'open', resolved_by_user_id text, resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('open','resolved','dismissed'))
);
CREATE INDEX IF NOT EXISTS idx_nano_pages_owner ON pages (owner_user_id, source_id);
CREATE INDEX IF NOT EXISTS idx_nano_chunks_search ON chunks USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_nano_chunks_trigram ON chunks USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nano_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_nano_raw_chunks_search ON raw_chunks USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_nano_raw_chunks_trigram ON raw_chunks USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nano_raw_chunks_embedding ON raw_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_nano_facts_search ON facts USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_nano_facts_embedding ON facts USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_nano_links_target ON links (source_id, to_slug);
CREATE INDEX IF NOT EXISTS idx_nano_dream_runs_source ON dream_runs (source_id, started_at DESC);

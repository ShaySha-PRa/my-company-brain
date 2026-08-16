CREATE TABLE IF NOT EXISTS traditional_sources (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '', owner_user_id text NOT NULL, kind text NOT NULL DEFAULT 'private', visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}', is_default boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (kind IN ('public','private','team')), CHECK (visibility_kind IN ('public','private','team'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_traditional_default_source_owner ON traditional_sources (owner_user_id) WHERE is_default AND active;
CREATE INDEX IF NOT EXISTS idx_traditional_sources_visibility ON traditional_sources (visibility_kind, owner_user_id);
CREATE TABLE IF NOT EXISTS traditional_documents (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES traditional_sources(id) ON DELETE CASCADE, owner_user_id text NOT NULL, filename text NOT NULL, content_type text NOT NULL, checksum text, status text NOT NULL DEFAULT 'submitted', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('submitted','processing','ready','failed','deleted'))
);
CREATE TABLE IF NOT EXISTS traditional_jobs (
  id text PRIMARY KEY, document_id text REFERENCES traditional_documents(id) ON DELETE CASCADE, source_id text NOT NULL REFERENCES traditional_sources(id) ON DELETE CASCADE, owner_user_id text NOT NULL, job_kind text NOT NULL, status text NOT NULL DEFAULT 'queued', attempts integer NOT NULL DEFAULT 0, error_message text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('queued','running','succeeded','failed','cancelled'))
);
CREATE TABLE IF NOT EXISTS traditional_chunks (
  id text PRIMARY KEY, document_id text NOT NULL REFERENCES traditional_documents(id) ON DELETE CASCADE, source_id text NOT NULL REFERENCES traditional_sources(id) ON DELETE CASCADE, chunk_index integer NOT NULL, content text NOT NULL, embedding vector(1024), search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (document_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS traditional_tables (
  id text PRIMARY KEY, document_id text NOT NULL REFERENCES traditional_documents(id) ON DELETE CASCADE, source_id text NOT NULL REFERENCES traditional_sources(id) ON DELETE CASCADE, table_name text NOT NULL, columns jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (document_id, table_name)
);
CREATE TABLE IF NOT EXISTS traditional_table_rows (
  id text PRIMARY KEY, table_id text NOT NULL REFERENCES traditional_tables(id) ON DELETE CASCADE, row_index integer NOT NULL, values jsonb NOT NULL DEFAULT '{}', search_text text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (table_id, row_index)
);
CREATE TABLE IF NOT EXISTS traditional_structured_rows (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES traditional_sources(id) ON DELETE CASCADE, document_id text REFERENCES traditional_documents(id) ON DELETE CASCADE, row_key text NOT NULL, values jsonb NOT NULL DEFAULT '{}', embedding vector(1024), search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', values::text)) STORED, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (source_id, row_key)
);
CREATE INDEX IF NOT EXISTS idx_traditional_documents_source_status ON traditional_documents (source_id, status);
CREATE INDEX IF NOT EXISTS idx_traditional_jobs_status ON traditional_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_traditional_chunks_search ON traditional_chunks USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_traditional_chunks_trigram ON traditional_chunks USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_traditional_chunks_embedding ON traditional_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_traditional_rows_search ON traditional_structured_rows USING gin (search_vector);
CREATE INDEX IF NOT EXISTS idx_traditional_rows_embedding ON traditional_structured_rows USING hnsw (embedding vector_cosine_ops);

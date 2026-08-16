CREATE SCHEMA IF NOT EXISTS mcb;
CREATE TABLE IF NOT EXISTS graph_sources (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '', owner_user_id text NOT NULL, kind text NOT NULL DEFAULT 'private', visibility_kind text NOT NULL DEFAULT 'private', allowed_team_ids text[] NOT NULL DEFAULT '{}', workspace text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (kind IN ('public','private','team')), CHECK (visibility_kind IN ('public','private','team')), CHECK (workspace ~ '^mcb_[a-z0-9_]+$')
);
CREATE INDEX IF NOT EXISTS idx_graph_sources_visibility ON graph_sources (visibility_kind, owner_user_id);
CREATE TABLE IF NOT EXISTS graph_documents (
  id text PRIMARY KEY, source_id text NOT NULL REFERENCES graph_sources(id) ON DELETE CASCADE, owner_user_id text NOT NULL, title text NOT NULL, content text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'submitted', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('submitted','processing','ready','failed','deleted'))
);
CREATE TABLE IF NOT EXISTS graph_extraction_review (
  id text PRIMARY KEY, document_id text NOT NULL REFERENCES graph_documents(id) ON DELETE CASCADE, reviewer_user_id text, status text NOT NULL DEFAULT 'pending', payload jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (status IN ('pending','approved','rejected'))
);
CREATE TABLE IF NOT EXISTS lightrag_doc_status (
  id text PRIMARY KEY, workspace text NOT NULL, doc_id text NOT NULL, status text NOT NULL DEFAULT 'pending', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, doc_id)
);
CREATE TABLE IF NOT EXISTS lightrag_doc_full (
  id text PRIMARY KEY, workspace text NOT NULL, doc_id text NOT NULL, content text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, doc_id)
);
CREATE TABLE IF NOT EXISTS lightrag_doc_chunks (
  id text PRIMARY KEY, workspace text NOT NULL, doc_id text NOT NULL, chunk_index integer NOT NULL, content text NOT NULL, embedding vector(1024), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, doc_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS lightrag_full_entities (
  id text PRIMARY KEY, workspace text NOT NULL, entity_name text NOT NULL, description text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, entity_name)
);
CREATE TABLE IF NOT EXISTS lightrag_full_relations (
  id text PRIMARY KEY, workspace text NOT NULL, source_entity text NOT NULL, target_entity text NOT NULL, description text NOT NULL DEFAULT '', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, source_entity, target_entity)
);
CREATE TABLE IF NOT EXISTS lightrag_entity_chunks (
  id text PRIMARY KEY, workspace text NOT NULL, entity_id text NOT NULL REFERENCES lightrag_full_entities(id) ON DELETE CASCADE, chunk_id text NOT NULL, embedding vector(1024), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, entity_id, chunk_id)
);
CREATE TABLE IF NOT EXISTS lightrag_relation_chunks (
  id text PRIMARY KEY, workspace text NOT NULL, relation_id text NOT NULL REFERENCES lightrag_full_relations(id) ON DELETE CASCADE, chunk_id text NOT NULL, embedding vector(1024), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, relation_id, chunk_id)
);
CREATE TABLE IF NOT EXISTS lightrag_llm_cache (
  id text PRIMARY KEY, workspace text NOT NULL, cache_key text NOT NULL, value jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, cache_key)
);
CREATE TABLE IF NOT EXISTS mcb.lightrag_vdb_chunks_workspace (
  id text PRIMARY KEY, workspace text NOT NULL, chunk_id text NOT NULL, content text NOT NULL DEFAULT '', embedding vector(1024), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, chunk_id)
);
CREATE TABLE IF NOT EXISTS mcb.lightrag_vdb_entity_workspace (
  id text PRIMARY KEY, workspace text NOT NULL, entity_id text NOT NULL, content text NOT NULL DEFAULT '', embedding vector(1024), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, entity_id)
);
CREATE TABLE IF NOT EXISTS mcb.lightrag_vdb_relation_workspace (
  id text PRIMARY KEY, workspace text NOT NULL, relation_id text NOT NULL, content text NOT NULL DEFAULT '', embedding vector(1024), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (workspace, relation_id)
);
CREATE INDEX IF NOT EXISTS idx_graph_doc_status_workspace ON lightrag_doc_status (workspace, status);
CREATE INDEX IF NOT EXISTS idx_graph_doc_chunks_embedding ON lightrag_doc_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_graph_entity_chunks_embedding ON lightrag_entity_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_graph_relation_chunks_embedding ON lightrag_relation_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_graph_vdb_chunks_embedding ON mcb.lightrag_vdb_chunks_workspace USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_graph_vdb_entity_embedding ON mcb.lightrag_vdb_entity_workspace USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_graph_vdb_relation_embedding ON mcb.lightrag_vdb_relation_workspace USING hnsw (embedding vector_cosine_ops);

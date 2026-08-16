ALTER TABLE facts ADD COLUMN IF NOT EXISTS embedding vector(1024);
CREATE INDEX IF NOT EXISTS idx_nano_facts_embedding ON facts USING hnsw (embedding vector_cosine_ops);

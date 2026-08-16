DROP INDEX IF EXISTS idx_nano_facts_embedding;
ALTER TABLE facts DROP COLUMN IF EXISTS embedding;

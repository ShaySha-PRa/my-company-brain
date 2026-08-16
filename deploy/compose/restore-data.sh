#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
env_file=${MCB_COMPOSE_ENV_FILE:-"$script_dir/.env"}
project_name=${MCB_COMPOSE_PROJECT_NAME:-mcb}
data_dir="$script_dir/member-data"
isolation_prefix=${MCB_ISOLATION_VOLUME_PREFIX:-}

if [ "$#" -ne 0 ]; then
  echo "Usage: $0" >&2
  echo "This command never overwrites an initialized local dataset." >&2
  exit 2
fi

if [ ! -f "$env_file" ]; then
  echo "Missing private env file: $env_file" >&2
  exit 2
fi

env_value() {
  sed -n "s/^${1}=//p" "$env_file" | tail -n 1
}

compose() {
  if [ -n "$isolation_prefix" ]; then
    MCB_ISOLATION_VOLUME_PREFIX="$isolation_prefix" docker compose \
      --project-name "$project_name" \
      --env-file "$env_file" \
      -f "$script_dir/compose.member.yml" \
      -f "$script_dir/compose.build.yml" \
      -f "$script_dir/compose.isolated.yml" \
      "$@"
  else
    docker compose \
      --project-name "$project_name" \
      --env-file "$env_file" \
      -f "$script_dir/compose.member.yml" \
      -f "$script_dir/compose.build.yml" \
      "$@"
  fi
}

if [ -n "$isolation_prefix" ]; then
  case "$isolation_prefix" in
    mcb_[A-Za-z0-9_-]*) ;;
    *)
      echo "Unsafe MCB_ISOLATION_VOLUME_PREFIX: $isolation_prefix" >&2
      exit 2
      ;;
  esac
  volume_prefix=$isolation_prefix
else
  volume_prefix=mcb
fi

for required_file in manifest.json SHA256SUMS; do
  if [ ! -f "$data_dir/$required_file" ]; then
    echo "Missing member data artifact: $data_dir/$required_file" >&2
    exit 2
  fi
done

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$data_dir" && sha256sum --check SHA256SUMS)
elif command -v shasum >/dev/null 2>&1; then
  (cd "$data_dir" && shasum -a 256 --check SHA256SUMS)
else
  echo "Neither sha256sum nor shasum is available." >&2
  exit 2
fi

postgres_container=$(compose ps -q postgres)
neo4j_container=$(compose ps -q neo4j)
web_container=$(compose ps -q web)
traditional_container=$(compose ps -q traditional-rag)

if [ -z "$postgres_container" ] || [ -z "$neo4j_container" ]; then
  echo "PostgreSQL and Neo4j must be running before snapshot restore." >&2
  exit 2
fi

bootstrap_user=$(env_value POSTGRES_BOOTSTRAP_USER)
image_prefix=$(env_value MCB_IMAGE_PREFIX)
image_tag=$(env_value MCB_IMAGE_TAG)
neo4j_user=$(env_value NEO4J_USERNAME)
neo4j_password=$(env_value NEO4J_PASSWORD)

[ -n "$bootstrap_user" ] || bootstrap_user=postgres
[ -n "$image_tag" ] || image_tag=latest

marker_exists=$(docker exec "$postgres_container" psql \
  -U "$bootstrap_user" -d mcb_core_db -Atc \
  "SELECT (to_regclass('public.mcb_runtime_snapshot') IS NOT NULL)::int")
marker_count=0
if [ "$marker_exists" = "1" ]; then
  marker_count=$(docker exec "$postgres_container" psql \
    -U "$bootstrap_user" -d mcb_core_db -Atc \
    "SELECT count(*) FROM mcb_runtime_snapshot WHERE snapshot_id = 'mcb-initial-20260816'")
fi

if [ "$marker_count" = "1" ]; then
  echo "Business data snapshot already restored; preserving local data."
  exit 0
fi

assert_zero() {
  label=$1
  database=$2
  query=$3
  count=$(docker exec "$postgres_container" psql -U "$bootstrap_user" -d "$database" -Atc "$query")
  if [ "$count" != "0" ]; then
    echo "Refusing snapshot restore: $label contains $count existing records." >&2
    exit 2
  fi
}

identity_users=$(docker exec "$postgres_container" psql -U "$bootstrap_user" \
  -d mcb_identity_db -Atc "SELECT count(*) FROM users")
identity_admins=$(docker exec "$postgres_container" psql -U "$bootstrap_user" \
  -d mcb_identity_db -Atc "SELECT count(*) FROM users WHERE is_admin")
if [ "$identity_users" != "1" ] || [ "$identity_admins" != "1" ]; then
  echo "Refusing snapshot restore: identity database is not a fresh one-admin database." >&2
  exit 2
fi

assert_zero "identity sessions" mcb_identity_db "SELECT count(*) FROM sessions"
assert_zero "platform scenarios" mcb_core_db "SELECT count(*) FROM scenarios"
assert_zero "platform chat sessions" mcb_core_db "SELECT count(*) FROM global_chat_sessions"
assert_zero "Nano Brain pages" mcb_nano_db "SELECT count(*) FROM pages"
assert_zero "Agent conversations" mcb_agent_db "SELECT count(*) FROM agent_conversations"
assert_zero "Traditional RAG documents" mcb_traditional_db "SELECT count(*) FROM traditional_documents"
assert_zero "GraphRAG documents" mcb_graph_db "SELECT count(*) FROM graph_documents"

neo4j_nodes=$(docker exec "$neo4j_container" /var/lib/neo4j/bin/cypher-shell \
  -u "$neo4j_user" -p "$neo4j_password" --format plain \
  "MATCH (n) RETURN count(n)" | tail -n 1)
if [ "$neo4j_nodes" != "0" ]; then
  echo "Refusing snapshot restore: Neo4j contains $neo4j_nodes existing nodes." >&2
  exit 2
fi

if [ -n "$web_container" ]; then
  docker exec "$web_container" sh -c \
    'test ! -d /var/lib/mcb/platform/uploads || test -z "$(find /var/lib/mcb/platform/uploads -type f -print -quit)"' \
    || {
      echo "Refusing snapshot restore: platform upload volume is not empty." >&2
      exit 2
    }
fi

if [ -n "$traditional_container" ]; then
  docker exec "$traditional_container" sh -c \
    'test ! -d /var/lib/mcb/traditional/files || test -z "$(find /var/lib/mcb/traditional/files -type f -print -quit)"' \
    || {
      echo "Refusing snapshot restore: Traditional RAG file volume is not empty." >&2
      exit 2
    }
fi

echo "Fresh local stack confirmed. Restoring sanitized business data..."
compose stop web api agent-gateway nano-brain traditional-rag graph-rag >/dev/null

for database in \
  mcb_identity_db mcb_core_db mcb_nano_db \
  mcb_agent_db mcb_traditional_db mcb_graph_db
do
  dump_name="${database}.dump"
  docker exec "$postgres_container" psql \
    -U "$bootstrap_user" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$database' AND pid <> pg_backend_pid()" \
    -c "DROP DATABASE IF EXISTS $database" \
    -c "CREATE DATABASE $database OWNER mcb_migrator" >/dev/null
  # PostgreSQL only lets the bootstrap superuser create these trusted
  # extensions. Business objects remain owned by the least-privilege
  # mcb_migrator role during pg_restore.
  case "$database" in
    mcb_nano_db|mcb_graph_db)
      docker exec "$postgres_container" psql \
        -U "$bootstrap_user" -d "$database" -v ON_ERROR_STOP=1 \
        -c "CREATE EXTENSION IF NOT EXISTS vector" >/dev/null
      ;;
    mcb_traditional_db)
      docker exec "$postgres_container" psql \
        -U "$bootstrap_user" -d "$database" -v ON_ERROR_STOP=1 \
        -c "CREATE EXTENSION IF NOT EXISTS vector" \
        -c "CREATE EXTENSION IF NOT EXISTS pg_trgm" >/dev/null
      ;;
  esac
  docker cp "$data_dir/postgres/$dump_name" \
    "$postgres_container:/tmp/$dump_name" >/dev/null
  docker exec "$postgres_container" sh -c \
    "pg_restore -l '/tmp/$dump_name' | grep -v ' EXTENSION ' > '/tmp/$dump_name.list'"
  docker exec "$postgres_container" pg_restore \
    --username "$bootstrap_user" \
    --dbname "$database" \
    --no-owner --no-privileges \
    --role=mcb_migrator \
    --use-list="/tmp/$dump_name.list" \
    --exit-on-error \
    "/tmp/$dump_name"
  docker exec "$postgres_container" rm -f \
    "/tmp/$dump_name" "/tmp/$dump_name.list"
done

compose run --rm --no-deps --entrypoint bun migrate \
  /app/scripts/rebind-member-admin.ts

compose stop neo4j >/dev/null
docker run --rm --network none \
  --entrypoint neo4j-admin \
  --user 7474:7474 \
  --mount "type=volume,src=${volume_prefix}_neo4j_data,dst=/data" \
  --mount "type=bind,src=$data_dir/neo4j,dst=/backups,readonly" \
  "$image_prefix/neo4j:$image_tag" \
  database load neo4j --from-path=/backups --overwrite-destination=true
compose up --detach neo4j

neo4j_container=$(compose ps -q neo4j)
health_attempt=0
while [ "$health_attempt" -lt 90 ]; do
  health=$(docker inspect -f \
    '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$neo4j_container" 2>/dev/null || true)
  [ "$health" = "healthy" ] && break
  health_attempt=$((health_attempt + 1))
  sleep 1
done
if [ "${health:-}" != "healthy" ]; then
  echo "Neo4j did not become healthy after snapshot restore." >&2
  exit 1
fi

docker run --rm --network none \
  --entrypoint sh \
  --mount "type=volume,src=${volume_prefix}_platform_files,dst=/target" \
  --mount "type=bind,src=$data_dir/files,dst=/snapshots,readonly" \
  "$image_prefix/web:$image_tag" \
  -c 'rm -rf /target/uploads && tar -xzf /snapshots/platform-files.tar.gz -C /target'

docker run --rm --network none \
  --entrypoint sh \
  --mount "type=volume,src=${volume_prefix}_traditional_files,dst=/target" \
  --mount "type=bind,src=$data_dir/files,dst=/snapshots,readonly" \
  "$image_prefix/traditional-rag:$image_tag" \
  -c 'rm -rf /target/files && tar -xzf /snapshots/traditional-files.tar.gz -C /target'

compose run --rm --no-deps migrate

docker exec "$postgres_container" psql -U "$bootstrap_user" \
  -d mcb_core_db -v ON_ERROR_STOP=1 \
  -c "CREATE TABLE IF NOT EXISTS mcb_runtime_snapshot (
        snapshot_id TEXT PRIMARY KEY,
        restored_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )" \
  -c "INSERT INTO mcb_runtime_snapshot (snapshot_id)
      VALUES ('mcb-initial-20260816')
      ON CONFLICT (snapshot_id) DO NOTHING" >/dev/null

compose up --detach
echo "Sanitized business data snapshot restored successfully."

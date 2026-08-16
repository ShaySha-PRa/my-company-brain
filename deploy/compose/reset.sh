#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
env_file=${MCB_COMPOSE_ENV_FILE:-"$script_dir/.env"}

if [ "${1:-}" != "--yes" ]; then
  echo "Refusing reset without --yes. This removes only mcb Compose containers and named volumes." >&2
  exit 2
fi

if [ ! -f "$env_file" ]; then
  echo "Missing private env file: $env_file" >&2
  exit 2
fi

# Explicit project name + exactly one Compose file keeps this reset scoped to the
# six named mcb_* volumes declared by the local topology.
exec docker compose --project-name mcb --env-file "$env_file" \
  -f "$script_dir/compose.member.yml" down --volumes --remove-orphans

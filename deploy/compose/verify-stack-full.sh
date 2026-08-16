#!/bin/sh
set -u

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_dir/../.." && pwd)
mode=${1:-full}
started_at=$(date +%s)

elapsed() {
  now=$(date +%s)
  echo "$((now - started_at))s"
}

fail() {
  echo "STACK_RESULT=FAIL duration=$(elapsed) reason=$1" >&2
  exit 1
}

setup_blocked() {
  echo "STACK_RESULT=SETUP_BLOCKED duration=$(elapsed) reason=$1" >&2
  exit 2
}

case "$mode" in
  core|full) ;;
  *) setup_blocked "usage: verify-isolated-stack-check.sh [core|full]" ;;
esac

command -v bun >/dev/null 2>&1 || setup_blocked "bun is unavailable"
[ -n "${POSTGRES_ADMIN_URL:-}" ] \
  || setup_blocked "POSTGRES_ADMIN_URL is required for the unique isolated Identity probe databases"

echo "STACK_CHECK=focused-static-and-real-pg"
(
  cd "$repository_root" || exit 1
  bun test \
    deploy/database/tests/stage2-static.test.ts \
    deploy/compose/tests/compose-contract.test.ts \
    deploy/compose/tests/delivery-verification-contract.test.ts \
    packages/identity/src/isolated-identity.test.ts \
    apps/api/src/routes/auth.test.ts \
    apps/web/lib/api-auth.test.ts \
    apps/web/lib/server/auth-store.test.ts \
    apps/web/components/auth/login-page.test.tsx \
    apps/agent-gateway/src/http/isolated-identity.test.ts \
    packages/platform/src/m1-5-authorization-red.test.ts
) || fail "focused isolated stack static/HTTP/Identity PostgreSQL suites failed"

if [ "$mode" = core ]; then
  echo "STACK_RESULT=CORE_PASS duration=$(elapsed) note=browser/full-stack matrix not claimed"
  exit 0
fi

command -v docker >/dev/null 2>&1 || setup_blocked "docker is unavailable"
command -v curl >/dev/null 2>&1 || setup_blocked "curl is unavailable"

project=${MCB_ISOLATION_COMPOSE_PROJECT:-}
volume_prefix=${MCB_ISOLATION_VOLUME_PREFIX:-}
web_base_url=${MCB_ISOLATION_WEB_BASE_URL:-}
compose_env_file=${MCB_ISOLATION_COMPOSE_ENV_FILE:-"$script_dir/.env"}
browser_spec="$repository_root/apps/web/e2e/isolated/stack-check.spec.ts"

[ -n "$project" ] || setup_blocked "MCB_ISOLATION_COMPOSE_PROJECT is required for isolated full-stack evidence"
[ -n "$volume_prefix" ] || setup_blocked "MCB_ISOLATION_VOLUME_PREFIX is required for isolated full-stack evidence"
case "$project" in
  mcb-isolated-?*) ;;
  *) fail "MCB_ISOLATION_COMPOSE_PROJECT must start with mcb-isolated- and cannot name the shared project" ;;
esac
case "$volume_prefix" in
  mcb_isolated_?*) ;;
  *) fail "MCB_ISOLATION_VOLUME_PREFIX must start with mcb_isolated_ and cannot name shared volumes" ;;
esac
[ -n "$web_base_url" ] || setup_blocked "MCB_ISOLATION_WEB_BASE_URL is required for true browser/HTTP evidence"
[ -f "$compose_env_file" ] || setup_blocked "MCB_ISOLATION_COMPOSE_ENV_FILE must point to the private Compose env"

container_ids=$(docker ps --quiet --filter "label=com.docker.compose.project=$project") \
  || setup_blocked "cannot inspect the isolated Compose project"
[ -n "$container_ids" ] || setup_blocked "isolated Compose project is not running"

for container_id in $container_ids; do
  volume_names=$(docker inspect \
    --format '{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}' \
    "$container_id") || setup_blocked "cannot inspect isolated Compose volumes"
  for volume_name in $volume_names; do
    case "$volume_name" in
      "$volume_prefix"_*) ;;
      *) fail "isolated project is attached to a non-isolated named volume" ;;
    esac
  done
done

curl --fail --silent --show-error "$web_base_url/" >/dev/null \
  || setup_blocked "isolated Web/API health endpoint is unavailable"
[ -f "$browser_spec" ] \
  || setup_blocked "true browser/full-stack spec apps/web/e2e/isolated/stack-check.spec.ts is unavailable"
browser_path=$(
  cd "$repository_root" \
    && bun -e "import { chromium } from '@playwright/test'; process.stdout.write(chromium.executablePath())"
) || setup_blocked "Playwright Chromium path cannot be resolved"
[ -x "$browser_path" ] || setup_blocked "Playwright Chromium is not installed"

echo "STACK_CHECK=browser-http-db-agent"
(
  cd "$repository_root" || exit 1
  MCB_ISOLATION_WEB_BASE_URL="$web_base_url" \
    MCB_ISOLATION_COMPOSE_PROJECT="$project" \
    MCB_ISOLATION_VOLUME_PREFIX="$volume_prefix" \
    MCB_ISOLATION_COMPOSE_ENV_FILE="$compose_env_file" \
    bunx playwright test --config apps/web/e2e/isolated/playwright.config.ts "$browser_spec"
) || fail "browser/HTTP/DB/Agent STACK_CHECK matrix failed"

echo "STACK_RESULT=PASS duration=$(elapsed)"

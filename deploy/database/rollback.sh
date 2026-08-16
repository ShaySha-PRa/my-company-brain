#!/usr/bin/env bash
set -euo pipefail
version="${1:?a target migration version is required}"
exec bun scripts/database.ts rollback "$version"

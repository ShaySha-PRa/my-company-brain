#!/usr/bin/env bash
set -euo pipefail
exec bun scripts/database.ts migrate

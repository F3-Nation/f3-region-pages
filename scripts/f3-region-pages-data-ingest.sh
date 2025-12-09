#!/usr/bin/env bash
# Runs daily F3 region pages data ingest (prune + seed). Designed for launchd.
set -euo pipefail

# Ensure common Homebrew bin paths are available for launchd.
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${HOME}/Library/Logs/f3-region-pages-data-ingest"
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
LOG_FILE="${LOG_DIR}/run-${TIMESTAMP}.log"

mkdir -p "${LOG_DIR}"
cd "${REPO_ROOT}"

# Load env for DB access if present.
if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

command -v pnpm >/dev/null 2>&1 || {
  echo "pnpm not found in PATH" >&2
  exit 1
}

{
  echo "=== db maintenance start $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
  pnpm db:prune:regions
  pnpm db:prune:workouts
  pnpm db:seed
  echo "=== db maintenance end $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
} >>"${LOG_FILE}" 2>&1

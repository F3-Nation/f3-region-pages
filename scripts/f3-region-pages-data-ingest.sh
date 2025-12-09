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

log() {
  # Use UTC timestamps to match launchd logs.
  printf "[%s] %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

# Show output live and persist it to the rotating log file.
exec > >(tee -a "${LOG_FILE}") 2>&1
log "Logging to ${LOG_FILE}"
log "Repo root: ${REPO_ROOT}"

# Load env for DB access if present.
if [[ -f ".env.local" ]]; then
  log "Loading environment from .env.local"
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
else
  log "No .env.local found; proceeding with defaults"
fi

command -v pnpm >/dev/null 2>&1 || {
  echo "pnpm not found in PATH" >&2
  exit 1
}

log "=== db maintenance start ==="
log "Pruning regions"
pnpm db:prune:regions

log "Pruning workouts"
pnpm db:prune:workouts

log "Seeding database"
pnpm db:seed

log "=== db maintenance end ==="

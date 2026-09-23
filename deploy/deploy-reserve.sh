#!/usr/bin/env bash
# Deploy a bot instance to the restricted reserve VPS. The SSH user owns the
# application tree and only uses passwordless sudo for restarting its
# pre-installed systemd unit.
#
# Usage: ./deploy/deploy-reserve.sh {prod|test} [--no-typecheck] [--dirty]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

: ${HOST:?set HOST=litteraly@<reserve-vps-ip>}
: ${RESERVE_BUN_BIN:="/usr/local/bin/bun"}
: ${KEEP_RELEASES:=5}

PROFILE="${1:-}"
[ -n "$PROFILE" ] || { echo "Usage: $0 {prod|test} [--no-typecheck] [--dirty]" >&2; exit 2; }
shift

case "$PROFILE" in
  prod)
    RESERVE_ROOT="${RESERVE_ROOT_PROD:-${RESERVE_ROOT:-/opt/meatproxy-prod}}"
    RESERVE_SERVICE="${RESERVE_SERVICE_PROD:-${RESERVE_SERVICE:-meatproxy-prod}}"
    RESERVE_PORT="${RESERVE_PORT_PROD:-${RESERVE_PORT:-8787}}"
    RESERVE_PUBLIC_ORIGIN="${RESERVE_PUBLIC_ORIGIN_PROD:-${RESERVE_PUBLIC_ORIGIN:-https://miniapp.xdshka.party}}"
    ;;
  test)
    RESERVE_ROOT="${RESERVE_ROOT_TEST:-${RESERVE_ROOT:-/opt/meatproxy-test}}"
    RESERVE_SERVICE="${RESERVE_SERVICE_TEST:-${RESERVE_SERVICE:-meatproxy-test}}"
    RESERVE_PORT="${RESERVE_PORT_TEST:-${RESERVE_PORT:-8788}}"
    RESERVE_PUBLIC_ORIGIN="${RESERVE_PUBLIC_ORIGIN_TEST:-${RESERVE_PUBLIC_ORIGIN:-https://miniapp-dev.xdshka.party}}"
    KEEP_RELEASES="${KEEP_RELEASES_TEST:-3}"
    ;;
  *) echo "Unsupported reserve profile: $PROFILE" >&2; exit 2 ;;
esac

SSH_OPTS="${SSH_OPTS:--o ConnectTimeout=25 -o ConnectionAttempts=5 -o ServerAliveInterval=10 -o ServerAliveCountMax=6 -o BatchMode=yes}"

DRY_RUN=false
SKIP_TYPECHECK=false
ALLOW_DIRTY=false
while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --no-typecheck) SKIP_TYPECHECK=true ;;
    --dirty) ALLOW_DIRTY=true ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
  shift
done

log()  { echo "==> $(TZ=UTC date +%H:%M:%S) $*"; }
warn() { echo "WARN: $*" >&2; }
fail() { echo "FATAL: $*" >&2; exit 1; }

SSH_BASE="ssh $SSH_OPTS"
run_ssh()    { $SSH_BASE "$HOST" "$@"; }
run_cmd()    { if $DRY_RUN; then echo "[DRY-RUN] $*"; else "$@"; fi; }
run_remote() { if $DRY_RUN; then echo "[DRY-RUN] ssh $HOST: $1"; else run_ssh "$1"; fi; }

check_git_clean() {
  if ! $ALLOW_DIRTY && [ -n "$(git status --porcelain)" ]; then
    warn "Uncommitted changes:"
    git status --short >&2
    fail "Use --dirty to deploy anyway"
  fi
}

check_typecheck() {
  if ! $SKIP_TYPECHECK; then
    log "Running typecheck"
    bun run typecheck || fail "Typecheck failed (use --no-typecheck to skip)"
  fi
}

check_remote() {
  log "Checking reserve SSH and prerequisites"
  run_ssh "test -d '$RESERVE_ROOT' && test -w '$RESERVE_ROOT' && test -x '$RESERVE_BUN_BIN'" \
    || fail "Reserve path is not writable or Bun is missing: $RESERVE_ROOT / $RESERVE_BUN_BIN"
  run_ssh "sudo -n systemctl status '$RESERVE_SERVICE' >/dev/null 2>&1 || test \$? -eq 3" \
    || fail "Cannot use the restricted systemd permission for $RESERVE_SERVICE"
}

restart_service() {
  run_remote "sudo -n systemctl restart '$RESERVE_SERVICE'"
}

cd "$SCRIPT_DIR/.."

log "Pre-flight checks ($PROFILE reserve deploy)"
check_git_clean
check_typecheck
check_remote

log "Building Mini App"
run_cmd bash -c 'cd miniapp && bun install --frozen-lockfile && bun run build'

RELEASE="$(TZ=UTC date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
API_RELEASE="$RESERVE_ROOT/releases/$RELEASE"
STATIC_ROOT="$RESERVE_ROOT/web"
STATIC_RELEASE="$STATIC_ROOT/releases/$RELEASE"

log "Deploying $PROFILE reserve release $RELEASE to $HOST"
run_remote "mkdir -p '$API_RELEASE' '$STATIC_RELEASE/dist' '$RESERVE_ROOT/data' '$RESERVE_ROOT/data/audio-scratch'"

log "Syncing server code"
run_cmd rsync -az --delete \
  --exclude node_modules --exclude .git --exclude openspec --exclude data \
  -e "$SSH_BASE" \
  server package.json bun.lock tsconfig.json "$HOST:$API_RELEASE/"

log "Syncing Mini App static build"
run_cmd rsync -az --delete -e "$SSH_BASE" miniapp/dist/ "$HOST:$STATIC_RELEASE/dist/"

log "Installing production dependencies on reserve"
run_remote "cd '$API_RELEASE' && '$RESERVE_BUN_BIN' install --production --frozen-lockfile"

log "Pointing current symlinks"
run_remote "ln -sfn '$API_RELEASE' '$RESERVE_ROOT/current' && ln -sfn '$STATIC_RELEASE' '$STATIC_ROOT/current'"

log "Restarting $RESERVE_SERVICE"
restart_service

log "Health check"
if $DRY_RUN; then
  echo "[DRY-RUN] Skipping health check"
elif run_ssh "curl -fsS --max-time 10 http://127.0.0.1:$RESERVE_PORT/healthz && test -f '$STATIC_ROOT/current/dist/index.html'"; then
  log "Reserve deploy OK: $PROFILE $RELEASE ($RESERVE_PUBLIC_ORIGIN)"
  if [ "$KEEP_RELEASES" -gt 0 ]; then
    run_remote "cd '$RESERVE_ROOT/releases' && cur=\$(readlink -f '$RESERVE_ROOT/current'); ls -1dt */ | sed 's:/\$::' | grep -vxF \"\$(basename \"\$cur\")\" | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf"
    run_remote "cd '$STATIC_ROOT/releases' && cur=\$(readlink -f '$STATIC_ROOT/current'); ls -1dt */ | sed 's:/\$::' | grep -vxF \"\$(basename \"\$cur\")\" | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf"
  fi
else
  warn "Health check FAILED — rolling back reserve $PROFILE"
  PREV_RELEASE=$(run_ssh "cd '$RESERVE_ROOT/releases' && ls -1dt */ | sed 's:/\$::' | grep -vxF '$RELEASE' | head -n 1" || true)
  if [ -n "$PREV_RELEASE" ]; then
    run_remote "ln -sfn '$RESERVE_ROOT/releases/$PREV_RELEASE' '$RESERVE_ROOT/current' && ln -sfn '$STATIC_ROOT/releases/$PREV_RELEASE' '$STATIC_ROOT/current'"
    restart_service
    warn "Reserve rollback completed: $PREV_RELEASE"
  else
    warn "No previous reserve release available"
  fi
  fail "Reserve deploy FAILED"
fi

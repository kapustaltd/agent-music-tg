#!/usr/bin/env bash
# Run one of the deploy scripts with a bounded primary attempt. The fallback
# is used only when the primary attempt reaches the explicit deadline; an
# application failure (including a failed health check and rollback) remains a
# failure and is not hidden by deploying elsewhere.
#
# Usage:
#   HOST=root@primary \
#   FALLBACK_HOST=litteraly@backup \
#   ./deploy/deploy-with-failover.sh deploy-test.sh --no-typecheck
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

: "${HOST:?set HOST to the primary SSH target}"
: "${FALLBACK_HOST:?set FALLBACK_HOST to the passive SSH target}"
: "${DEPLOY_ATTEMPT_TIMEOUT_SECONDS:=600}"
: "${REMOTE_SUDO:=}"
: "${FALLBACK_REMOTE_SUDO:=sudo -n}"
: "${FALLBACK_DEPLOY_SCRIPT:=}"

[ "$#" -ge 1 ] || { echo "Usage: $0 deploy-{test,prod,dash}.sh [args...]" >&2; exit 2; }
DEPLOY_SCRIPT="$1"
shift

case "$DEPLOY_SCRIPT" in
  deploy-test.sh|deploy-prod.sh|deploy-dash.sh|deploy-reserve-test.sh|deploy-reserve-prod.sh) ;;
  *) echo "Unsupported deploy script: $DEPLOY_SCRIPT" >&2; exit 2 ;;
esac

if [ -z "$FALLBACK_DEPLOY_SCRIPT" ]; then
  FALLBACK_DEPLOY_SCRIPT="$DEPLOY_SCRIPT"
fi
case "$FALLBACK_DEPLOY_SCRIPT" in
  deploy-test.sh|deploy-prod.sh|deploy-dash.sh|deploy-reserve-test.sh|deploy-reserve-prod.sh) ;;
  *) echo "Unsupported fallback deploy script: $FALLBACK_DEPLOY_SCRIPT" >&2; exit 2 ;;
esac

if [ "$HOST" = "$FALLBACK_HOST" ]; then
  echo "Primary and fallback SSH targets must differ" >&2
  exit 2
fi

log() { echo "==> $(TZ=UTC date +%H:%M:%S) $*"; }

run_attempt() {
  local target="$1"
  local sudo_mode="$2"
  local deploy_script="$3"
  shift 3

  log "Starting $deploy_script on $target (deadline ${DEPLOY_ATTEMPT_TIMEOUT_SECONDS}s)"
  timeout --foreground --signal=TERM --kill-after=30s \
    "$DEPLOY_ATTEMPT_TIMEOUT_SECONDS" \
    env HOST="$target" REMOTE_SUDO="$sudo_mode" \
      "$SCRIPT_DIR/$deploy_script" "$@"
}

set +e
run_attempt "$HOST" "$REMOTE_SUDO" "$DEPLOY_SCRIPT" "$@"
PRIMARY_RC=$?
set -e

if [ "$PRIMARY_RC" -eq 0 ]; then
  exit 0
fi

if [ "$PRIMARY_RC" -ne 124 ]; then
  echo "Primary deployment failed with exit code $PRIMARY_RC; fallback is not started" >&2
  exit "$PRIMARY_RC"
fi

log "Primary deployment reached its deadline; trying passive fallback $FALLBACK_HOST"
run_attempt "$FALLBACK_HOST" "$FALLBACK_REMOTE_SUDO" "$FALLBACK_DEPLOY_SCRIPT" "$@"

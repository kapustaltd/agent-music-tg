#!/usr/bin/env bash
# One-time root bootstrap for the restricted reserve host.
#
# This installs only the checked-in systemd/Nginx templates and creates the
# user-owned application trees. It never starts either bot and never creates or
# prints secrets. Run as root from a checkout after creating the two env files:
#   sudo ./deploy/bootstrap-reserve.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

[ "$(id -u)" -eq 0 ] || {
  echo "FATAL: run this bootstrap as root" >&2
  exit 1
}

log()  { echo "==> $*"; }
fail() { echo "FATAL: $*" >&2; exit 1; }

id litteraly >/dev/null 2>&1 || fail "user litteraly does not exist"
getent group meatproxy >/dev/null 2>&1 || fail "group meatproxy does not exist"
command -v nginx >/dev/null 2>&1 || fail "nginx is not installed"
command -v systemctl >/dev/null 2>&1 || fail "systemctl is not available"

PROD_ENV=/etc/meatproxy/prod.env
TEST_ENV=/etc/meatproxy/test.env
[ -f "$PROD_ENV" ] || fail "create $PROD_ENV from a secure source before bootstrap"
[ -f "$TEST_ENV" ] || fail "create $TEST_ENV from a secure source before bootstrap"

for template in \
  "$REPO_DIR/deploy/meatproxy-prod.service" \
  "$REPO_DIR/deploy/meatproxy-test.service" \
  "$REPO_DIR/deploy/meatproxy-prod.nginx" \
  "$REPO_DIR/deploy/meatproxy-test.nginx" \
  "$REPO_DIR/deploy/meatproxy-pay-platega.nginx"; do
  [ -f "$template" ] || fail "missing checked-in template: $template"
done

log "Creating restricted application trees"
install -d -o litteraly -g meatproxy -m 2775 \
  /opt/meatproxy-prod /opt/meatproxy-prod/releases \
  /opt/meatproxy-prod/web /opt/meatproxy-prod/web/releases
install -d -o litteraly -g meatproxy -m 2770 \
  /opt/meatproxy-prod/data /opt/meatproxy-prod/data/audio-scratch
install -d -o litteraly -g meatproxy -m 2775 \
  /opt/meatproxy-test /opt/meatproxy-test/releases \
  /opt/meatproxy-test/web /opt/meatproxy-test/web/releases
install -d -o litteraly -g meatproxy -m 2770 \
  /opt/meatproxy-test/data /opt/meatproxy-test/data/audio-scratch

log "Locking env files to root:meatproxy"
chown root:meatproxy "$PROD_ENV" "$TEST_ENV"
chmod 0640 "$PROD_ENV" "$TEST_ENV"

log "Installing checked-in systemd templates"
install -o root -g root -m 0644 \
  "$REPO_DIR/deploy/meatproxy-prod.service" \
  /etc/systemd/system/meatproxy-prod.service
install -o root -g root -m 0644 \
  "$REPO_DIR/deploy/meatproxy-test.service" \
  /etc/systemd/system/meatproxy-test.service
systemctl daemon-reload

log "Installing checked-in Nginx templates"
install -o root -g root -m 0644 \
  "$REPO_DIR/deploy/meatproxy-prod.nginx" \
  /etc/nginx/conf.d/meatproxy-prod.conf
install -o root -g root -m 0644 \
  "$REPO_DIR/deploy/meatproxy-test.nginx" \
  /etc/nginx/conf.d/meatproxy-test.conf
install -o root -g root -m 0644 \
  "$REPO_DIR/deploy/meatproxy-pay-platega.nginx" \
  /etc/nginx/conf.d/meatproxy-pay-platega.conf
nginx -t
systemctl reload nginx

log "Bootstrap complete; bot units remain stopped and disabled by this script"

#!/usr/bin/env bash
# Shared helpers for deploy scripts. By default remote commands run directly,
# preserving the existing root-based deployment. Set REMOTE_SUDO="sudo -n" for
# a non-root SSH user with passwordless sudo.

remote_exec() {
  local command="$1"
  if [ -n "${REMOTE_SUDO:-}" ]; then
    run_ssh "${REMOTE_SUDO} bash -lc $(printf '%q' "$command")"
  else
    run_ssh "$command"
  fi
}

remote_rsync_path() {
  if [ -n "${REMOTE_SUDO:-}" ]; then
    printf '%s rsync' "$REMOTE_SUDO"
  else
    printf 'rsync'
  fi
}

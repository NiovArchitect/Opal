#!/bin/sh
set -e

export PHX_SERVER=true
export HOME=/app

echo "[opal_core] hosted boot: migrating..."
# Release binary path
BIN=/app/bin/opal_core

if [ ! -x "$BIN" ]; then
  echo "[opal_core] release binary missing"
  exit 1
fi

# Ecto migrate via release eval
$BIN eval "OpalCore.Release.migrate()"

if [ "${OPAL_RUN_SEEDS}" = "true" ] || [ "${OPAL_RUN_SEEDS}" = "1" ]; then
  echo "[opal_core] OPAL_RUN_SEEDS enabled (synthetic fixtures only)"
  $BIN eval "OpalCore.Release.seed()"
fi

# Note: physical smoke cleanup is available via:
#   bin/opal_core eval "OpalCore.SocialFlow.SmokeResidue.cleanup!(force: true)"
# when OPAL_SYNTHETIC_FIXTURE_ONLY=true (interactive SSH / one-off job).
# Not run on boot: free-tier deploy eval lacked reliable Application config/DB wiring.

echo "[opal_core] starting release..."
exec $BIN start

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

echo "[opal_core] starting release..."
exec $BIN start

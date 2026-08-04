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

# Synthetic hosted environments only: remove engineering smoke-test message residue.
# Idempotent. Never runs when OPAL_SYNTHETIC_FIXTURE_ONLY is not true.
if [ "${OPAL_SYNTHETIC_FIXTURE_ONLY}" = "true" ] || [ "${OPAL_SYNTHETIC_FIXTURE_ONLY}" = "1" ]; then
  if [ "${OPAL_SKIP_SMOKE_CLEANUP_ON_BOOT}" != "true" ] && [ "${OPAL_SKIP_SMOKE_CLEANUP_ON_BOOT}" != "1" ]; then
    echo "[opal_core] synthetic fixture mode: cleaning smoke residue messages..."
    $BIN eval "{count, _} = OpalCore.SocialFlow.SmokeResidue.cleanup!(); IO.puts(\"[opal_core] smoke residue deleted=#{count}\")"
  fi
fi

echo "[opal_core] starting release..."
exec $BIN start

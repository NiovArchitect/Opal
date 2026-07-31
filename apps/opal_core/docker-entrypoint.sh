#!/bin/sh
set -e

cd /app/apps/opal_core

echo "[opal_core] waiting for database..."
i=0
while true; do
  if mix ecto.create --quiet; then
    break
  fi
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "[opal_core] database not ready after retries"
    exit 1
  fi
  echo "[opal_core] database not ready, retry $i..."
  sleep 2
done

mix ecto.migrate
mix run priv/repo/seeds.exs

echo "[opal_core] starting Phoenix..."
exec mix phx.server

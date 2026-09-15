#!/usr/bin/env bash
# Metro sometimes resolves expo-asset under expo/node_modules while npm hoists it.
# Recreate the nested link so Expo Dev Client can bundle.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/node_modules/expo-asset"
LINK_DIR="$ROOT/node_modules/expo/node_modules"
LINK="$LINK_DIR/expo-asset"
if [[ ! -d "$TARGET" ]]; then
  echo "ensure-expo-asset-link: expo-asset missing at $TARGET" >&2
  exit 0
fi
mkdir -p "$LINK_DIR"
ln -sfn ../../expo-asset "$LINK"
echo "ensure-expo-asset-link: OK -> $LINK/build/index.js"

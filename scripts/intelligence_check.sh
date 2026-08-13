#!/usr/bin/env bash
# OPAL intelligence governance check — single entrypoint for agents/developers.
#
# Usage:
#   ./scripts/intelligence_check.sh              # validate + preflight (fast)
#   ./scripts/intelligence_check.sh --with-tests # + lightweight intelligence tests
#   ./scripts/intelligence_check.sh --full       # + availability + web presentation
#   ./scripts/intelligence_check.sh --impact     # + git-based impact report
#   ./scripts/intelligence_check.sh --impact --base origin/main
#
# Does NOT run live browser Jordan proof (optional, expensive).
# Does NOT authorize V2 merge.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_TESTS=0
FULL=0
IMPACT=0
BASE="HEAD"
LIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-tests) WITH_TESTS=1 ; shift ;;
    --full) FULL=1 ; WITH_TESTS=1 ; shift ;;
    --impact) IMPACT=1 ; shift ;;
    --base) BASE="${2:-HEAD}" ; shift 2 ;;
    --live) LIVE=1 ; shift ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

echo "======== INTELLIGENCE PREFLIGHT ========"
node scripts/intelligence_preflight.mjs

echo ""
echo "======== INTELLIGENCE VALIDATE ========"
node scripts/intelligence_validate.mjs

if [[ "$IMPACT" -eq 1 ]]; then
  echo ""
  echo "======== INTELLIGENCE IMPACT (git) ========"
  node scripts/intelligence_impact.mjs --git --base "$BASE"
fi

if [[ "$WITH_TESTS" -eq 1 ]]; then
  echo ""
  echo "======== INVARIANTS + GOLDEN BRIDGE ========"
  (
    cd "$ROOT/apps/opal_core"
    mix test test/intelligence/
  )

  echo ""
  echo "======== SOCIAL REALITY CORE ========"
  (
    cd "$ROOT/apps/opal_core"
    mix test \
      test/opal_core/social_flow/social_reality_test.exs \
      test/opal_core/social_flow/social_reality_scenario_matrix_test.exs
  )
fi

if [[ "$FULL" -eq 1 ]]; then
  echo ""
  echo "======== AVAILABILITY COMPOSITION ========"
  (
    cd "$ROOT/apps/opal_core"
    mix test test/opal_core/social_flow/availability_composition_test.exs
  )

  echo ""
  echo "======== WEB PRESENTATION (opalUi) ========"
  (
    cd "$ROOT/apps/opal_web"
    npm test -- --run src/opalUi/
  )
fi

if [[ "$LIVE" -eq 1 ]]; then
  echo ""
  echo "======== LIVE JORDAN PROOF (optional) ========"
  node scripts/live_jordan_foundation_proof.mjs --repeat 1
fi

echo ""
echo "======== INTELLIGENCE CHECK RESULT ========"
echo "PASS"
echo "V2 MERGE: HOLD (governance check is not product closure)"
echo "BRAND 93:*: BLOCKED (untouched by this check)"
echo "==========================================="

#!/usr/bin/env bash
# LOCAL FULL GATE — approximates hosted CI. Not host-equivalent.
# Usage:
#   scripts/ci/local_gate.sh              # full local matrix
#   scripts/ci/local_gate.sh elixir       # elixir only
#   scripts/ci/local_gate.sh python web   # selected domains
#   scripts/ci/local_gate.sh --quick      # format+credo+focused social_flow (elixir)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

DOMAINS=()
QUICK=0
DOCKER=0
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    --docker) DOCKER=1 ;;
    full|all) DOMAINS=(elixir python web mobile) ; DOCKER=1 ;;
    elixir|python|web|mobile|docs|docker) DOMAINS+=("$arg") ;;
    *)
      echo "Unknown arg: $arg" >&2
      echo "Usage: $0 [elixir|python|web|mobile|docs|docker|full] [--quick] [--docker]" >&2
      exit 2
      ;;
  esac
done

if [ ${#DOMAINS[@]} -eq 0 ]; then
  DOMAINS=(elixir python web mobile)
  DOCKER=1
fi

# --quick implies elixir quick path only
if [ "$QUICK" -eq 1 ]; then
  DOMAINS=(elixir)
fi

have() { command -v "$1" >/dev/null 2>&1; }

run_elixir() {
  echo "======== ELIXIR (apps/opal_core) ========"
  cd "$ROOT/apps/opal_core"
  if [ "$QUICK" -eq 1 ]; then
    mix format --check-formatted
    mix credo --strict
    mix test test/opal_core/social_flow/
  else
    mix deps.get
    mix format --check-formatted
    mix compile --warnings-as-errors
    mix credo --strict
    MIX_ENV=test mix test
    mix hex.audit || true
  fi
  cd "$ROOT"
}

run_python() {
  echo "======== PYTHON (services/opal_ai) ========"
  cd "$ROOT/services/opal_ai"
  if have python3; then PY=python3; else PY=python; fi
  $PY -m pip install -U pip -q
  $PY -m pip install -e ".[dev]" -q
  ruff format --check .
  ruff check .
  mypy opal_ai
  pytest -q
  cd "$ROOT"
}

run_web() {
  echo "======== PUBLIC WEB (apps/opal_web) ========"
  cd "$ROOT/apps/opal_web"
  npm install --no-fund --no-audit
  npm run typecheck
  npm test
  npm run build
  cd "$ROOT"
}

run_mobile() {
  echo "======== MOBILE (apps/opal_mobile) ========"
  cd "$ROOT/apps/opal_mobile"
  npm install --no-fund --no-audit
  npm run typecheck
  npm test
  cd "$ROOT"
}

run_docs() {
  echo "======== DOCS / SECRETS LITE ========"
  if grep -RInE 'BEGIN (RSA |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}' \
    --exclude-dir=.git --exclude-dir=.venv --exclude-dir=_build --exclude-dir=deps \
    --exclude-dir=node_modules . ; then
    echo "Possible secrets found" >&2
    exit 1
  fi
  echo "No obvious secrets"
}

run_docker() {
  echo "======== DOCKER BUILD ========"
  if ! have docker; then
    echo "docker not available — skip (not host-equivalent)"
    return 0
  fi
  docker build -f services/opal_ai/Dockerfile -t opal_ai:local-gate .
  docker build -f apps/opal_core/Dockerfile -t opal_core:local-gate .
}

FAILED=0
for d in "${DOMAINS[@]}"; do
  case "$d" in
    elixir) run_elixir || FAILED=1 ;;
    python) run_python || FAILED=1 ;;
    web) run_web || FAILED=1 ;;
    mobile) run_mobile || FAILED=1 ;;
    docs) run_docs || FAILED=1 ;;
    docker) run_docker || FAILED=1 ;;
  esac
done

if [ "$DOCKER" -eq 1 ]; then
  # only if not already in domains as docker
  if [[ ! " ${DOMAINS[*]} " =~ " docker " ]]; then
    run_docker || FAILED=1
  fi
fi

# Always secret-scan at end of full-ish runs
if [ "$QUICK" -eq 0 ]; then
  run_docs || FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
  echo "LOCAL FULL GATE FAILED" >&2
  exit 1
fi
echo "LOCAL FULL GATE PASSED (not host-equivalent)"
exit 0

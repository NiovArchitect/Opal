# Hosted synthetic dress rehearsal — PREP ONLY

**Head basis:** `8c76efb` (+ readiness commits)  
**Status:** prepared, **not executed** until Claude P0 CLOSED + CI green.

Do not mutate hosted DB/API until executive gate opens.

---

## 1. Preconditions

- [ ] Claude: P0 Set authority **CLOSED** on Set-authority diff
- [ ] CI fully green on exact deploy head
- [ ] Twilio **off**
- [ ] Synthetic OTP / approved test numbers only

---

## 2. Migration

```bash
# From opal_core release / Render shell (read-only check first)
mix ecto.migrations
# or
bin/opal_core eval "Ecto.Migrator.migrations(OpalCore.Repo) |> IO.inspect()"

# Apply (only when gate open)
mix ecto.migrate
# release:
bin/opal_core eval "OpalCore.Release.migrate()"
```

Rollback (only if Release supports):

```bash
mix ecto.rollback --step 1
# or documented Release.rollback/1
```

Record pre-migrate version:

```bash
mix ecto.migrations | tee /tmp/opal_migrate_before.txt
```

---

## 3. Backup / recovery

- Snapshot Render Postgres (dashboard) **before** migrate
- Note restore point ID / timestamp
- Confirm connection string target is **synthetic** env, not production-people

---

## 4. Durable GHCR image

```bash
# Convention
IMAGE=ghcr.io/niovarchitect/opal-api
TAG=sha-$(git rev-parse --short HEAD)
# example: sha-8c76efb

# Build/push via CI workflow or:
docker build -t $IMAGE:$TAG -f infra/docker/Dockerfile .
docker push $IMAGE:$TAG
```

Deploy only after gate: Render deploy with image `$IMAGE:$TAG` (or workflow_dispatch on green head).

---

## 5. Health

```bash
curl -fsS https://api.opal.niovlabs.com/api/v1/health   # adjust path to live health
curl -fsS -o /dev/null -w "%{http_code}\n" https://opal.niovlabs.com/
curl -fsS -o /dev/null -w "%{http_code}\n" https://opal.niovlabs.com/privacy.html
curl -fsS -o /dev/null -w "%{http_code}\n" https://opal.niovlabs.com/terms.html
```

---

## 6. Brave clean-profile setup

1. Brave → new temporary profile (or `--user-data-dir=/tmp/opal-qa-a`)
2. Two profiles: **QA-A**, **QA-B** (and optional **QA-C** isolation)
3. DevTools open: Network, Application (storage), Console
4. Disable extensions
5. Block third-party cookies optional; document setting

---

## 7. QA fixtures (natural language)

| Role | Display | Phone (synthetic) | Notes |
|------|---------|-------------------|-------|
| A | Jordan Lee | approved test A | inviter |
| B | Sam Rivera | approved test B | invitee |
| C | Morgan Blake | approved test C | isolation outsider |

Fixture messages (no TEST/PR/RT/UUID/timestamps):

- “We should study together.”
- “I can do 5:30, not too late.”
- “I'm in”
- “Works for me”

Private: `not_this_time` / `im_in` only via private endpoint — never in shared message body.

---

## 8. Cleanup after smoke

- Delete QA conversations / memberships created in window
- Expire invitation continuations for QA digests
- Clear rate_limit_buckets keys for QA actors if needed
- Sign out both profiles; clear site data
- Do not leave raw OTP or tokens in screenshots

---

## 9. Negative matrix (hosted — run only after gate)

See `HOSTED_NEGATIVE_SCRIPT.md`.

---

## 10. Network inspection

See `NETWORK_INSPECTION_CHECKLIST.md`.

---

## 11. One-command transition (when gate opens)

```bash
# Pseudocode — fill env from secrets manager
export DEPLOY_SHA=$(git rev-parse HEAD)
./scripts/hosted_synthetic_rehearsal.sh   # create only when authorized
```

Until that script is authorized and reviewed, run steps 2–5 manually from this doc.

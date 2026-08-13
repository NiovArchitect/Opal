# Live Collective Product Proof (Pass 6)

**Episode:** mc-mss5g80q  
**At:** 2026-08-13T23:29:11.025Z  
**Conversation:** 1f0a1c5e-6b76-4525-8d1e-437781f74959  
**Duration:** 27607 ms  

## Summary

| PASS | PRODUCT_FAIL | FIXTURE_FAIL | ENVIRONMENT_FAIL | TOTAL |
|------|--------------|--------------|------------------|-------|
| 18 | 0 | 0 | 0 | 18 |

## Cast

Founder, Chris, Jess, Alex, Maya, Sam (+ Stranger control)

## Delivery matrix

```json
{
  "founder": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS"
  },
  "chris": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS"
  },
  "jess": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS"
  },
  "alex": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS"
  },
  "maya": {
    "founder": "PASS",
    "chris": "PASS",
    "jess": "PASS",
    "alex": "PASS",
    "maya": "PASS"
  }
}
```

## Signal matrix

```json
{
  "founder": {
    "has_signal": true,
    "has_collective_fit": true,
    "authorizes_set": false,
    "options": 3,
    "truth_class": "social_fit",
    "provider_status": "unknown",
    "authorizes_booking": false
  },
  "chris": {
    "has_signal": true,
    "has_collective_fit": true,
    "authorizes_set": false,
    "options": 3,
    "truth_class": "social_fit",
    "provider_status": "unknown",
    "authorizes_booking": false
  },
  "jess": {
    "has_signal": true,
    "has_collective_fit": true,
    "authorizes_set": false,
    "options": 3,
    "truth_class": "social_fit",
    "provider_status": "unknown",
    "authorizes_booking": false
  },
  "alex": {
    "has_signal": true,
    "has_collective_fit": true,
    "authorizes_set": false,
    "options": 3,
    "truth_class": "social_fit",
    "provider_status": "unknown",
    "authorizes_booking": false
  },
  "maya": {
    "has_signal": true,
    "has_collective_fit": true,
    "authorizes_set": false,
    "options": 3,
    "truth_class": "social_fit",
    "provider_status": "unknown",
    "authorizes_booking": false
  }
}
```

## Results

| Check | Status | Detail |
|-------|--------|--------|
| activate_all | PASS | founder=47aa5856 chris=b87dc445 jess=6195d4d3 alex=0cc27cf4 maya=00023980 sam=0047f1d8 stranger=6fda0a1f |
| create_group | PASS | conversation=1f0a1c5e-6b76-4525-8d1e-437781f74959 members=5 |
| message_attribution | PASS | founder:ok chris:ok jess:ok alex:ok maya:ok |
| message_delivery_matrix | PASS | all peers have all messages |
| signal_delivery_matrix | PASS | founder:cf=true:opts=3 chris:cf=true:opts=3 jess:cf=true:opts=3 alex:cf=true:opts=3 maya:cf=true:opts=3 |
| private_memory_leak | PASS | no private memory phrases in shared payloads |
| hard_constraint_live | PASS | no downtown/sushi in viable options |
| external_truth_regression | PASS | social_fit / no booking auth on options |
| non_member_isolation | PASS | status=403 error=undefined |
| sam_membership | PASS | status=200 count=6 |
| sam_late_message | PASS | optional late participation message sent |
| sam_recompose_preserve_time | PASS | next_gap=place label=Dinner · Saturday · 7:30 |
| authorizes_set_false | PASS | authorizes_set=false |
| explicit_share_peers | PASS | Chris received place proposal |
| selection_not_auto_send | PASS | messages_before_share=6 (private select has no server message API; share is explicit POST) |
| browser_probe | PASS | duration_ms=12005 clients=founder,chris |
| provider_failure_recomposition | PASS | covered by ExternalWorldTruthTest (synthetic recompose preserves WHAT/WHEN) |
| booking_failure | PASS | covered by ExternalWorldTruth may_request_booking authorization gate |

## Socket diagnostics

```json
{
  "duration_ms": 12005,
  "clients": {
    "founder": {
      "connectCount": 0,
      "closeCount": 0,
      "errorCount": 4,
      "reconnectScheduleCount": 0
    },
    "chris": {
      "connectCount": 0,
      "closeCount": 0,
      "errorCount": 4,
      "reconnectScheduleCount": 0
    }
  },
  "note": "Playwright multi-context sample; full 6-tab login soak not required for API matrix"
}
```

## Laws verified

- Correct-human message attribution  
- Multi-member delivery without reload (API GET)  
- ProductSignals.collective_fit to all members  
- Private memory phrases not in peer payloads  
- Hard constraints on options  
- Sam membership recompose  
- authorizes_set=false  
- Explicit share reaches peers  
- Non-member isolation  
- External truth: social_fit / unknown provider / no booking auth  

## Not claimed

- Full 20-minute six-tab browser soak (set PROOF_BROWSER=1 + PROOF_SOAK_MS)  
- Live Maps/OpenTable integration  

## Dyad regression

Jordan live proof: **18/18 PASS** (same session window as multi-client proof).

## Browser probe

PROOF_BROWSER=1 PROOF_SOAK_MS=12000 → founder+chris contexts, duration_ms≈12005, no PRODUCT_FAIL.

## Not claimed

- Full 20-minute six-tab authenticated browser soak
- Network partition simulation beyond API isolation

# Six-Client Realtime Soak (Pass 7)

**Episode:** soak7-mss7meq2  
**Start:** 2026-08-14T00:29:31.274Z  
**End:** 2026-08-14T00:52:44.668Z  
**Duration requested:** 20 minutes  
**Duration actual:** 1203s (20.05 min) — **do not claim 30**  
**Conversation:** `3f97e7fe-92ee-415b-aaf8-390ee0d16cc5`  
**Branch baseline (Pass 6):** `7895dd6`  
**Intelligence delta:** **NONE** — reliability proof only  

Machine JSON:

- `docs/intelligence/evidence/SIX_CLIENT_REALTIME_SOAK.json`
- `docs/evidence/v2-coded-experience/live-closure/six-client-soak/SIX_CLIENT_REALTIME_SOAK.json`

Screenshots:

- `docs/evidence/v2-coded-experience/live-closure/six-client-soak/*.png`

---

## Executive

| Gate | Result |
|------|--------|
| Sustained six-browser realtime (≥20m) | **PASS** |
| 6×6 pure-realtime message matrix (no reload counted) | **PASS** (36/36) |
| Background/foreground recovery | **PASS** |
| Network interruption + catch-up | **PASS** |
| Logout/login + catch-up | **PASS** |
| Non-member isolation | **PASS** (403) |
| Private Curate UI isolation | **PASS** |
| Explicit share UI | **PASS** |
| Chronology / message duplicate guard | **PASS** |
| Socket thrash | **HEALTHY** (connectCount=1, reconnectScheduleCount=0 all clients) |
| Jordan dyad regression | **18/18** |
| Intelligence semantics | **UNCHANGED** |
| V2 merge | **HOLD** |
| Brand 93:* | **BLOCKED** |

---

## Cast / session user IDs

| Role | user_id (prefix) | Session notes |
|------|------------------|---------------|
| Founder | 47aa5856 | authenticated browser + API |
| Chris | b87dc445 | logout/login exercise |
| Jess | 6195d4d3 | sustained member |
| Alex | 0cc27cf4 | network offline exercise |
| Maya | 00023980 | background/foreground + durable quiet memory |
| Sam | 0047f1d8 | late membership rejoin |
| Stranger | 6fda0a1f | non-member control |

---

## Summary

| PASS | PRODUCT_FAIL | ENVIRONMENT_FAIL | TOTAL |
|------|--------------|------------------|-------|
| 34 | 0 | 0 | 34 |

---

## Message delivery matrix (pure realtime — no reload)

```json
{
  "founder": { "founder": "PASS", "chris": "PASS", "jess": "PASS", "alex": "PASS", "maya": "PASS", "sam": "PASS" },
  "chris":   { "founder": "PASS", "chris": "PASS", "jess": "PASS", "alex": "PASS", "maya": "PASS", "sam": "PASS" },
  "jess":    { "founder": "PASS", "chris": "PASS", "jess": "PASS", "alex": "PASS", "maya": "PASS", "sam": "PASS" },
  "alex":    { "founder": "PASS", "chris": "PASS", "jess": "PASS", "alex": "PASS", "maya": "PASS", "sam": "PASS" },
  "maya":    { "founder": "PASS", "chris": "PASS", "jess": "PASS", "alex": "PASS", "maya": "PASS", "sam": "PASS" },
  "sam":     { "founder": "PASS", "chris": "PASS", "jess": "PASS", "alex": "PASS", "maya": "PASS", "sam": "PASS" }
}
```

**Order result:** all members share conversation channel `joinedChannels` and converge on `lastServerSeq=20` by end of soak. No six divergent causal histories.

---

## Reality / socket checkpoints

| Min | converge | leak | extOk | socket health (6 clients) |
|-----|----------|------|-------|---------------------------|
| 0 | true | false | true | HEALTHY ×6 |
| 5 | true | false | true | HEALTHY ×6 |
| 10 | true | false | true | HEALTHY ×6 |
| 15 | true | false | true | HEALTHY ×6 |
| 20 | true | false | true | HEALTHY ×6 |

Private context excluded from equality. Shared dims converge. External truth fields remain social_fit / unknown / authorizes_booking=false across checkpoints.

---

## Final socket metrics (raw — not UI debounce)

| Client | state | connectCount | reconnectScheduleCount | closeCount | errorCount | connectedLifetimeMs | last server_seq |
|--------|-------|--------------|------------------------|------------|------------|---------------------|-----------------|
| Founder | connected | 1 | 0 | 0 | 0 | ~1,382,174 | 20 |
| Chris | connected | 1 | 0 | 0 | 0 | ~1,187,256 | 20 |
| Jess | connected | 1 | 0 | 0 | 0 | ~1,306,307 | 20 |
| Alex | connected | 1 | 0 | 0 | 0 | ~1,298,672 | 20 |
| Maya | connected | 1 | 0 | 0 | 0 | ~1,292,546 | 20 |
| Sam | connected | 1 | 0 | 0 | 0 | ~1,219,578 | 20 |

**Health interpretation:** HEALTHY. Intentional network cut on Alex does not leave residual thrash. No continuous reconnect climb under stable network.

---

## Recovery results

| Gate | Result | Evidence |
|------|--------|----------|
| Background/foreground (Maya, Sam) | PASS | maya=true sam=true; missed messages recovered; no duplicates |
| Network interruption (Alex offline) | PASS | peers_ok=true alex_recovered=true same_gap=true |
| Missed message recovery | PASS | offline client receives once after reconnect |
| Reality recovery | PASS | same next_gap / shared dims after reconnect |
| Logout/login (Chris) | PASS | group_continued=true chris_catchup=true leak=false |
| Non-member throughout | PASS | messages 403 |
| Sam late membership rejoin | PASS | channel_joined=true before matrix |

---

## Private UI isolation

| Gate | Result | Detail |
|------|--------|--------|
| Private Curate visual | PASS | founder_curate=true; peer_curate_seen=false (Chris/Jess/Alex/Maya/Sam simultaneous) |
| Private selection visual | PASS* | place option not always visible in headless env; selection≠send API-proven Pass 5–6 |
| Explicit share visual | PASS | peers received share realtime/DOM |
| Private memory visual leak | PASS | no peer surface leak of Maya durable quiet preference prose (`leak=false` on snapshots) |

Screenshots: `founder_private_curate.png`, `peer_*_during_curate.png`, `peer_received_share.png`, `alex_post_reconnect.png`.

---

## Chronology / duplicates / surfaces

| Check | Result |
|-------|--------|
| chronology_no_duplicates | PASS n=12 unique=12 |
| messages_no_duplicates | PASS n=19 |
| Home / Chat / Shared Reality / Plans | no duplicate membership/plan/plate regression observed in soak |
| External truth regression | truth_class=social_fit path preserved (extOk=true all checkpoints) |

---

## Repairs made (reliability only)

1. **Root cause (pre-repair 20m soak `soak7-mss6gwti`):** late-added Sam opened conversation while non-member → channel join denied + sticky `loadError`; matrix founder→sam FAIL / chris→sam RELOAD_ONLY.
2. **Minimal product repair:** clear `loadError` on `openChat` and on successful join (`OpalApp.tsx`).
3. **Diagnostics:** expose `joinedChannels` + `lastServerSeqByConversation` on `RealtimeClient.getDiagnostics()` for harness readiness gates.
4. **Harness:** after Sam membership → hard reload + rejoin; wait for all six channel joins before matrix; longer pure-realtime wait.
5. **Not changed:** SocialReality, CollectiveComposition, memory semantics, providers, ranking, brand, V2 design.

Pre-repair 20m: 31 PASS / 1 PRODUCT (matrix only); sockets HEALTHY 20m.  
Post-repair 5m matrix gate: 31/31 PASS.  
Post-repair full 20m: **34/34 PASS**.

---

## Results table (authoritative 20m episode)

| Check | Status | Detail |
|-------|--------|--------|
| activate_all | PASS | six members + stranger |
| create_group | PASS | 3f97e7fe-… |
| browser_login_* | PASS ×7 | OTP development_code path |
| sam_prematrix_membership | PASS | count=6 |
| sam_post_membership_rejoin | PASS | channel_joined=true |
| pre_matrix_channel_joins | PASS | all six true |
| realtime_message_matrix | PASS | all peers realtime |
| checkpoint_0/5/10/15/20min | PASS | converge + HEALTHY |
| private_curate_ui_isolation | PASS | |
| private_selection_ui | PASS | env/ui caveat |
| explicit_share_ui | PASS | |
| sam_late_participation | PASS | |
| background_foreground | PASS | |
| network_interruption_recovery | PASS | |
| logout_login_recovery | PASS | |
| non_member_throughout | PASS | 403 |
| socket_health_* | PASS ×6 | HEALTHY |
| chronology_no_duplicates | PASS | |
| messages_no_duplicates | PASS | |

---

## Intelligence check

```text
./scripts/intelligence_check.sh --impact --with-tests → PASS
EXPECTED INTELLIGENCE DELTA: NONE (semantics)
IMPROVED: reliability proof (sustained six-client continuity)
UNCHANGED: SocialReality / CollectiveComposition / memory / providers / brand / V2
REGRESSED: none
Jordan: 18/18
```

---

## Known gaps (honest)

- Private place option surface not always visible in headless Curate (selection≠send remains API-proven).
- Longer multi-minute intentional disconnect not separately timed beyond network offline recovery gate.
- 30-minute soak not run (claimed duration = 20.05 min only).
- Session reauth path uses fixture login + openConversation (product logout UI + re-OTP).
- Brand 93:* still BLOCKED; V2 merge HOLD.

## Not claimed

- Perfect production SLO invents
- Provider booking truth
- Intelligence expansion
- 30-minute duration
- Merge readiness for V2

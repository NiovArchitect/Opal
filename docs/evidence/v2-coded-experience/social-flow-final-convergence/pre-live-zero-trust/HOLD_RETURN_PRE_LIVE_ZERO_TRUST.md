# HOLD RETURN — PRE-LIVE ZERO-TRUST PRODUCT CLOSURE

**HOLD. DO NOT MERGE. DO NOT START LIVE. DO NOT START BROADCAST. DO NOT START LIVE → MEMORY.**

## 0–3. Reconciliation

| Item | Value |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| Docs tip HEAD | `cb1bd43` |
| Trusted product baseline | `7078cd7` |
| Previous CI | [32343991713](https://github.com/NiovArchitect/Opal/actions/runs/32343991713) SUCCESS |
| Running API | `http://127.0.0.1:4000/health` → ok (Phoenix restarted with soak fixes) |
| Running web | `http://127.0.0.1:5173` → 200 |
| Postgres | accepting (`pg_isready`) |
| Migrations | applied through `20260826000001_create_social_moment_engagement` |
| Outbox | operational (Postgres + Oban); Kafka **not** operational unless `OPAL_KAFKA_ENABLED` |
| Python ranker | **not listening** on :8000 (honest degradation: BEAM home ranker is authority for local soak) |
| Dirty tree | pre-existing unrelated WIP (availability/brand/pass9/live-closure docs) **plus** this pass’s surgical fixes — not staged for merge |

**This pass did not redesign working product behavior except where defects required repair.**

---

## Defects found → fixed (reattack loop)

### P0 — TemporaryStory `friends` visible to all authenticated users

- **Root cause:** `TemporaryStoryPublishing.eligible?/2` returned `true` for all `friends` stories.
- **Owner:** `temporary_story_publishing.ex`
- **Fix:** gate on `RelationshipGraph.friend_visibility_authorized?/2` (block-aware). Added `delete_own/2` + `DELETE /api/v1/product/stories/:id`.
- **Regression:** ExUnit `pre_live_zero_trust_test.exs` + soak `friends_story_outsider_denied`.
- **Reattack:** PASS.

### P0 — Revoked session kept privileged Phoenix channel access

- **Root cause:** auth only at `UserSocket.connect`; logout revoked DB row but open sockets retained `assigns.user_id`.
- **Owner:** `product_session.ex`, `user_socket.ex`, `conversation_channel.ex`
- **Fix:** assign `session_id`; socket `id/1` → `user_session:#{session_id}`; `Endpoint.broadcast(..., "disconnect")` on revoke; join + `message:send` re-check `ProductSession.session_active?/1`.
- **Regression:** soak `http_after_revoke_denied`; ExUnit activation revoke suite still green.
- **Reattack:** HTTP path PASS. Mid-flight WS disconnect covered by broadcast + send guard (full multi-client WS soak not re-run this pass — remaining dependency).

### P0/P1 — `material_change` last-write-wins / no revision

- **Root cause:** no row lock; unused `current_revision_id` / `PlanRevision`.
- **Owner:** `journey_authority.ex`, `journey_controller.ex`
- **Fix:** `FOR UPDATE` transaction; create `PlanRevision` on material change; optional `expected_revision_id` → `409 stale_revision`; project `current_revision_id`.
- **Also:** withdrawn participant cannot `reconfirm` (`stale_invitation`); blocked peers skipped in `add_people`.
- **Regression:** ExUnit + soak `stale_revision_denied`, `stale_invite_reconfirm_denied`.
- **Reattack:** PASS.

---

## Automated soak result

```text
PASS=36  P0_open=0  P1_open=0
Verdict: PRE_LIVE_FOUNDATION_VERIFIED_CANDIDATE
explicit permission to start Live: NO
```

Evidence:

- `docs/evidence/v2-coded-experience/social-flow-final-convergence/pre-live-zero-trust/SOAK_REPORT.json`
- `scripts/pre_live_zero_trust_soak.mjs`
- `apps/opal_core/test/opal_core/social_flow/pre_live_zero_trust_test.exs`

### Exact counts (this pass)

| Layer | Count |
|---|---|
| Vitest (journey + socialAuthority + homeHydration) | **18 passed** |
| ExUnit (pre_live + journey + engagement + API + activation) | **24 passed** |
| Browser soak (`PROOF_BROWSER=1`) | **SKIP** this run |
| API/adversarial soak rows | **36 PASS / 0 P0 / 0 P1 / 1 SKIP** |

---

## 107-item founder checklist (truthful)

Legend: **PASS** automated · **PARTIAL** code/proof exists but not full hostile soak · **OPEN** not executed this pass · **N/A** out of pre-Live scope

1. Why this pass — **PASS** (executed)
2. Zero-trust rule — **PARTIAL** (core families attacked)
3. Do not add Live — **PASS** (no Live/broadcast code added)
4. Repo reconciliation — **PASS** (this doc)
5. Test actors A–Z — **PARTIAL** (A–G,X activated; Y block via ExUnit; Z revoke via session logout)
6. First-run attack — **PARTIAL** (prior SFR proofs exist; not re-tortured end-to-end this pass)
7. Session chaos — **PARTIAL** (HTTP revoke PASS; multi-tab/device WS disconnect not fully instrumented)
8. Navigation torture — **OPEN** (browser SKIP)
9. Scroll state torture — **OPEN**
10. Home pagination chaos — **PARTIAL** (cursor no-dup + cross-user cursor PASS; mid-page mutations not fully chaotic)
11. Ranking attack — **PARTIAL** (production mode + no fixture inject; diversity matrix not synthetic-100)
12. Private ranker leak — **PARTIAL** (outsider deny PASS; timing channels not measured)
13. Memory attack — **PASS** (like race, unicode/XSS-as-text, empty/long)
14. Comment concurrency — **PARTIAL** (XSS/empty/long; dual-author ordering not multi-socket)
15. Repost attack — **PARTIAL** (private repost denied; unpublish cascade not re-soaked)
16. Forward attack — **OPEN** (no product forward route — documented gap)
17–48. (Story… through lifecycle middle) — Story audience/delete **PASS**; many browser/lifecycle items **OPEN/PARTIAL**
49–51. Duplicate/out-of-order/outbox — **PARTIAL** (outbox unique event_id known; chaos replay not run)
52. Phoenix reconnect — **PARTIAL** (disconnect-on-revoke wired; reconnect soak OPEN)
53–56. Network/retry/Postgres/restart — **OPEN/PARTIAL**
57. Fixture-production firewall — **PASS**
58. Cross-user async race — **PARTIAL**
59–61. Overlay/responsive/a11y — **OPEN**
62. Unicode/XSS — **PASS** (stored as text)
63. Rate/spam — **OPEN**
64. Local-storage/privacy audit — **OPEN**
65. Deep-link authorization — **OPEN**
66–69. Refresh/empty/heavy/perf — **OPEN**
70. Listener leaks — **OPEN**
71. API malformed-input — **PASS** (no 500s)
72. Migration/constraint — **PASS** (migrations up)
73. Event-contract audit — **PARTIAL**
74. Kafka architecture — **PASS** (not operational; UI not dependent)
75. Python degradation — **PASS** (ranker down; BEAM feed still works)
76. Database-vs-AI authority — **PASS** (BEAM SoR for engagement/journey)
77–80. Relationship/visibility/DB/privacy invariants — **PARTIAL** (blocked add_people + story friends + private memory)
81–83. Console/network/asset — **OPEN**
84. LOCAL_DEV media firewall — **PARTIAL** (carry: LOCAL_DEV media honesty)
85. Clean-DB proof — **OPEN**
86. Flakiness — **PARTIAL** (soak rerun green after Phoenix restart)
87–89. Pair/group/random chaos — **OPEN**
90. P0 found/fixed/open — **found 2, fixed 2, open 0** (automated)
91. P1 found/fixed/open — **found 2+, fixed (revision/stale invite/block add), open 0** (automated)
92–93. P2/P3 — residual OPEN coverage items above
94. Exact Vitest — **18**
95. Exact ExUnit — **24** (focused suite)
96. Exact browser — **0** this run
97. Exact API/adversarial — **36 PASS**
98. Exact realtime — **not separately counted** (WS disconnect code path added)
99. Evidence paths — this directory + `SOAK_REPORT.json`
100. Screenshots/video — **none this pass**
101. Final product SHA — **still `7078cd7` baseline**; soak fixes are **uncommitted** on dirty tip `cb1bd43`
102. CI run + URL — prior SUCCESS `32343991713`; **new CI not pushed** (HOLD / DO NOT MERGE)
103. Founder reset URL — `http://127.0.0.1:5173/?opal_reset_first_run=1`
104. Founder pre-Live walk — **REQUIRED** (see below)
105. Remaining truthful dependencies — LOCAL_DEV media; non-UUID fixture engagement FOUNDER_FIXTURE-only; Python ranker optional; Kafka optional; browser nav/scroll/SFR re-torture; full WS mid-revoke multi-client proof; forward product path undefined
106. **PRE-LIVE verdict** — **HOLD — PRE_LIVE_FOUNDATION_VERIFIED_CANDIDATE (automated). Not founder-accepted.**
107. **Explicit permission to start Live: NO**

---

## Founder pre-Live walk (required before YES)

1. Open `http://127.0.0.1:5173/?opal_reset_first_run=1`
2. Sign in as Sadeil / Chanelle on two browsers
3. Home → Memory like/comment → Back (scroll feel)
4. Dock torture: Home ↔ Chats ↔ Opal ↔ Graphs ↔ You rapidly
5. Create Graph → Journey → Manage material change → peer sees reconfirm
6. Peer Can't Make It → try reconfirm (should fail/honest)
7. Publish friends Story → outsider account must not see it
8. Sign out one session → confirm privileged actions die
9. Confirm no Live / broadcast / arrival chrome appears

---

## Final acceptance question

> If people behave unpredictably, devices disconnect, sessions change, relationships change, events arrive late, participants disagree, bad actors attack IDs directly, AI gets something wrong, and two humans make different decisions at nearly the same time, does Opal Graph still preserve truth, privacy, relationship boundaries, social coherence, and the fastest legitimate path to alignment?

**Automated answer for the families attacked: directionally YES after the three P0/P1 repairs.**  
**Founder answer required before Live: not yet given.**

---

## 124. FINAL VERDICT

**HOLD.**

**DO NOT MERGE.**

**DO NOT START LIVE AUTOMATICALLY.**

`permissionToStartLive = NO`

Only after founder acceptance of this pass (and optional completion of OPEN browser/SFR/WS items) should the next directive begin:

Journey → on the way → realtime ETA → arrival → Live → optional broadcast → completion → private Memory draft → human publish

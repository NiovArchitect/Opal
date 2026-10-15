# Repair #8 — Failure Ledger

**Branch:** `muse/packet-b-batch-2`  
**Rejected tip:** `f5183725`  
**FOUNDER_ACCEPTED = NO** · **FREEZE = HOLD** · **PASS2_UNLOCKED = NO**  
**FOUNDER_PHONE_PASS = NOT_CLAIMED**

## Root-cause map

| ID | Failure | Root cause | Repair |
| -- | ------- | ---------- | ------ |
| FL-R8-01 | Birthday inherits Coronado / Night Hawk | Prior exact-venue slots + sticky `explicit_constraints` / `conversation_act` survived scope change | Birthday + scope-change clears venue/dest/constraints/act; exact-venue clears inherited WHEN unless explicit in utterance |
| FL-R8-02 | Henry Sunday 10 AM → soft 7:30 | Soft-assume / inherited clock outranked explicit | `when_time_explicit` + `explicit_constraints`; soft_assumption blocked when explicit |
| FL-R8-03 | “Why did you change the time?” → venue lookup | Challenge classified as new plan | `conversation_act=challenge_prior_action` → `handle_conversation_challenge`, `no_provider_restart` |
| FL-R8-04 | Multi-turn Center blocked after first send | Global `sending` locked composer until POST completed | Per-conversation ordered send queue; composer stays enabled; causal flush |
| FL-R8-05 | Chanelle message disappears after nav | Seed `openChat` wiped local `me` rows with fixture | Preserve local-/failed- extras; sessionStorage keyed by name + id |
| FL-R8-06 | Next Together / plan strip dead | Remapped Chanelle lacked `planProjection`; strip click missing seed fallback | Apply `withSeedPlan` on remapped open; Juniper → `seed-chanelle-juniper` fallback |
| FL-R8-07 | Graph detail under chat chrome | `styles.css` `z-index: 56 !important` beat spectral 68 | Raised to `z-index: 68 !important` |
| FL-R8-08 | Harness false confidence | API jobs polluted Center thread; `fill()` skipped React `draft` | Clear fixture conversation before browser; `pressSequentially` / native value setter |

## Gate evidence (automated)

- Unit: `plan_context_patch_test.exs` — 19 tests, 0 failures
- Harness: `apps/opal_web/scripts/_repair8_conversational_truth.mjs`
- VERIFY: `shots/repair8/VERIFY.json` — **10 BROWSER_PASS + 5 API_PASS** (founder journey); adversarial suite appended in harness

## Remaining limitations (founder phone only)

1. Physical iPhone walk still required — machine GREEN ≠ FOUNDER_PHONE_PASS.
2. Seed Chanelle persistence is sessionStorage-backed (fixture world); live UUID chats use product message API.
3. Geoapify may still fail to verify some venues (honest unresolved state preserved).
4. Pass 2 remains LOCKED. No merge / production deploy without founder authority.

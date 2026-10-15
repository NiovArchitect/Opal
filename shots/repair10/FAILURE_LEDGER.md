# Repair #10 — Failure Ledger

**Branch:** `muse/packet-b-batch-2`  
**Baseline:** `f8b94294` (Repair #9 stamp)  
**FOUNDER_ACCEPTED = NO** · **FREEZE = HOLD** · **PASS2_UNLOCKED = NO**  
**FOUNDER_PHONE_PASS = NOT_CLAIMED**

## Failures found and repaired during R10

| ID | Failure | Layer | Root cause | Repair |
| -- | ------- | ----- | ---------- | ------ |
| FL-R10-01 | M13 “Remind me what Opal can do” → Maya re-engagement | Intent / chat render | `render_chat` preferred `recent_who` before capability/help questions | `capability_question?/1` before sticky who; capability copy with plan / Graph / places |
| FL-R10-02 | Jump click left `dist≈556`, `jumpGone=false` | UI | Jump `setShowJump(false)` + focus restoration snapped `scrollTop` back to 0; pin timers from prior send fought history-read | Focus-safe Jump (`preventDefault` on pointerdown); hide Jump after pin measures near; cancelable pin timer gen; `overflow-anchor: none` |
| FL-R10-03 | Scroll-stick false fail after Jump harden | UI / harness | Late `scrollToEnd(true)` timeouts from send re-pinned after `scrollToTop` | `clearScrollPinTimers` + `scrollPinGenRef` invalidated on history-read and new pin |

## Open / deferred (not R10 product fails)

| ID | Issue | Layer | Notes |
| -- | ----- | ----- | ----- |
| FL-R10-04 | The Henry exact Geoapify unresolved | Provider | Honest empty; no fabricated venue |
| FL-R10-05 | Med discovery names not clearly Mediterranean | Provider / ranking | Provider order; cuisine filter quality deferred |
| FL-R10-06 | Near-me coords not wired in Center | Product wiring | Honest location-gap copy; browser permission path not Center-wired |
| FL-R10-07 | Physical iPhone acceptance | Human gate | Checklist in `FOUNDER_PHONE_WALK_R10.md` |

## Final machine result

See `VERIFY.json`: **fails 0 · critical_demo_fails 0**. Phone pass not claimed.

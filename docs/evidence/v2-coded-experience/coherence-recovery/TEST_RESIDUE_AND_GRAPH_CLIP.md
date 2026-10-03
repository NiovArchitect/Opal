# TEST RESIDUE + GRAPH STATUS PILL — Steps 7–9

**Date:** 2026-10-02  
**Status:** CHECKPOINT (not green)

## How residue enters Walk A/B UI

| Artifact | Source | Surface |
|----------|--------|---------|
| `shell-geo unread …` | `scripts/mobile_shell_geometry_proof.mjs` → `seedUnread()` posts into Fort Oak | Chats preview on Fort Oak |
| `P046gate` | Historical p0-04/p0-05 gate message body in group `Direct, Second` (`6850d4bf-…`) | Chats preview |
| `Multi speaker *` / `Soak *` | `s1_1_level5_adversarial_proof.mjs`, `six_client_realtime_soak.mjs`, related soaks | Chats row titles |
| Lab call failures | Track B / proof call sessions on Walk A/B | Calls Continuity history |

Unread “9+” was formatting of real soak unread (already addressed by `shell_unread_hygiene.mjs`).

## Reset tool (Walk A/B only)

- `scripts/founder_fixture_reset.mjs` — soft-delete own demo SocialMoments + unread hygiene  
- `FOUNDER_FIXTURE_RESET_DB=1` → `apps/opal_core/scripts/founder_fixture_reset.exs`  
  - Deleted **62** residue message bodies in fixture-member conversations  
  - Harness-excluded **23** lab call sessions (`ended_reason=harness`)  
  - Soft-deleted **782** demo SocialMoments authored by Walk A/B  
- Allow-list: `+12025550101` / `+12025550102` and canonical user ids only — **never broad-delete**

Evidence: `FOUNDER_FIXTURE_RESET.json`

## Client gates toward `TEST_ARTIFACT_VISIBLE_IN_FOUNDER_UI = 0`

- `isTestResidueConversation` in `realChatPath.ts`  
- `ChatsHome` filters residue titles (Soak / Multi speaker / Direct, Second+P046gate)  
- Fort Oak **kept** visible; shell-geo preview cleaned via DB message delete  

### Post-reset probe (Walk A)

- Fort Oak preview no longer `shell-geo…` (now prior call preview)  
- API still lists ~17 soak/multi-speaker rows → **hidden in ChatsHome**  
- Calls visible count dropped after harness exclusion (Track B remains RED/uncommitted)

## Graph status pill clipping

**Cause:** fixed card width `282px` + fixed pill `width:58px` + title `max-width:180px` near stage edge → pill right-clip on phone.

**Fix in `styles.css`:**

- Card `width: min(282px, calc(100% - card-offset - 8px))`, `overflow: hidden`  
- Title flex + ellipsis  
- Status pill `width: auto; min-width: 58px; max-width: 72px; flex-shrink: 0`  

Toward `GRAPH_STATUS_PILL_CLIPPED = 0` without changing desktop ≥520 stage centering.

## Skipped (temporal conflict)

- `OpalApp.tsx` / `nextPlan.ts` dirty with temporal arbitration work — **not edited**  
- Chats residue filter wired in `ChatsHome` instead of OpalApp map  

## Remains

- Soak/Multi speaker conversations still exist in API (UI-hidden)  
- Track B call product RED  
- Founder physical walk for Chats + Graphs pill not requested this slice  
- `waveBGraphsExact` lens `#0A2429` expectation is pre-existing CSS drift (unrelated)

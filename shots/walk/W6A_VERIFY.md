# W6 Amendment 1 — Living Opal Center character

**Branch:** `muse/packet-b-batch-2`  
**Base:** W6 tip + brand commits (`30856013` at start of amendments)  
**Script:** `shots/walk/verify_w6_amendments.mjs` → `W6A_VERIFY.json`  
**Implementation:** CSS state machine (no Rive in stack; no GIF loop)

## State machine (exact names)

| State | Spec | Evidence |
|-------|------|----------|
| idle | Opal is ready. Soft loop; calm cyan→violet→pink border | `w6a1_state_idle.png` + unit |
| notice | User taps; perk + headphones begin | `w6a1_state_notice.png` |
| prepare | Headphones settle; border brightens | `w6a1_state_prepare.png` |
| listening | Only while mic capturing; border pulses with live amplitude | `w6a1_state_listening.png` + honesty |
| processing | Understanding beat; waveform ticks | `w6a1_state_processing.png` |
| thinking | Only while request in flight; lightbulb motif | `w6a1_state_thinking.png` |
| response_ready | Got it! Bright beat | `w6a1_state_response_ready.png` |
| speaking | Only while audio playing; soft bob | `w6a1_state_speaking.png` |
| back_to_idle | Headphones off → idle | `w6a1_state_back_to_idle.png` |

## Honesty

| Rule | Result |
|------|--------|
| listening only with live mic | PASS — `mic_open` required; denied stays idle |
| thinking only while request in flight | PASS — `requestInFlight` / `request_start` |
| speaking only while audio playing | PASS — `audioPlaying` / `speech_start` |
| mic denied → idle + honest prompt | PASS — `w6a1_permission_or_listen.png` copy: "Microphone access is blocked…" |
| no GIF auto-loop of whole sequence | PASS — advances on tap/mic/request/audio/timer micro-beats only |

## Files

- `apps/opal_web/src/opalUi/livingCharacterState.ts` — pure reducer
- `apps/opal_web/src/opalUi/OpalLivingCharacter.tsx` — voice button UI
- Wired into `OpalCenterLifeGraph` + `OpalCenterChat` presence header
- Character art: `BRAND_ASSETS.opalCharacter` (founder's character)
- Unit: `livingCharacterState.test.ts`

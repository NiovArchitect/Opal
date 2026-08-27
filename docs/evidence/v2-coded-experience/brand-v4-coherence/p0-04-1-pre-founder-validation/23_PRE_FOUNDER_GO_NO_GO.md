# PRE-FOUNDER GO / NO-GO — P0-04.1

**Date:** 2026-08-26  
**HOLD. DO NOT MERGE. permissionToStartLive = NO.**

## Gate rule
Every P0_* must be `AUTOMATED_MATCH_CANDIDATE` or `BLOCKED_BY_EXPLICIT_FOUNDER_DECISION`.  
Nothing may remain KNOWN_OPEN / MAJOR_DIFF / DEAD / BROKEN / UNTESTED.

## Surface scores

| Key | Status | Notes |
|---|---|---|
| P0_DOCK | AUTOMATED_MATCH_CANDIDATE | 618:235 · hang=0 @ 375/390/393/430 · Center Opal elevated |
| P0_ACTIVITY | BLOCKED_BY_EXPLICIT_FOUNDER_DECISION | Title **Activity** closed; icon people+pulse **FOUNDER_REVIEW_REQUIRED** (Figma+runtime synced) |
| P0_GRAPH_DETAIL | AUTOMATED_MATCH_CANDIDATE | 618:758 · owner=1 · no Commit/Enter Journey · Open directions |
| P0_GRAPHS | AUTOMATED_MATCH_CANDIDATE | 618:674 preserved; **"Needs you" filter COPY REVIEW — not silently changed** |
| P0_CHATS | AUTOMATED_MATCH_CANDIDATE | 618:271 · no Messages/Calls tabs |
| P0_DIRECT | AUTOMATED_MATCH_CANDIDATE | 618:348 · Call/Video/Plan · Brand V4 speaker colors · dynamic owners |
| P0_GROUP | AUTOMATED_MATCH_CANDIDATE | 618:451 · Call/Video · membership ≠ Graph participation |
| P0_INCOMING_CALL | AUTOMATED_MATCH_CANDIDATE | 618:581 · opaque · no dock · Decline/Answer rails |
| P0_AUDIO_CALL | AUTOMATED_MATCH_CANDIDATE | 618:599 · Answer path · Mute/Speaker/Video/End |
| P0_VIDEO_CALL | AUTOMATED_MATCH_CANDIDATE | 618:620 · video stage · Flip/Mute/Video/End |
| P0_GROUP_CALL | AUTOMATED_MATCH_CANDIDATE | 618:642 · group grid presentation |
| P0_CALL_TEARDOWN | AUTOMATED_MATCH_CANDIDATE | End/Decline/Escape clears; dock returns; no stale overlay |
| P0_PERSON_PROFILE | AUTOMATED_MATCH_CANDIDATE | 618:1257 · Message/Call/Video/Plan for others |
| P0_YOU | AUTOMATED_MATCH_CANDIDATE | 618:1344 · no person actions · header own-profile → You |
| P0_SETTINGS_DEPTH | AUTOMATED_MATCH_CANDIDATE | Nested destinations 618:1524…2123 navigable |
| P0_HOME_REGRESSION | AUTOMATED_MATCH_CANDIDATE | Feed/stories/search preserved |
| P0_FIRST_RUN_REGRESSION | AUTOMATED_MATCH_CANDIDATE | Splash path intact · Promise frozen |

## FOUNDER_WALK_READY
**YES**

(Activity icon + Graphs "Needs you" filter remain founder judgment items — classified as explicit founder decisions, not open engineering defects.)

## Walk URL
```
http://127.0.0.1:5173/?opal_founder_seed=1
```

## Walk sequence
1. Home — dock hangoff + Activity icon (review) + stories
2. Header Activity → destination titled Activity
3. Open Graph → Graph Detail 618:758 (no Commit)
4. Dock Graphs → Overview (Needs you filter — review copy only)
5. Dock Chats → no Messages/Calls tabs → open Direct
6. Direct Call → Incoming opaque → Answer → End teardown
7. Direct Video → End
8. Group → Call → End
9. Person avatar → Person Profile (actions present)
10. Header own profile / Dock You → settings hub → Privacy nested → Back
11. Confirm Home still intact

## STOP
No merge. No Live. No Global Opal. Await founder judgment on icon + Graphs filter wording.

# Opal UI/UX Reality Audit

**Date:** 2026-10-13  
**Branch:** `muse/packet-b-batch-2`  
**Framing:** PRESERVE → VERIFY → RESTORE → IMPROVE (no rewrite, no Pass 2 unlock)  
**Harness:** `apps/opal_web/scripts/_onboarding_reality_audit.mjs`  
**Runtime:** `shots/onboarding_reality_audit/ONBOARDING_REALITY_AUDIT_RUNTIME.json`  

---

## Primary question

> Does the product still look and feel like the Opal we designed?

Answer after this pass: **YES for the front door and core social surfaces**, with Splash 2 restored to the primary path and first-connection order corrected.

---

## Final criteria

```
UI_DESIGN_INTENT_PRESERVED = YES
FUNCTIONALITY_PRESERVED = YES
PASS2_UNLOCKED = NO
```

```
CHAT_LIST_COMPLETE = YES
CHAT_THREAD_COMPLETE = YES
OPAL_CENTER_IDENTITY_COMPLETE = YES
HOME_SOCIAL_INTENT_PRESERVED = YES
LIVE_INTENT_PRESERVED = YES
VISUAL_IDENTITY_PRESERVED = YES
```

Live / location / gyroscope remain **product philosophy preserved** (contextual coordination, not surveillance). Deep Live presence productization stays deferred — not unlocked.

---

## Preserved (already working — not rewritten)

| Surface | Status | Notes |
|---------|--------|-------|
| Consumer Reality Gate architecture | PRESERVED | Prior GATE_GREEN held; Pass 2 still locked |
| YOU trust / Access≠Action / Suggest→Prepare→Execute | PRESERVED | Prior YOU permissions GREEN; not converted to generic Settings |
| Context Alignment / Relationship Matrix / Gyroscope docs | PRESERVED | Architecture only — not activated |
| Splash 1 brand lockup + TALK. ALIGN. GO. | PRESERVED | Runtime GREEN |
| Promise PNG asset (Splash 2 art) | PRESERVED | Canonical SHA asset untouched |
| Meet Opal companion greeting (not ChatGPT interview) | PRESERVED | Warm, brief, social guide |
| Name → auto username (no Instagram-style username form) | PRESERVED | `suggestUsernameFromName` |
| Chats list: segmented Chats/Calls, search, cards, plan pills | PRESERVED | `ChatsHome` live path |
| Calls: All/Missed, dial CTA, continuity cards | PRESERVED | Same component family |
| Center companion scale (56 rest) + iridescent composer | PRESERVED | Not oversized mascot |
| Home as social shared-life awareness (`graph-social-home`) | PRESERVED | Not Meta feed redesign |
| Honest capability hiding (Assist claim off Meet) | PRESERVED | |

---

## Restored (design intent existed; primary path had drifted)

| Intent | Regression | Restore |
|--------|------------|---------|
| Splash 1 → Splash 2 → Phone | W7 routed Tap to begin straight to Phone; Promise only behind `opal_force_promise` | **Tap to begin → Promise**; Skip intro still skips to Phone honestly |
| First connection before contacts permission | Meet turn order was name → permissions dump → friend | **name → friend → permissions** so contacts arrives with context |
| First-connection copy | “been meaning to catch up” | **“Who do you want to connect with first?”** + “Let's connect {name}…” |
| Contextual permission why-copy | Generic “all worth it” framing | Contacts / notifications / location why-copy aligned to social benefit |
| Username collision confirm | Silent `updateProfile` catch on Meet continue | Accept / Try another when handle taken |

---

## Improved (compounds vision; does not replace foundation)

- Splash 2 returns to emotional “why Opal exists” before commitment  
- Meet feels like **guided relationship setup**, not permission dump then people  
- Username quiet line: “Perfect. You're @handle.”  
- Handle alternatives helper (`suggestUsernameAlternatives`) — Opal handles complexity; human confirms  
- Onboarding reality harness proves the full primary path at 390×844  

---

## Deferred (locked — intentionally)

| Item | State |
|------|-------|
| Pass 2 / Understanding Candidates | LOCKED |
| Memory / relationship inference / scoring | OFF |
| Track B call transport changes | UNTOUCHED |
| Calendar on Meet permission dump | Still deferred (contextual later) |
| Character emotion state machine tied to every conversation mood | Living character states exist; full mood→expression productization deferred |
| Live presence as full coordination product | Intent preserved; not expanded this pass |

---

## Visual organism check

| Surface | Verdict | Evidence |
|---------|---------|----------|
| Splash 1 | GREEN | `01_splash1.png` |
| Splash 2 / Promise | GREEN | `02_splash2_promise.png` |
| Phone | GREEN | `03_phone.png` |
| Meet / first connection / perms | GREEN | `04–06_*.png` |
| Chats | GREEN | `07_chats.png` + `ChatsHome` architecture |
| Calls | GREEN | `08_calls.png` |
| Center | GREEN | `09_center.png` |
| Home social | GREEN | `10_home.png` (`graph-social-home`) |

Identity language (dark premium, cyan/violet accents, luminous borders, companion-scale Center) remains one organism across these surfaces.

---

## Hard boundary confirmation

```
NO EXISTING FEATURES REMOVED
NO AUTHORITY LAWS BROKEN
NO PASS2 UNLOCK
NO MEMORY IMPLEMENTATION
NO RELATIONSHIP INFERENCE
NO SCORING
```

**Statement:** All repairs were additive. No previously completed consumer functionality, authority law, or Pass 2 boundary was removed or weakened.

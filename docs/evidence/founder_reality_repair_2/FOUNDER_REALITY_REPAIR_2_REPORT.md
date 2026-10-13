# Founder Reality Repair #2 — Report

**Branch:** `muse/packet-b-batch-2`  
**Baseline tip:** `ddb112c5`  
**Law:** `FUNCTIONALITY_BEFORE_VISUAL` · `ARCHITECTURE_STAYS_BEHIND_THE_GLASS`  
**Freeze:** **HOLD**  
**Pass 2:** **LOCKED** (`PASS2_UNLOCKED = NO`)

Founder phone screenshots remain acceptance authority. Automated DOM counts do not override pixels.

---

## Root causes (phone-visible REDs)

| # | Issue | Root cause |
|---|---|---|
| 1 | Splash brand collage | Runtime used `/brand/opal-logo.png` — a **side-by-side** character+wordmark composite (1125×750). One DOM `<img>` still painted a bad collage. |
| 2 | Meet username “taken” | Collision copy was technical (`@name is taken`). |
| 3 | Meet transcript stack | Settled turns kept question-card chrome; composers hid but history still read as stacked forms. |
| 4 | Chat → call log | Continuity/Profile `onChat` set `tab=chats` while `ChatsHome` stayed on internal `surface=calls`. |
| 5 | Center tech leak | Provenance `<ul>` painted `fixture_shell` / `decision_intelligence` / `Area not asserted`; Ambient painted failure/source tokens. |
| 6 | Context → YOU | Context CTA wired to `onOpenSettings` → `setTab("you")`. |
| 7 | Story create behind | `.story-create-flow` z=58 under dock 70 / viewer 72 (native 10040 under 10050). |
| 8 | Grow Circle bleed | `.find-people-overlay` z=40 under dock 70; no body scroll-lock. |
| 9 | Graphs New trip ×2 | Section head `trip-new` pill + Create menu item. |
| 10 | Center keyboard/dock | Composer in-flow under dock; no focus-within dock hide. |
| 11 | YOU architecture essays | Consumer copy leaked Pass 2 / Suggest→Prepare→Execute / Expo/APNs / device TZ / canonical look. |
| 12 | Fit disappeared | Hub row honestly hidden (`FIT_PLACEHOLDER_PAGE=0`) while destination still existed. |

---

## Fixed

### P0 — Splash / brand chrome
- Splash + Phone/OTP + Permissions + Act-on-behalf chrome now use **`opal-character.png`** only (`?v=founder-reality-repair-2`).
- Removed Splash tagline layer from production Splash 1.
- Soft breathe animation on character; square identity CSS.
- **Phone-viewport proof:** `shots/01_splash_character.png` — full character, Midnight, no second wordmark collage.

### P1 — Center consumer projection
- Provenance kept internal (`data-consumer-visible="0"` + `hidden`).
- Human resolve notes; removed “Decision Intelligence / fixture / Area not asserted” from painted UI.
- Ambient failure + accept notes humanized.

### P1 — Chat ≠ Call routing
- Lifted `commSurface` to `OpalApp`.
- Continuity Chat + Profile Message force `commSurface="chats"` then `openChat`.

### P1 — Meet
- Soft collision: `Your name is popular 😄 I made a small adjustment: @…`
- Settled name/friend turns become lightweight history (`YouLine` + quiet Opal ack); one active composer.

### P1 — Context ≠ YOU
- In-Center context sheet; **Manage permissions** alone routes to YOU.

### P1 — Overlays / Graphs / dock
- Story create z **80** / native **10060**.
- FindPeople z **80** + body scroll-lock + dock inset padding.
- Removed Graphs Trips head “New trip” pill; Create menu + empty CTA remain.
- Center composer `:focus-within` hides dock.

### P1/P2 — YOU Brand V4 + Fit/Live
- Consumer copy stripped of architecture essays (Privacy, Assist, Notifications, Appearance, Location/Travel, Feed).
- **Fit hub row restored** (coral semantic).
- Live entry: founder-seed **YOU → Go live** opens preserved `LivesGoLivePanel` (no fake livestream).

### P2 — Chat composer language
- Thread composer gets `opal-composer-brand` + `data-composer-language="center-unified"`.
- Empty-thread seed copy softened.

---

## Preserve (untouched organism)

- Permission-first onboarding + Allowed ✓
- ConsentProof / Relationship Access / Graphing
- YOU Trust substrate / Access ≠ Disclosure
- Center action ceilings / Context Alignment architecture
- Chats/Calls backend behavior
- Pass 2 lock / no memory unlock / no intelligence expansion

---

## Remaining founder blockers (HOLD)

1. **Founder phone re-walk** still required — LAN Vite SHA must match tip after push; Safari hard-refresh / Expo force-quit.
2. **opal-logo.png** file still exists as bad collage for legacy emblem aliases; Splash/auth chrome no longer use it. Founder may later export a true vertical lockup if wordmark+character is desired as a *single approved asset*.
3. **O/P/A counter alpha** on any future wordmark lockup still needs founder-approved export (character-only Splash does not include counters).
4. **Active plan context strip in threads** — not fully shipped this tranche (composer language unified; plan pill continuity preserved where already present).
5. **Find People unify** (Add Contact / Search / Invite as one “Find people” mental model) — partial; Grow Circle overlay fixed; full IA unify deferred without capability loss.
6. Member-shell automated inject can still land on Meet if first-run keys drift — splash + YOU verify scripts are the stronger automated proofs.

---

## Device proof

| Shot | Path | What it proves |
|---|---|---|
| Splash character | `docs/evidence/founder_reality_repair_2/shots/01_splash_character.png` | SINGLE character identity; no collage |
| Meet / first-run | `…/shots/02_member_shell.png` | Meet surface reachable |
| YOU verify | `shots/you_page/` (from `_you_permissions_verify.mjs`) | Fit hub + destination leak scan |

Viewport: **390×844** @2x.

---

## Caps

```
CAPABILITY_LOSS = 0          (Fit restored; Live entry restored under founder-seed)
CONSUMER_TECH_LEAK → targeted ZERO on Center paint + YOU assigned surfaces
FIT_PRESENT = YES
CHAT_COMPOSER_DESIGN_LANGUAGE = UNIFIED (Center tokens on thread)
PASS2_UNLOCKED = NO
FREEZE = HOLD
```

---

## Freeze recommendation

**HOLD.** Surface coherence advanced; organism preserved. Do not unlock Pass 2. Do not expand intelligence. Founder cold-stranger / phone walk remains the human gate before any freeze lift.

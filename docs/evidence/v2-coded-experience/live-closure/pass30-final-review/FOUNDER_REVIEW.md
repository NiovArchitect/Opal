# Pass 30 Final Founder Live Review Pack

**HOLD. DO NOT MERGE.**  
**No product mutation in this pass.** Evidence collection only.

---

## EXECUTIVE STATE

P30R2 product is on **`b8194a6`** with remote **`with_tests` GREEN**. This pack prepares the **live experience for founder eyes** — automation measures structure; **you** decide emotional correctness.

| | |
|--|--|
| **PRODUCT SHA** | `b8194a6` |
| **REMOTE CI PRODUCT RUN** | `31931561801` (Classify / Governance / Production GREEN, profile `with_tests`) |
| **EVIDENCE** | this directory (commit separate if pushed) |
| **TEST ENVIRONMENT** | Playwright Chromium **headless**, mouse (not touch), `http://127.0.0.1:5173` + API `:4000` |
| **DEVICE CLAIM** | **Not** a physical-device test — desktop browser emulation only |

Primary inspection path: **`390/`** ordered frames, then **`forming/`**, **`solo/`**, **`generic/`**, **`private-impact/`**, **`media/`**, **`nav/`**.

---

## How to judge (prepared for you)

Open in Finder / VS Code image preview:

1. `390/01_HOME_MOMENT.png` → first-second attraction  
2. `390/03_INLINE_CTA.png` → CTA feel  
3. `390/04_SOCIAL_CHOICE.png` → Solo / With people  
4. `solo/01_FORK.png` + `solo/02_FORMING.png` → Solo agency  
5. `generic/01_FORK.png` → no invented Jordan  
6. `390/07_REALITY_FORMING.png` + `forming/*` → continuity  
7. `private-impact/01_YOU.png` → private creator sentence  
8. `375/*` + `430/*` + `nav/*` → responsive / nav spacing  

---

## 390 JOURNEY (primary)

| Frame | File | Notes |
|-------|------|--------|
| 01 Home / Moment | `390/01_HOME_MOMENT.png` | Chanelle + caption; **media is gradient fallback** (see P0) |
| 02 Interest | `390/02_MEDIA_INTEREST.png` | Same visual weight after tap |
| 03 Inline CTA | `390/03_INLINE_CTA.png` | **I want to do this →** present after interest |
| 04 Social choice | `390/04_SOCIAL_CHOICE.png` | **Solo / With people / Not now** (generic path this session) |
| 07 Reality forming | `390/07_REALITY_FORMING.png` | Dinner · still opening · Where should dinner be? |
| 09 Place/curate | `390/09_PRIVATE_CURATE_OR_PLACE.png` | Forming continue path |
| 12 After | `390/12_AFTER_JOURNEY_HOME.png` | Home after journey |

**Named 123:34 path:** not exercised in primary 390 capture (no “With Jordan” on fork). Unit authority + seed prove Jordan dyad exists; live chat list for founder session did not surface named option in that run. See FAILURE / named section.

---

## 375 / 430 JOURNEY

Critical states under `375/` and `430/` (from first full capture run). Nav bars measured **spaced** Home|People|Plans|You (bar widths ~373 / ~388 / ~428).

---

## MOMENT FIRST FRAME

- Media region height ~400px (structure tall).  
- **hasImg = false** in DOM audit — product fell back to **gradient**, not `/demo/moments/food.jpg`.  
- CTA not visible pre-interest (correct).  
- Quiet follow `·` present.

**WARMTH / FIRST ATTRACTION → FOUNDER JUDGMENT** (blocked by placeholder media — see P0).

---

## CTA LIVE

Captured working copy: **`I want to do this →`** (inline).  
Not altered.  

**CTA COPY → FOUNDER JUDGMENT**

---

## SOLO

`solo/01_FORK.png` · `solo/02_FORMING.png`  

- No invented Jordan when no chats.  
- Solo → Reality forming without friend picker.  
- Title **Dinner** (solo) · still opening · Where should dinner be?

**SOLO AGENCY → FOUNDER JUDGMENT**

---

## NAMED BEFORE / AFTER TAP

| Expected | Live evidence |
|----------|----------------|
| Before: all neutral | **Generic path only** in primary capture (Solo / With people) |
| After: Jordan active | **Not captured** — named option absent in that session |

**Unit authority (not UI):**

- Chats include Jordan → option **With Jordan** eligible  
- Empty chats → **no** named option  
- Law: presence ≠ selection  

**NAMED PERSONALIZATION → FOUNDER JUDGMENT** (need live re-run with chats loaded — listed as gap)

---

## GENERIC FALLBACK

`generic/01_FORK.png`  

**Solo | With people | Not now** — no Jordan without grounded chat. **PASS** structurally.

---

## NAMED CONTEXT AUTHORITY

| Source | Evidence |
|--------|----------|
| Seed | Jordan dyad id `6dff98eb-…` after `founder_review_seed` |
| Product rule | `earnedNamedPresence(chats)` |
| Negative | empty chats → null |
| UI leakage | **No** reasoning shown in product (correct) |

---

## MULTIPLE-PEOPLE CASE

Current product prefers **Jordan if present** among chats; does not invent multi-person ranking UI. Falls back to first dyad name if no Jordan. **No new ranking this pass.**

---

## QUESTION BURDEN / INTERACTION COST

| Path | Questions | Taps (approx) | People picker | Search |
|------|-----------|---------------|---------------|--------|
| Named (design) | 1 (where) | media + CTA + name | 0 | 0 |
| Generic | 1 + picker | + people sheet | 1 | 0 |
| Solo | 1 (where) | media + CTA + Solo | 0 | 0 |

Named path **should** reduce labor vs generic; live named path not timed this pack.

---

## MOTION TIMINGS

Product-adjacent deltas recorded when primary journey completed (first run). Harness waits labeled separately in `MOTION_TIMINGS.json` / pack JSON.

Second re-run had OTP flakiness — timings empty for that run; **do not treat harness waits as product timing**.

**MOTION FEEL → FOUNDER JUDGMENT**

---

## REALITY FORMING / SMALL RESIDUE

| Check | Result |
|-------|--------|
| FORMING label | **Absent** |
| WHERE schema label | **Absent** |
| Question alone | **Present** |
| Provenance chip text | **Absent** |
| Atmosphere / residue | Weak without real media; plate does **not** fully mask Home chrome in captures |

**MOMENT→SR CONTINUITY → FOUNDER JUDGMENT**  
Structural copy is right; **visual isolation of forming is weak** (Home editorial still readable) — see P0.

---

## SHARED REALITY LANDING

No full settled 4:2 atmospheric plate capture in this pack (live durable presence depends on share completion). Copy audit: no “began as…”, no “inspired by…” on forming path.

**Settled consequence → FOUNDER JUDGMENT** when you complete share live.

---

## VISUAL DECAY AUDIT

| State | Remains | Disappears | Why |
|-------|---------|------------|-----|
| Moment | media, human, caption, place, quiet CTA | — | discovery |
| Choice | Solo / people / named options | CTA chrome | decision |
| Forming | people/when open, place question, residue intent | social post caption as primary, provenance text | mid certainty |
| Settled (target) | time/place/people/movement | began as / inspired by / graph explanation | consequence |

**Backend compounds. Frontend decays.**

---

## PRIVATE CURATE / SHARE

Forming → place path opened (capture `390/09_*`). Explicit share / peer isolation **not** re-soaked (realtime code untouched; no 20m soak).  

**PRIVACY/SHARE → partial evidence**

---

## PRIVATE CREATOR IMPACT

`private-impact/01_YOU.png`  

> For you  
> **Your weekend in Little Italy inspired 12 experiences.**  

Soft food wash. On **You** only. No public count. **Structurally aligned with 124:33.**

---

## FOLLOW TREATMENT

Quiet **`·`** next to creator (not Instagram “Following” label).  

**FOLLOW → FOUNDER JUDGMENT** (Opal vs Instagram)

---

## MEDIA CROP MATRIX

`media/food.png` · `portrait.png` · `restaurant.png` (injected for crop smoke).  
Primary journey still used **fallback gradient** — representative media **not** in primary Moment first frame.

---

## FOUNDER JUDGMENT (you decide — not harness)

| Gate | Status |
|------|--------|
| **WARMTH** | FOUNDER JUDGMENT |
| **VOID** | FOUNDER JUDGMENT |
| **CTA COPY** | FOUNDER JUDGMENT |
| **NAMED PERSONALIZATION** | FOUNDER JUDGMENT (path incomplete in primary capture) |
| **MOMENT→SR** | FOUNDER JUDGMENT |
| **SOCIAL VS AD** | FOUNDER JUDGMENT |
| **SOCIAL VS SOFTWARE** | FOUNDER JUDGMENT |
| **MEDIA FIRST-SECOND** | FOUNDER JUDGMENT — **blocked by missing real photo in primary** |

---

## RESPONSIVE / A11Y / REDUCED MOTION

| Item | Result |
|------|--------|
| Nav spacing 375/390/430 | **PASS** — Home People Plans You spaced |
| Reduced motion captures | `reduced-motion/*` — FOUNDER |
| Keyboard/SR deep pass | not fully automated — note for next if needed |

---

## REALTIME REGRESSION

Not re-run (transport untouched). Prior Pass 26 soak remains historical; not re-claimed here.

---

## FIGMA / PRODUCT MATCH

| Node | Match | Intentional difference / gap |
|------|-------|------------------------------|
| 123:3 | YES (copy working) | real media missing in live first frame |
| 123:17 | YES | — |
| 123:34 | PARTIAL | not seen in primary 390 (chats) |
| 123:52 | NOT CAPTURED | needs named path |
| 124:2 | PARTIAL | copy right; overlay/Home bleed; weak atmosphere |
| 124:17 | PARTIAL | no full settled plate capture |
| 124:33 | YES | You tab |
| 124:45 | YES | quiet · |

---

## FAILURE CORPUS

### P0

1. **VISUAL / MEDIA** — Primary Moment uses **gradient fallback**, not committed demo photography, so first-second desire cannot be judged honestly.  
2. **VISUAL / MOTION** — Reality-forming does **not fully isolate** from Home (editorial / Moment still readable under plate). Feels more “panel on Home” than “Moment becomes Reality.”

### P1

3. **PERSONALIZATION / EVIDENCE** — Named **With Jordan** path not captured in primary 390 (session chats / seed timing). Authority unit tests green; live fork was generic.  
4. **HARNESS** — Multi-login OTP flaky under rapid sequential sessions; second pack run lost primary timings.  
5. **HARNESS** — `founder_review_seed.mjs` still errors at group proof end (`group is not defined`) after dyads succeed (partial fix applied for `convList` rename).

### P2

6. **VISUAL** — Home shows residual **Loading…** chrome during review.  
7. **VISUAL** — Forming residue image cannot prove usefulness without real media.

---

## NEXT FOUNDER DECISIONS

1. Accept or reject live experience given P0 media + forming isolation.  
2. Authorize **product** repair for: real media bind reliability; forming full-screen isolation — **only after eyes**.  
3. Require re-capture of named BEFORE/AFTER when chats confirmed.  
4. Settle CTA copy after real-media first frame.  

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

---

## FINAL LAW (this pack)

Harness can say structure works.  
**You** say whether you want to keep going.

Backend intelligence compounds.  
Frontend information decays.  
The smarter the system, the fewer footprints.

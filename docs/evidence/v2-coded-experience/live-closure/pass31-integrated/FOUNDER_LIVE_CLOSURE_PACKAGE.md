# Pass 31 — Founder Live Closure Package

**HOLD. DO NOT MERGE.**

| | |
|--|--|
| **Product SHA** | **`f43408d`** (P0-31-01…04 product) |
| **Product remote CI** | **`31939039458`** GREEN |
| **Evidence / package** | this doc (+ optional tiny testability commit if applied) |
| **Feature expansion** | **NONE** |

---

## 1. Environment / URL

| | |
|--|--|
| **Web** | http://127.0.0.1:5173/ |
| **API** | http://127.0.0.1:4000 (must be healthy) |
| **How to start** | From repo: `./scripts/founder_review_up.sh` (or ensure API + web already running) |
| **Seed** | `API_BASE=http://127.0.0.1:4000 node scripts/founder_review_seed.mjs` |
| **Browser** | Chrome/Safari normal window (not headless) |
| **Viewport** | Phone-ish ~390 wide is ideal; desktop OK |

If web was started **before** latest product, restart web so it serves `f43408d` code.

---

## 2. Login / identities

| Role | Phone | Code (dev) | Notes |
|------|-------|------------|--------|
| **Founder (you)** | `+12025550101` | `111111` (or on-screen dev code) | Name: Founder Review |
| Jordan | `+12025550103` | `111111` / seeded | Used by product for “With Jordan” when chat exists |
| Maya / Sam | seeded for group | — | Group: **Founder Review Group** if seed script succeeded |

**Activation:** open URL → skip first-run if shown → enter phone → consent → code → enter product.

---

## 3. Walkthrough A — Solo

| Step | Do this | Expect | Fail if |
|------|---------|--------|---------|
| A1 | Home | Social Moment **Chanelle** / **Juniper & Ivy** (or caption + place) | No Moment |
| A2 | Tap **photo** (whole media area) | Hint becomes CTA **I want to do this →** | No CTA |
| A3 | Tap CTA | Sheet: **Solo / With people** (or named if present) | No sheet |
| A4 | Tap **Solo** | Forming: **Juniper** (or place name), **not** “Where should dinner be?”, not generic Dinner-only | WHERE dinner / lost place |
| A5 | Tap **When works?** | Time sheet with Saturday times | Dead control |
| A6 | Tap **Saturday · 7:30 PM** | Time sticks; place + Solo remain | Time vanishes / place reopens |
| A7 | Continue to reserve if UI offers it | Same Reality; if confirmed → human line like **Juniper… reserved…** | Detached booking only / fake peer chat |
| A8 | Solo | No fake Jordan conversation required | Invented peer |

**Synthetic reservation:** panel may still be development/synthetic. Confirmed copy is only valid as **product presentation of execution state**, not live production booking. Treat as proof path, not real restaurant booking.

---

## 4. Walkthrough B — With Jordan

| Step | Do this | Expect | Fail if |
|------|---------|--------|---------|
| B1–B2 | Same Moment → CTA | Same as A | — |
| B3 | If **With Jordan** shown, tap it | Active only after tap; Juniper remains | Preselected Jordan / place lost |
| B3b | Else **With people** → pick Jordan | Same | — |
| B4 | Forming | Juniper + Jordan; no WHERE dinner | Reset |
| B5 | **Saturday · 7:30 PM** | WHEN sticks; WHO/WHERE stick | Dead tap |
| B6 | Reserve if available | Same Reality identity | Second Reality/plan |
| B7 | Open **People → Jordan** chat | One sparse **system** consequence (not Jordan speaking) | Technical jargon / human bubble / duplicates |

**Feel:** *The thing we were planning became reserved* — not *I used booking*.

---

## 5. Walkthrough C — Group

| Step | Do this | Expect | Fail if |
|------|---------|--------|---------|
| C1 | People → open **Founder Review Group** (or multi-person group) | Thread with several messages | Empty |
| C2 | Scan senders | **Maya / Jordan / Sam / You** individually named (not “them”) | Generic them |
| C3 | Consecutive same person | Grouped; name/avatar not spam every bubble | No identity |
| C4 | Returning speaker | Name/avatar reappears after others | Lost |
| C5 | Any system / Opal plate | Clearly **not** a human peer | Looks like Sam/Jordan |

If group not seeded: still open any multi-peer conversation and confirm peers are not collapsed to one “them”.

---

## 6. Critical visual expectations

| Transition | Expect |
|------------|--------|
| Interest | Photo first; then quiet CTA |
| Solo / person | Place/experience **remembered** |
| When | Selected time **authoritative** on same object |
| Reserve confirm | Same object reserved; system line sparse |
| Group | Instant “who said that?” |

---

## 7. What counts as failure

- Exact place → Solo → **Where should dinner be?**
- Generic **Dinner** wipe of Juniper
- Time tap with **no** sticky WHEN
- Reservation that feels like another product / no lineage
- Confirmed language while still pending
- Group messages without clear speaker
- System reservation line looking like a human

---

## 8. Synthetic reservation honesty

- Local/synthetic/dev booking **must not** be presented as live production restaurant confirmation outside evidence.
- Product may show reserved language when **execution status is confirmed** (including synthetic provider).
- Founder judges **continuity**, not whether Juniper really took a booking.

---

## 9. CTA flakiness: harness vs product

| Finding | Detail |
|---------|--------|
| **Classification** | **HARNESS / TESTABILITY** (A/B), not product interaction logic |
| **Root cause** | `data-testid="social-moment-media"` lived only on **fallback** media; with real `mediaUrl` image, Playwright targeted missing testid. Humans click the **button** (always works). |
| **Proof** | After putting testid on the **button**, headless interest→CTA returned **visible** `I want to do this →` |
| **Product behavior** | Interest → CTA is intentional (tap photo first). Not a dead control for humans. |
| **Change** | Minimal: testid on clickable media button (no UX change). |

---

## 10. Harness-only / tiny product testability

| Change | Why |
|--------|-----|
| `data-testid="social-moment-media"` on media **button** | Deterministic automation + founder tooling; no visual change |
| This package + seed notes | Founder path |

If testid commit is applied, product SHA **moves** — report new SHA/CI.  
If only docs: product remains **`f43408d`**.

---

## 11. Product SHA

- **P0 product baseline:** **`f43408d`** / CI **`31939039458`**
- Integrated evidence: `7d887ed`
- Any media-testid fix = **new product SHA required** before claiming that SHA for closure

---

## 12. HOLD

**HOLD. DO NOT MERGE.**  
No feature expansion.  
Pass 31 closes only after founder completes A/B/C and accepts.

**KEEP WHAT WORKS. FIX ONLY WHAT IS ACTUALLY BROKEN.**

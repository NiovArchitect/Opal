# Paste K — Lives · Stickers · Venue Verification · Opal Pay

**Authority:** Amendment 2 (supersedes unplaced-live portions of Amendment 1).  
**Everything else in the original Paste K paste + Amendment 1 stands under this frame.**  
**Branch:** `muse/packet-b-batch-2` · commit-per-phase · push · no merge.  
**Reuse:** Paste G wallet ledger (`idempotency_key`, double-spend impossible); `OpalCore.Places.get_details/2` + Google Places `place_id`; existing `SafetyReport` queue (extend categories).  
**Laws that still hold:** Paste J privacy absolute · AttentionBudget free-tiers · people-scoring ban · travel-state GPS ban.

---

## Decision Log (do not re-litigate)

| Decision | Rule |
|----------|------|
| Unplaced lives | **CUT.** Every live is placed. Location is an explicit trait — the only way to go live is to confirm where you are. |
| Stickers | Hybrid **70% host / 30% venue** (v1 constant, documented configurable). Test-mode money. Ledger real. Opal takes **0%** v1. |
| Unclaimed venue escrow | Onboarding wedge: “you have $X waiting.” Accrues for Places-validated venues even before claim. |
| Venue verification | **Maximum-security.** Fake venues are the #1 trust threat to the whole model. |
| Money sequencing | wallet legal review → sticker real money → venue payouts → Opal Pay real money. Each phase needs its own clearance. Test-mode mechanics for ALL of it now (one build); real money phased via flags. |
| Anti-mercenary | Stickers are celebratory, never required. A live with zero stickers is a complete live. Vibe leads; money follows. |

---

## Phase 0 — Concept (final)

### 0.1g — Every live is placed (REPLACES Amendment 1’s 0.1g)

Every live is placed, no exceptions. The go-live flow **requires** venue confirmation — typed, searched, Places-validated. There is **no** “just go live” path.

Safety model: location is never ambient, never assumed, always a deliberate declaration with plain-words consequences (“Anyone can see you're at [venue]”). Cutting unplaced lives removes an entire class of ambiguity — the product is simpler and safer for it.

### 0.1h — Sticker economy (hybrid)

Viewers spend from their Opal wallet on stickers during lives. Split **70% host / 30% venue** (v1 constant, documented as configurable). Venue cut accrues in escrow for unclaimed venues (“you have $X waiting” is the venue onboarding wedge). Opal takes **0%** v1.

**ALL money in test mode** until the stored-value legal review clears — the ledger is real, the loads are gated, same as the wallet today. Stated in-app: **“Stickers use test credits for now.”**

### 0.1i — Anti-mercenary law

Stickers are celebratory, never required. A live with zero stickers is a complete live. If the economy ever makes lives feel like busking, the product has failed — the vibe leads, the money follows.

### 0.1j — The full loop

Money enters via stickers (viewers → host + venue escrow) and **exits** via Opal Pay at venues (customer scans venue QR → pays from Opal wallet → venue balance).

The venue relationship is threefold:

1. Sticker revenue  
2. Customers spending Opal balances on-site  
3. Insight into their Opal regulars  

Pitch: “your customers already hold Opal — let them spend it here.”

### 0.1k — Sequencing law

```
wallet legal review → sticker real money → venue payouts → Opal Pay real money
```

Each phase needs its own legal clearance; no phase jumps the queue. Test-mode mechanics for **ALL** of it now (one build); real money phased.

**Flags (single flip each; ledger already correct):**

| Flag | Default | Meaning when `true` |
|------|---------|---------------------|
| `OPAL_STICKER_LIVE_MONEY` | unset/false | Stickers settle as live money (still subject to wallet-load legal gate) |
| `OPAL_PAY_LIVE_MONEY` | unset/false | Venue QR payments settle as live money |

Until flags flip: every sticker/pay surface states test-mode plainly.

---

## Phase map (renumbered under Amendment 2)

| Phase | Title | Notes |
|-------|-------|-------|
| **0** | Concept | This document |
| **1** | LiveRoom foundation | `venue_id` **REQUIRED**; placed-only |
| **V** | Venue verification securities | Insert after Phase 1 · V.1–V.5 |
| **2** | Go-live flow | Venue search/confirm required · no skip |
| **3–5** | Live runtime / heat / discovery | Heat map for placed lives (all lives); stickers gated by quarantine |
| **S** | Sticker economy | Insert after Phase 5 · S.1–S.4 |
| **Q** | Opal Pay at venues | Insert after stickers · Q.1–Q.5 |
| **7** | Venue maxing | 7.5–7.7 + amended 7.6 in-Opal rewards |
| **8** | Safety | 8.1 residential via V.1 · report queue handles venue reports |

---

## Phase 1 — LiveRoom foundation

### 1.2 (REVERTED to original / Amendment 2)

`LiveRoom.venue_id` is **REQUIRED**. Drop any `location_sharing` field — it existed for unplaced lives, which do not exist. A room is “live at [venue],” full stop.

Unplaced lives can never become placed mid-stream is moot: there are no unplaced lives. Privacy direction still only tightens (no retroactive expansion of who sees what).

**Schema sketch:**

- `venues` — canonical place row keyed by Google Places `place_id` (unique), name, address, types, residential flag, quarantine status/until, claim status, escrow_balance_cents, pay_qr_token (signed, unguessable)
- `live_rooms` — host_account_id, venue_id (FK, NOT NULL), status (`scheduled`/`live`/`ended`), started_at/ended_at, heat contribution frozen flag
- Heat / discovery indexes by venue for the heat map

---

## Phase V — Venue verification securities (after Phase 1)

### V.1 — Venue allowlist

A live can only anchor to a venue with a valid Google Places `place_id`. Free-text venue names are **REJECTED** at go-live (“we couldn't find that venue — try searching”). No `place_id`, no live. This single rule kills ~90% of fake venues.

Residential filter: a “venue” that resolves to a residential address in Places data (`types` include `premise`/`street_address`/`subpremise` without a public business type, or Places marks residential) is rejected with **“lives happen at venues.”** The allowlist **is** the residential filter (strengthens 8.1).

### V.2 — New-venue quarantine

First time a `place_id` hosts a live, the venue enters quarantine (**7 days**): lives allowed, heat counts, but **STICKERS DISABLED** and venue escrow does **not** accrue. After 7 days with no fraud flags → full status. (Fraudsters hate waiting; real venues don't notice.)

### V.3 — Presence honesty (no GPS — travel-state law stands)

v1 = trust + verify-by-crowd. Viewers can report “host isn't here” (one tap, in the live). **3+** reports → live flagged, heat contribution frozen, host warned.

Claimed venues (future) get a QR code they can display; scanning it = verified presence (**build the scan path now**, the claim flow later).

### V.4 — Rate limits

- Max **3** new venues / host / week (kills venue-spray farming)  
- Max **5** lives / venue / day per host (kills heat inflation)  
- Duplicate place detection (same address, different `place_id` → merge to canonical, log it)

### V.5 — Report queue

Extend the existing report queue (Safety / 8.3) for venue reports: `fake_venue`, `not_a_real_place`, `host_isnt_here`. Queue schema built now; human review is future — but the queue must exist or reports go nowhere.

---

## Phase 2 — Go-live flow

### 2.2 (REPLACES Amendment 1’s 2.2)

Step 1 = **“Where are you?”** — a venue search/confirm field (Places autocomplete, validated `place_id`). **No default, no skip, no “just go live.”**

Viewer-reward trade stated once:  
> “Confirmed venues get discovered on the heat map — that's how your people (and new fans) find you.”

Plain-words consequence on confirm:  
> “Anyone can see you're at [venue].”

---

## Phase S — Sticker economy (after Phase 5)

### S.1 — Catalog

6 stickers v1 (fixed set, no user uploads — asset control). Test-credit prices in **1 / 5 / 25** tiers (cents: 100 / 500 / 2500 unless otherwise configured).

Purchase debits viewer wallet (test credits), credits split 70/30 per hybrid rule, all through the idempotent wallet ledger (Paste G patterns — double-spend impossible).

Host share → host wallet credit (`adjustment` / sticker_credit).  
Venue share → venue escrow balance (unless quarantine).

### S.2 — Display

Sticker appears on the live (overlay, ~3s). Host sees e.g. `Maya sent 🔥 (+$3.50)`. Venue escrow balance visible **ONLY** to the venue (when claimed) and to Opal ops — **never** to viewers (no “this place made $X tonight”).

### S.3 — Anti-fraud

- No self-gifting (host can't sticker their own live)  
- Velocity: max **10** stickers/min/viewer; max **$50**/live/viewer in test credits  
- Venue must be Places-validated; quarantine disables stickers  
- Circular gifting detection (A↔B sticker loops flagged)

### S.4 — Money-gated honesty

Every sticker surface states test-mode plainly. Legal clear → config flip `OPAL_STICKER_LIVE_MONEY` — not a rebuild. Implement as a **single flag** with the ledger already correct.

In-app copy: **“Stickers use test credits for now.”**

---

## Phase Q — Opal Pay at venues (after stickers)

### Q.1 — Venue QR

Every venue gets a static QR (`venue_id` encoded, signed, unguessable — not sequential). Display-ready asset for the venue page. v1 = the QR exists and scans; “show this at the counter” is future.

### Q.2 — Scan → pay

Customer scans → Opal shows venue name + amount entry (customer-entered v1; venue-entered via future claimed dashboard) → confirm with wallet balance → idempotent ledger: debit customer, credit venue balance. Same double-spend-proof ledger as stickers. Receipt: both sides get one (private, in-app).

### Q.3 — Test-mode honesty

Paying with test credits shows **“test payment”** plainly. `OPAL_PAY_LIVE_MONEY` flips it — one flag, ledger already correct.

### Q.4 — Limits (fraud)

- Max **$200**/test-payment  
- Max **5**/day per customer per venue  
- Velocity alerts on the venue side  
- No customer → venue → same-customer loops (laundering pattern — detect and freeze, log it)

### Q.5 — NFC note (document, don't build)

iOS NFC is Apple-gated in the US. If that changes, the ledger and venue-balance rails already exist — only the tap transport is new. QR is the v1 and it is not a compromise: same steps, no permission needed.

---

## Phase 7 — Venue maxing (behavior loop)

### 7.5 — Vibe contributors

People will venue-max: chase heat, collect venues, become regulars. Feed it honestly: per-venue **“vibe contributors”** — opt-in, fun, **NOT a score** (people-scoring ban stands). This is “Maya's been to 12 lives at Rooftop Bar,” a **fact**, not a rating. Visible on the venue page, per-relationship rules (strangers see counts, circles see names).

### 7.6 — Venue rewards (AMENDED — in-Opal)

Venues can reward top contributors **in Opal**: a credit to the contributor's wallet from the venue balance (test mode). Loop: fan stickers the venue → venue rewards the fan → fan spends it back at the venue. Money orbits the place.

V1: contributor history per venue exists; reward mechanics use venue balance → wallet credit (idempotent). Opal provides the relationship rail; external free-drink logistics remain the venue's business.

### 7.7 — Streaks

“3 Friday nights at [venue]” — **private** to the account, surfaced as a nudge (“Rooftop Fridays — that's your thing”). Never public by default, never a leaderboard of humans.

---

## Phase 8 — Safety (strengthened)

### 8.1 — Residential rejection

Backed by V.1: Places-resolved residential addresses rejected with “lives happen at venues.” The allowlist is the residential filter.

Best-effort v1 for ambient leaks (audio background, chat, metadata): document honestly; OS-level leaks out of scope — do not claim otherwise.

### 8.3 / V.5 — Reports

Categories include `fake_venue`, `not_a_real_place`, `host_isnt_here` (plus existing safety categories). Queue must accept them now.

### 8.4 — Spoofing

Places-validated venue rule extends to sticker eligibility; quarantine + rate limits + crowd reports close the farming loop.

---

## Implementation inventory (this worktree)

Greenfield under Amendment 2 (no prior LiveRoom / sticker / Opal Pay modules):

| Area | Target |
|------|--------|
| Migration | `venues`, `live_rooms`, `live_stickers`, `venue_balances` / escrow columns, `venue_presence_scans`, `venue_contributions`, `venue_streaks`, pay receipts |
| Domain | `OpalCore.Lives`, `OpalCore.Lives.Venue`, `OpalCore.Lives.Stickers`, `OpalCore.Lives.OpalPay`, `OpalCore.Lives.Verification` |
| Wallet | Extend spend/credit paths with `ref_type` sticker / venue_pay / venue_reward; reuse Split credit pattern for host/venue credits |
| Places | Validate `place_id` via `Places.get_details`; residential reject helper |
| Safety | Extend `SafetyReport` categories for venue reports |
| HTTP | Product routes under `/api/v1/product/lives`, `/venues`, sticker purchase, pay, report presence |
| Flags | `OPAL_STICKER_LIVE_MONEY`, `OPAL_PAY_LIVE_MONEY` (runtime env; default off) |
| FE | Go-live venue confirm, live sticker overlay + honesty copy, venue QR scan→pay, contributor facts (minimal honest surfaces) |
| Tests | Domain + controller + fraud/velocity + flag honesty |
| Evidence | `shots/intelligence/PASTE_K_VERIFY.json`, `shots/audit/paste_k/` |

---

## Supersession notes

- Amendment 1’s **PLACED / UNPLACED** split, nullable `venue_id`, `location_sharing`, and “Just go live” path are **void**.  
- Amendment 1’s sticker economy (h/i), S.1–S.4, hybrid split, test-mode, anti-mercenary law **stand**.  
- Amendment 2 adds V.1–V.5, Q.1–Q.5, 0.1j–k, 7.5–7.7, strengthens 8.1, amends 7.6 for in-Opal rewards.

---

## Definition of done (Paste K)

1. Concept doc committed (this file).  
2. LiveRoom placed-only + V.1–V.5 enforced in code + tests.  
3. Stickers S.1–S.4 through real ledger, test-mode honesty, `OPAL_STICKER_LIVE_MONEY` flip.  
4. Opal Pay Q.1–Q.5 (QR + pay + limits + NFC note); `OPAL_PAY_LIVE_MONEY` flip.  
5. 7.5–7.7 contributor facts, private streaks, venue→fan reward credit.  
6. `PASTE_K_VERIFY.json` PASS; mix + targeted vitest green; pushed on `muse/packet-b-batch-2`; no merge.

# FOUNDER PROOF RUNBOOK

**Branch:** `build/v2-coded-experience-closure`  
**Checkpoints:** `67b4439` → `e8e7f14`  
**Status:** **HOLD / DO NOT MERGE**  
**Operating law:**

> No more implementation because something might be useful.  
> Only repair what the live proof demonstrates is wrong.

**Hard freeze on implementation** until the five proofs below are completed (or fail with a named bug).

---

## What is already proven (API / unit)

See `PROOF_BEFORE_FEATURES.md` and `NARROW_CLOSURE_PROOF.md`.

| | |
|--|--|
| Sam as ConversationMember | API yes |
| Durable chronology IDs re-read | API yes |
| Private chronology filter | API yes |
| Group human_surface compression | API / unit yes |
| Dual-browser 20–30m socket | **No** |
| Browser logout/login UI chronology | **No** |
| Exact 390px Figma match | **No** |
| Measured residue (founder episode) | **No** |

API-level proof ≠ founder-visible product proof.

---

## Freeze scope

**Allowed during this pass**

- Founder exercise of the five proofs
- Screenshots, diagnostics logs, residue counts
- Bugfix only if a proof **demonstrates** breakage (with steps to reproduce)

**Not allowed**

- New features
- “Might be useful” backend work
- Logo / brand reopening
- Architecture layers
- Approximate Figma polish without a named mismatch from side-by-side compare

---

## Environment

```bash
# From worktree root
cd apps/opal_core && mix ecto.migrate
# start API + web (or scripts/founder_review_up.sh)
node scripts/founder_review_seed.mjs
```

| | |
|--|--|
| URL | local Vite product (typ. `http://127.0.0.1:5173`) |
| Phone | `+12025550101` |
| Code | `111111` |
| Sam (optional second client) | `+12025550107` / `777777` |
| Maya | `+12025550102` / `222222` |

Viewport for visual proof: **390px width only** first.

Figma references (pulled):

| Screen | Node | Artifact |
|--------|------|----------|
| Home | `2:2` | `figma-diff/home-2-2.png` |
| Chat | `3:2` | `figma-diff/chat-3-2.png` |
| Shared Reality | `4:2` | `figma-diff/shared-reality-4-2.png` |
| Curate | `4:11` | `figma-diff/curate-4-11.png` |

File: `https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy`

---

## Proof 1 — Browser chronology (living record)

**Goal:** Chronology is a durable social history, not a recompute flash.

| Step | Action | Pass criteria |
|------|--------|----------------|
| 1 | Seed · login founder | Home loads |
| 2 | Open Friends (group) or Jordan | Thread shows human messages + Opal filaments |
| 3 | Scroll full chronology | Moments interleaved after causes; not a dump of machine noise |
| 4 | Note moment labels + order | Write them down or screenshot |
| 5 | **Hard refresh** | Same order, same consequential moments, no duplicates |
| 6 | **Sign out** | Session cleared |
| 7 | **Sign in** same account | |
| 8 | Reopen same conversation | Same chronology order |
| 9 | Privacy | Private / Only-you moments not visible when logged in as peer (open as Maya or Sam if seeded) |

**Fail if:** moments vanish, reorder randomly, duplicate, or private shows to wrong user.

**Bug-only repair if fail.** Do not “improve” chronology while this is green.

---

## Proof 2 — Group reality (Sam + Home compression)

**Goal:** Founder sees social reality, not machinery.

| Step | Action | Pass criteria |
|------|--------|----------------|
| 1 | Friends **before** Sam (if re-seed mid-flow) or note 5-person state | Title/peers match members |
| 2 | After seed with Sam | Sam is a **real** peer; can open as Sam and message |
| 3 | Home Friends presence | Compresses toward: **Saturday dinner · 6 people · around 7:30 · Choosing the place** (wording may vary; structure must hold) |
| 4 | Inspect UI copy | **No** constraint dump, no required_participant_ids, no sushi_conflict keys, no attendance matrix |
| 5 | If Harbor was 5-seat | Product may quietly change recommendation when 6 — without spreadsheet |

**Fail if:** Sam is projected-only, Home still feels dyad, or internals leak.

---

## Proof 3 — Socket truth (20–30 minutes)

**Goal:** Infrastructure stability, not debounced calm.

| | |
|--|--|
| Client A | Founder `+12025550101` |
| Client B | Maya or Sam |
| Duration | **≥ 20 minutes** (prefer 30) |

Exercise both clients: A→B and B→A messages, idle, open several chats, Home, background/return if possible, send after idle.

Capture in **each** tab console:

```js
productRealtime.getDiagnostics()
```

At: **T+0 · T+5 · T+10 · T+15 · T+20** (and final).

| Field | Healthy-ish |
|-------|-------------|
| `connectCount` | ~1 (or low; explain jumps) |
| `reconnectScheduleCount` | **0** preferred |
| `closeCount` | **0** unless deliberate logout |
| `errorCount` | **0** |
| `connectedLifetimeMs` | rising while connected |

**Fail if:** reconnect counts keep rising while UI looks calm. That is still a bug.

Record numbers in a short note under this evidence folder (one file, no sprawl).

---

## Proof 4 — Figma comparison (390px)

**Procedure (no approximation):**

```
Figma approved frame → running 390px screenshot → visual diff → (only if mismatch) code repair → screenshot again
```

Order:

1. Home  
2. Chat  
3. Shared Reality  
4. Curate  

Then Extend / Plans / Group / filament if time.

**Compare:** geometry, type, spacing, negative space, material, hierarchy, filament, density, motion/collapse, **what is absent** — not “same colors.”

**Pass:** remaining differences intentional and named.  
**Fail:** “directionally similar” without frame-by-frame notes.

Approved Figma is immutable. Code moves toward Figma, never the reverse.

---

## Proof 5 — One real residue episode

**Goal:** KPI from a natural plan, not QA theater.

1. Make an actual plan as a human (Jordan or Friends — natural language).  
2. Do **not** behave like a test script.  
3. Afterward, count only **coordination labor**:

   - repeated availability questions  
   - place search outside Opal  
   - reconfirmation loops  
   - “where are we meeting?”  
   - “who is coming?” repeats  

4. **Do not** count ordinary social conversation as residue.

Record:

| | Count |
|--|-------|
| Coordination actions without Opal (honest estimate of the alternative) | |
| Coordination actions with Opal (what you actually did) | |
| What Opal removed | |
| What humans correctly kept | |

Estimated `~12 → ~4` from fixtures is **not** this KPI.

---

## Result template (fill after pass)

```text
CHRONOLOGY_BROWSER: PASS | FAIL | notes
GROUP_REALITY: PASS | FAIL | notes
SOCKET_20M: PASS | FAIL | diagnostics paste
FIGMA_390: PASS | FAIL | named mismatches
RESIDUE_EPISODE: PASS | FAIL | counts
IMPLEMENTATION_FREEZE: intact | broken by bugfix X
MERGE: DO NOT MERGE
```

---

## After proofs

| Outcome | Action |
|---------|--------|
| All five green | Founder may still HOLD for product judgment; still not automatic merge |
| Any fail | File bug with repro → **only then** implementation repair → re-run **that** proof |
| Temptation to add features | Refuse |

---

## Threshold (unchanged)

> A conversation changes → Opal recognizes what changed → determines which people it affects → recomputes only what needs recomputing → keeps private causes private → preserves human authorship → updates the visible reality → records the consequential change → and leaves the humans with less coordination work — **inside the approved Figma world.**

That is Opal. Architecture alone is not.

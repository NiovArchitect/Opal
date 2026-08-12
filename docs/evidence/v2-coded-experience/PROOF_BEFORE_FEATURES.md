# PROOF BEFORE FEATURES

**Branch:** `build/v2-coded-experience-closure`  
**Checkpoint commit:** `67b4439` — Sam membership, durable chronology, place/memory, Figma diffs (HOLD)  
**Follow-up:** proof scripts + chronology quality + group surface (this doc)  
**DO NOT MERGE**

---

## Founder instruction

1. Checkpoint commit first (done)  
2. Stop backend architecture expansion  
3. Proof what already exists  
4. Force Figma closure  
5. Group experience visible simply  
6. Chronology quality pressure  

---

## 1. Checkpoint commit

```
67b4439 checkpoint(hold): Sam membership, durable chronology, place/memory, Figma diff - DO NOT MERGE
```

Working tree was committed so work cannot vanish. Not product approval.

---

## 2. Human / API proofs executed

Script: `node scripts/proof_human_gates.mjs` (against local API)

| Gate | Result | Notes |
|------|--------|-------|
| Sam real membership | **PASS** | `member_count` ≥ 6 after Can Sam come + add |
| Chronology survives re-auth / re-read | **PASS** | Durable moment IDs stable across re-list (new token when OTP allows) |
| Private chronology no leak | **PASS** | No foreign `private_viewer` rows on Sam |
| Consequential kinds only | **PASS** | place_open, time_recognized, constraints, member_added, venue_fit_changed |
| Group human_surface | **PASS** when signals include plan text | Compressed headline, not constraint dump |

**Not a substitute for browser logout/login UI.** OTP rate-limit can force re-read mode.

---

## 3. Button regression sweep

Script: `node scripts/button_regression_sweep.mjs`

**Result: PASS** — Home, presence cards, tabbar, sign-out, send, join, stop, curate/extend, `data-composition` bound.

`button_open_tags without onClick in open tag = 0`.

Not full Playwright click-through.

---

## 4. Socket 20–30 minute dual-browser

Script: `scripts/socket_lifetime_session.mjs`

| | |
|--|--|
| API health short poll | OK |
| Dual Phoenix clients 20m | **NOT EXECUTED** |
| `productRealtime.getDiagnostics()` timeline | **FOUNDER REQUIRED** |

**Still UNPROVEN.** Quiet UI ≠ stable socket.

---

## 5. Chronology quality fix

Venue moments only when **strongest_id** or **party_size** changes vs last snapshot.  
Place-open only when time context exists.  

Rule in code comments:

> Persist only if removing the moment would make reconstruction of conversation→reality harder.

---

## 6. Group surface (no new chrome)

Home `presenceLines` for groups:

```
Saturday dinner
6 people · around 7:30
Choosing the place
```

`data-composition="group"` on presence blocks. No dashboard / matrix / voting.

---

## 7. Figma mechanical assets

| Frame | Node | File |
|-------|------|------|
| Home | 2:2 | `figma-diff/home-2-2.png` |
| Chat | 3:2 | `figma-diff/chat-3-2.png` |
| Shared Reality | 4:2 | `figma-diff/shared-reality-4-2.png` |
| Curate | 4:11 | `figma-diff/curate-4-11.png` |

CSS moved toward SR plate + Curate field + filament.  
**Exact match: still OPEN.** Need running 390px screenshots beside these frames until residual diffs are intentional.

---

## 8. Residue

`~12 → ~4` remains a **hypothesis**, not a founder-timed KPI.  
One real episode still required.

---

## 9. Still open (honest)

- Browser logout/login scroll proof (UI)  
- Dual-client 20–30m socket diagnostics  
- Pixel Figma closure for all locked surfaces  
- Full Playwright button sweep  
- Founder-measured coordination residue  
- Brilliant = NO  

---

## Founder actions to close proofs

1. `git log -1` confirm `67b4439` or later checkpoint  
2. `mix ecto.migrate` · start API/web · `node scripts/founder_review_seed.mjs`  
3. Login `+12025550101` / `111111`  
4. Friends group → confirm Sam → Home shows 6 people compressed  
5. Scroll chronology → refresh → logout → login → same order  
6. Two browsers 20m → `productRealtime.getDiagnostics()` at 0/5/10/15/20  
7. Side-by-side Figma vs 390px for Home/Chat/SR/Curate  
8. Time one real planning episode for residue  

**DO NOT MERGE.**

# PHASE B.2 PROGRESS HOLD — Principal Major-Diff Closure

**HOLD · DO NOT MERGE · permissionToStartLive = NO · Chats feature tranche NOT STARTED**

Founder URL: `http://127.0.0.1:5173` · vite PID `5197` · api PID `5148` · branch `build/v2-coded-experience-closure` · HEAD `cb1bd43`

No Claude session was found to resume; continued from Phase B.1 evidence in this worktree.

---

## Execution order status

| Step | Item | Status |
|---|---|---|
| B2-01 | Header collision | **PASS** — 0/0/0/0 on 375/390/393/430 |
| B2-02 | 46 legacy `#6ee8f5` leaks | **PASS** — PRODUCTION_LEGACY_BRAND_LEAKS = **0** |
| B2-03 | Search 373:261 | **MINOR_DIFF · FROZEN** — full-column fixed; routing green |
| B2-04 | Direct 254:186 | **Reliable open PASS · visual MINOR_DIFF** — hooks crash fixed; Call/Video gated; Plan WHO=0 |
| B2-05 | Graph Detail 373:385 | **NOT STARTED** |
| B2-06 | Opal 392:2 | **NOT STARTED** |
| B2-07 | Journey 254:280 | **NOT STARTED** |
| B2-08 | Profile 201:10 | **NOT STARTED** |
| B2-09 | Completeness matrix | **NOT STARTED** |

**Phase B.2 is NOT exited.** Remaining MAJOR surfaces: Graph Detail, Opal, Journey (+ Profile/Completeness).

---

## D. HEADER COLLISION

**Root cause:** `.gsh` flex `min-width:auto` locked Home to 390px on 375 viewport (header right overflow); header was `static` so scroll produced `top<0` flags.

**Repair:** `min-width:0` + `width:100%` on `.gsh`; `position:sticky; top:0` on `.gsh-top` without growing height 58; hit 44 / visual 34 unchanged.

**Proof:** all four sizes headerCollision=0 at rest and scrolled. See `HEADER_COLLISION_ROOT_CAUSE.md`.

---

## E. LEGACY BRAND LEAKS

46 `#6ee8f5` in `styles.css` classified **A** and replaced with semantic tokens (`var(--accent)`, `--color-signal`, `--color-motion`, `--color-memory`, `--color-possibility`) + `:root --accent:#00e5ff`. One inline `OpalApp.tsx` leak also fixed.

**PRODUCTION_LEGACY_BRAND_LEAKS = 0**

---

## F. SEARCH

Before MAJOR (relative sheet) → After **MINOR_DIFF** full-column `position:fixed` 390×844; dock visible; Back/Home-root PASS; mobile green. Frozen.

---

## G. DIRECT

Before MAJOR (could not open / crashed) → After:

- Open via production Chats row → `member-conversation` `254:186`
- Call/Video present, dependency-gated
- Plan present; **WHO picker openings = 0**
- pageErrors 0

Visual still founder-reviewable MINOR_DIFF (not forced EXACT). See `DIRECT_254_186_CLOSURE.md`.

---

## Frozen preservation (unchanged)

Brand V4 primitives · 160:2 · 161:3 · 568:2 · Splash/Promise/Home/Stories · Search magnifier · Needs You pulse · dock REST/TOUCH/LISTENING · Forward overlay fixes · **+ Search 373:261 after B2-03**

---

## Next (strict order)

**B2-05 Graph Detail 373:385** — replace bottom-sheet presentation with full-screen authority; same Reality lineage; no second Graph owner.

Then STOP for founder walk of completed slices if desired before continuing Opal/Journey.

**DO NOT MERGE. NO LIVE. NO CHATS FEATURE TRANCHE.**

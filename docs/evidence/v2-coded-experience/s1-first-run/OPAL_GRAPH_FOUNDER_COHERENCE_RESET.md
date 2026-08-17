# OPAL GRAPH — FOUNDER COHERENCE RESET

**HOLD. DO NOT MERGE.**  
**Do not start generic S2.**

---

## 1–2. Baseline

| Item | Value |
|------|--------|
| Branch | `build/v2-coded-experience-closure` |
| Pre-change product SHA | `93bbf8a` |

---

## 3–5. Mismatch and correction

### Exact mismatch

S1/S1.1 landed:

`FR09 217:354 → legacy authenticated Home` (`home-living-field` / attention shell, historical `2:2`)

Figma locks:

`FR09 217:354 → 201:5` (via `217:393` / `217:392` / `217:396`)

### Proof of prior wrong landing

- `HomePane` previously rendered `data-testid="home-living-field"` / `data-node-ref="2:2"` for authenticated members.
- S1 return package explicitly stated: “existing authenticated Home (not 201:5 continuum).”

### New FR09 destination

Authenticated `tab === "home"` now renders **`GraphSocialHome`** with:

- `data-testid="graph-social-home"`
- `data-figma-home="201:5"`
- `data-member-home="201:5"` on member shell

---

## 6–7. Figma authorities used / ignored

### Used (precedence)

| Node | Role |
|------|------|
| `201:2` | Visual convergence final |
| `217:2` | First-run only |
| `217:393` | First-run route lock ending in `201:5` |
| `201:5` | Member Home |
| `155:2` | Behavior/routing meaning |
| `159:2` / `168:2` | Brand / exact PNG |
| `145:46` | Endless-scroll continuation seam under seed |

### Explicitly not final visual destination

| Node / surface | Status |
|----------------|--------|
| Legacy Home `2:2` attention shell | Demoted; only unauthenticated fallback / continuation block |
| Historical `191` / old `145` chrome | Behavioral meaning kept where relevant; visuals → `201` |

---

## 8–9. First-run motion

- FR00 splash: staged Motion for symbol → wordmark → tagline → tap (reduced-motion = instant)
- FR01–FR09 keep AnimatePresence step transitions
- Respects `prefers-reduced-motion`

---

## 10–13. Final Home `201:5`

### Implementation

- `apps/opal_web/src/opalUi/GraphSocialHome.tsx`
- `apps/opal_web/src/opalUi/founderGraphSeed.ts`
- Assets: `apps/opal_web/public/figma-v2/home-201/*` (icons + Chanelle/Maya media from Figma export)

### Home data source

1. **Founder seed** (default local/dev): Chanelle Graph, Maya Memory, Near You — same card components production will hydrate.
2. **Live continuation** (`145:46`): existing AttentionAuthority presence / awaken cards appended below seed when server signals exist.

Internal tag: `founder-graph-seed-v1` via `data-founder-seed`.

### Endless scroll

Seed window + live continuation seam implemented. Full ranked refill algorithm remains future work on `145:46` behavior — not fake infinite filler.

---

## 14–18. Other final screens (status)

| Screen | Node | Status this tranche |
|--------|------|---------------------|
| WHO | `201:6` | Existing WHO-FAST-PATH sheet retained (intelligence); visual rewrite progressive |
| People | `201:7` | Chats/People tab retained + realtime messaging |
| Live | `201:8` | Home Live filter + founder Live card; full Live destination progressive |
| Journey | `201:9` | Plans tab retained (145:241 behavior) |
| Profile | `201:10` | You tab retained; photo still deferred (S1.1 Option B) |

P1 was Home landing. Remaining visual replacements are deferred explicitly — not claimed complete.

---

## 19–21. Actions / dead controls / location

| Control | Behavior |
|---------|----------|
| I'd go | → real `handleMomentWantThis` / WHO path |
| Check it out | → Plans tab (near/local world seam) |
| Memory card | → You tab |
| Graph/Live/Memory chips | Filter seed feed |
| Create dock | Still deferred (`CREATE_DOCK_EXPOSED=false`) |
| Call / Video | Not exposed as active (no dead tap) |
| Add photo | Still deferred (S1.1) |

Location: Vista chip uses label prop (default “Vista”); real geolocation not claimed.

---

## 22–25. Regressions

- Brand `168:2` still on Home chrome via `OpalMark`
- Auth / FR06–FR09 unchanged authority
- P31 / WHO-FAST-PATH handlers preserved
- S1.1 Level 5 harness still runnable

---

## 26–31. Smoke / defects / opts

| Item | Result |
|------|--------|
| Defect found | FR09 → legacy Home |
| Defect repaired | FR09 → `201:5` GraphSocialHome |
| Optimization | Splash motion sequenced; Graph chip default accent |
| Local tests | See commit CI note |
| Console | No new intentional errors |

---

## 32–35. SHA / CI / dirty tree

Fill after commit:

- Product SHA: _(post-commit)_
- Remote CI: _(dispatch if path-filtered)_
- Dirty tree: unrelated brand/media may remain unstaged

---

## 36. Explicitly deferred

- Full WHO `201:6` visual rebuild
- Full People `201:7` visual rebuild  
- Full Live destination `201:8`
- Journey `201:9` visual rebuild
- Profile Graph+Memories `201:10` visual rebuild
- Durable profile photo
- Production ranked endless refill beyond continuation seam
- Calling / video

---

## 37. Founder walk

1. Cold open → splash motion → Tap to begin  
2. FR01–FR09  
3. After Not now / contacts → **must see 201:5 Home** (“See what your people are up to.”)  
4. I'd go → WHO sheet (real)  
5. Live chip → live seed card  
6. People / Plans / You still work  
7. Brand mark exact Opal Graph  

---

## 38. HOLD

**Coherence P1 (wrong Home) fixed.**  
**HOLD for founder walk.**  
**Do not merge. Do not open unrelated expansion.**

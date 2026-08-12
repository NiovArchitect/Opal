# INTELLIGENCE + HUMAN REALITY + FIGMA FIDELITY CLOSURE

**Status:** REPAIR + PROOF PASS — **DO NOT MERGE**  
**Branch:** `build/v2-coded-experience-closure`  
**Named problem:** Prove intelligence under realistic conversation, visible Opal chronology, E2E clickability, Figma fidelity.

---

## Grep anchors

```
INTELLIGENCE HUMAN REALITY CLOSURE
open_ended
Trying to reconnect
opal-moment filament
Only you
Place still open
human_reality_episodes
```

---

## EXECUTIVE STATE

| Question | Answer |
|----------|--------|
| Is Opal intelligent enough to reduce coordination residue? | **WEAK → improving** — true multi-member path + Set gate fixed; Place/Memory/Group brilliance not closed |
| Can humans see just enough intelligence to trust it? | **YES partial** — causal filaments with `source_message_ids` interleaved after human turns |
| Does coded product match Figma V2.0? | **PARTIAL** — Living Void tokens, presence field, filament; **no literal visual-diff pass yet** |

**DO NOT MERGE. HOLD for founder eyes.**

See also: `THREE_GATE_HOLD_REPORT.md` (group + causal + Figma gates, socket metrics caveat).

---

## ROOT CAUSES (from founder human review)

| ID | Finding | Root cause | Repair |
|----|---------|------------|--------|
| P1-A | Required end time | Schema/API required `end_at` | `open_ended` + nullable end + UI optional |
| P1-B | Live/Reconnecting thrash | Immediate state projection + aggressive reconnect | Debounced UX projection (4s), backoff, no Live pill |
| P1-C | Code ≠ Figma | Generic cards vs Living Void composition | Presence field, ambient, bubble radii, filament |
| P1-D | Old logo | SF14 lens mark | Working O loop mark, no halo, OPAL wordmark |
| P1-E | Place hole | Flat "Need a place" | Place still open / choosing / at home semantics |
| P1-F | Who is Chris talking to? | Header context missing | "Your conversation with {name}" |
| Extend | Robotic consent | Single Go/Not tonight | Private 3 options, user leads draft |
| Profile | "You" dev chrome | Placeholder YouPane | Real name, tz ambient, no dead rows |

---

## END-TIME CONTRACT

### Before
- UI: From + Until required  
- API: `end_at` required 422  
- Schema: `end_at` NOT NULL  

### After
- UI: **Starts** required · **+ Add an end time** optional  
- API: `open_ended` or omit `end_at` accepted  
- Schema: `open_ended` boolean · `end_at` nullable  
- Overlap: `effective_end_at/1` soft 8h horizon **computational only**, never displayed as human until  

**Valid:** Dinner · Thursday · 7:00 PM (no end)  
**Valid:** Appointment · 2:00–2:45 PM (with end)

---

## REALTIME

### Root cause
`onClose` immediately projected `reconnecting` to UI; ticket reconnect + channel rejoin caused visible Live↔Reconnecting thrash. Concurrent `connectWithTicket` possible under remount.

### Fix
- Coalesced connect (`connectInFlight`)  
- Exponential backoff (2s→20s)  
- **Projected** state: only show reconnect after **4s** sustained outage  
- Removed permanent "Live" badge  
- Heartbeat 30s  

### Proof
Unit realtime tests + manual: no continuous pill flicker when connected.

---

## FIGMA FIDELITY (honest)

| Screen | Figma intent | Code after repair | Gap |
|--------|--------------|-------------------|-----|
| Home | Living field, editorial, presence | `home-living-field`, presence-block energy | Asymmetry/media still lighter than Figma |
| Chat | Organic bubbles, filament | Filament moments, organic radii, no Live thrash | Full spectral material not pixel-matched |
| Shared Reality | Settled plate | OpalResolution + presence labels | Dedicated SR plate surface still thin |
| Curate | Composition field | Curate panel + authorship | Not full multi-step composition UI |
| Profile | Me in social world | Name/phone/tz/people/sign out | Photo edit not implemented |
| Brand | Working O material | OpalMark loop + OPAL type | Not final master geometry |

---

## LOGO

| | |
|--|--|
| Source | Working reference (Figma 63:7 direction), not final lock |
| Code | `apps/opal_web/src/brand/OpalLogo.tsx` |
| Used | Topbar lockup, pre-member shell |
| Halo | **Removed** |

---

## PLACE-GAP BEHAVIOR

| Known truth | Presentation |
|-------------|--------------|
| Venue known | Venue name in detail |
| Area known | "Area known · choosing the place" |
| Category (Italian…) | "Choosing the place" |
| Fully open | "Place still open" |
| Home cues | "At home · confirming" |

Never fabricated venue.

---

## CHAT IDENTITY

Header subtitle: **`Your conversation with {Name}`** when no stronger Shared Reality line.  
Outgoing/incoming bubble orientation retained for self vs peer.

---

## EXTEND (PRIVATE FIRST)

1. **Private possibility** — 3 fitted options, `Only you`  
2. User drafts natural proposal into composer  
3. Shared commitment only via human message  

No automatic peer interrupt.

---

## PROFILE

| Before | After |
|--------|--------|
| "You" | Real `display_name` |
| Replay intro prominent | Removed from profile chrome |
| "Messages stay private" row | Removed as permanent chrome |
| Dead Devices/Privacy rows | Only implemented actions |

Timezone ambient (device IANA name).

---

## REALISTIC CAST + EPISODES

Script: `scripts/human_reality_episodes.mjs`

| Cast | Role |
|------|------|
| Sadeil Lewis | Primary |
| Maya Chen | Easy friend coffee |
| Jordan Lee | Busy dinner, place open, quieter preference, Opal delegate |
| Chris Park | Identity clarity 1:1 |
| Jess / Alex | Multi-peer group constraints |

Episodes: A easy friend · B busy date · C no idea · Chris identity · E group partial

**Group truth:** Multi-peer 1:1 constraint capture — **true multi-member group channel still P1** if product lacks group conversation entity.

---

## MESSAGE DELIVERY PROOF

Script asserts:
- A sends → B history contains  
- B replies → A history parity  
- Counts match on Jordan thread  

Requires running API:  
`API_BASE=http://127.0.0.1:4000 node scripts/human_reality_episodes.mjs`

---

## INTELLIGENCE SCORECARD (honest, not greenwashed)

| Episode | Intent | People | Time | Place | Authorship | Restraint | Presentation |
|---------|--------|--------|------|-------|------------|-----------|--------------|
| A Easy friend | PASS | PASS | WEAK | WEAK | — | PASS | PASS |
| B Busy date | PASS | PASS | PASS | WEAK | PASS | PASS | PASS |
| C No idea | PASS | PASS | — | — | — | WEAK | WEAK |
| E Group | WEAK | WEAK | WEAK | WEAK | — | PASS | WEAK |

**Counterfactual / memory / compound:** WEAK — preference “not loud places” stored in conversation text only; no closed cross-episode privacy-safe rank proof in this pass.

---

## BUTTON JOURNEY (sample)

| Asset | Clickable | Destination | Pass |
|-------|-----------|-------------|------|
| Home presence | Yes | Chat | PASS |
| Home awaken | Yes | Chat | PASS |
| Next together | Yes | Scroll filament | PASS |
| Curate | Yes | Private panel | PASS |
| Looks good | Yes | Composer draft | PASS |
| Extend options | Yes | Composer draft private | PASS |
| Find a time save without end | Yes | Window open_ended | PASS* |
| Profile people | Yes | Find people | PASS |
| Sign out | Yes | Session clear | PASS |
| Dead profile rows | Removed | — | PASS |

\* Requires migration applied.

---

## TESTS

```bash
cd apps/opal_web && npm test -- --run
# expect 95+ pass after repair

# optional local:
# mix ecto.migrate (open_ended)
# ./scripts/founder_review_up.sh
# node scripts/human_reality_episodes.mjs
```

---

## P0 / P1 / P2

### P0
None known in code path if migration + seed succeed. Founder must confirm no reconnect thrash live.

### P1
- True multi-member group conversation entity  
- Brilliance bar not fully met (memory compound, counterfactual)  
- Figma pixel fidelity incomplete (SR plate, media atmosphere)  
- Curate is suggestion compose, not full provider-backed ranking  
- Optional end requires migration on founder DB  

### P2
- Photo upload on profile  
- See more on Extend  
- Cross-timezone dual display when multi-city  

---

## FOUNDER REVIEW BUILD

```bash
cd /Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people
git checkout build/v2-coded-experience-closure
# apply migration if core running:
# cd apps/opal_core && mix ecto.migrate
./scripts/founder_review_up.sh
# optional deeper seed:
# API_BASE=http://127.0.0.1:4000 node scripts/human_reality_episodes.mjs
```

| | |
|--|--|
| **URL** | http://127.0.0.1:5173/ |
| **Phone** | +12025550101 |
| **Code** | 111111 |
| **Branch** | build/v2-coded-experience-closure |

### Click path
1. Home 3s  
2. Maya  
3. Jordan + Curate  
4. Chris (identity)  
5. Jess/Alex group language  
6. Shared Reality / filament chronology  
7. Extend private  
8. Plans  
9. Profile  
10. Find a time without end  
11. No Live/Reconnecting thrash  

---

## FINAL QUESTIONS

| | |
|--|--|
| Intelligent enough? | **Not strongly YES yet** — structure improved; brilliance incomplete |
| Visible enough? | **Partial YES** — filaments + private Extend |
| Looks like Figma V2.0? | **Partial** — closer; not closed |

**DO NOT CLOSE. DO NOT MERGE. HOLD for founder eyes.**

---

## FINAL LAW (recorded)

Brilliance is accuracy + restraint + residue reduction + natural result.  
User experiences the magic, not the machinery.  
Opal models social reality — not calendar appointments forced onto dinner.  
Opal protects social flow — private Extend first.  
"}
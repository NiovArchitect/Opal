# Dark Technicolor Opal — founder review package

**Branch:** `experiment/dark-technicolor-opal`  
**PR:** #53 OPEN — **do not merge until founder reviews actual visuals**  
**Status:** Design experiment only. **Not production.**  
**Does not alter** walkthrough copy, pre-member shell, Join flow, or Phase 3 intelligence.

---

## Principle

Classic Technicolor inspires **rich color separation and cinematic contrast**, not vintage-film cosplay or rainbow chrome.

```text
Human conversation = calm depth
Opal intelligence + real-world movement = luminous semantic light
```

Strongest production hypothesis:

> **Human conversation stays calm. Opal’s intelligence and real-world movement become luminous.**

Better than applying saturated color indiscriminately across the whole application.

---

## Semantic color system (hypothesis)

| Moment | Visual role | Token |
|--------|-------------|-------|
| Becoming a plan | luminous cyan | `--tc-recognition` `#3EE0F0` |
| Still open | amber | `--tc-participation` `#F0B429` |
| Keep private | violet | `--tc-private` `#A78BFA` |
| Reservation requested | electric blue | `--tc-execution` `#3B82F6` |
| Table held | warm amber with urgency | `--tc-urgency-hold` `#F59E0B` |
| Booked / Handled | emerald | `--tc-completion` `#10B981` |
| Failure or expiring hold | controlled red | `--tc-risk` `#E85D5D` |
| Neutral human-system support | warm white / soft silver | `--tc-human` `#F2EDE6` |

**Do not lock mappings without accessibility + founder review.**

Every state requires:

1. **Text** label  
2. **Accessible name**  
3. **Shape or icon mark**  
4. **Color as reinforcement only**

---

## Same-screen comparisons

Interactive local review (identical dimensions and content per variant):

```text
apps/opal_web/public/experiments/technicolor-review.html
```

Serve via `apps/opal_web` dev/preview and open `/experiments/technicolor-review.html`.  
Toggle **A / B / C** without changing copy, IA, or behavior.

### Required surfaces covered

| Surface | In review page |
|---------|----------------|
| Walkthrough final screen | Yes |
| Authenticated Home | Yes |
| Empty Chats | Yes |
| Populated Chats | Yes |
| Quiet human conversation | Yes |
| Becoming a plan | Yes |
| Still open | Yes |
| Reservation requested | Yes |
| Table held | Yes |
| Booked | Yes |
| Handled | Yes |
| Keep private | Yes |
| Plans | Yes |
| You | Yes |

Opt-in product CSS/tokens (not wired as default theme):

- `apps/opal_web/src/experiments/technicolorTokens.ts`
- `apps/opal_web/src/experiments/technicolor.css` (`body[data-theme="technicolor-a|b|c"]`)

---

## Variant A — Controlled cinematic (**preferred production starting point**)

**Principle:** Current refined dark shell remains dominant. Technicolor appears primarily in Opal moments, important actions, experience state, and limited navigation accents. Human conversation remains neutral and calm.

| Dimension | Assessment |
|-----------|------------|
| Distinctiveness | Enough separation for Opal moments without rebranding the whole shell |
| Restraint | Highest — lowest long-session risk |
| Human chat | Unchanged calm bubbles |
| Risk | May feel subtle if under-applied; solvable by slightly stronger moment borders |

**Strengths:** premium, distinct, safe, matches product truth  
**Reject if:** founder wants social energy first over calm depth

---

## Variant B — Social spectrum

**Principle:** More color in navigation, participant accents, journey state, and experience context. Human text readable. Avoid loud permanent colors on people.

| Element | Borrow into A? |
|---------|----------------|
| Active tab cyan glow | **Yes** (subtle) |
| Journey chip amber border | **Yes** (moments only) |
| Soft fill behind moments | Optional light fill on A |
| Permanent person colors | **No** — childish / gamified risk |

**Strengths:** social energy, memorability  
**Risks:** navigation color competes with content; identity accents

---

## Variant C — Full cinematic future (**reference limit**)

**Principle:** Push saturation and cinematic separation deliberately to discover the upper boundary.

| Risk | Observation |
|------|-------------|
| Fatigue | High — ambient gradients + multi-hue moments |
| Noise | High — shell itself competes with conversation |
| Accessibility | Higher pressure on contrast + OLED smear |
| Conversation competition | Human bubbles risk secondary visual weight |
| Premium character | Can tip into neon/gaming if not tightly controlled |
| Brand memorability | High, but not “premium calm social” |

**Do not recommend C merely because it is visually dramatic.**  
Use as a ceiling: production subset must stay well below C.

---

## Accessibility

| Gate | Variant A | Variant B | Variant C |
|------|-----------|-----------|-----------|
| WCAG contrast on body text | Pass (warm white on depth) | Pass | Pass if human text not recolored |
| Semantic color-only state | Fail-safe: labels + marks required | Same | Same |
| Deuteranopia / protanopia | Cyan/amber/violet remain shape+label backed | Same | Same — red/green risk mitigated by marks |
| Tritanopia | Blue/amber still differentiated by label | Same | Same |
| Grayscale comprehension | Labels + marks carry state | Same | Same |
| Large text / 200% zoom | Layout independent of color | Same | Same |
| Small mobile width (390) | Review page phones at 320–390 | Same | Same |
| Reduced motion | Glow disabled via `prefers-reduced-motion` | Same | Ambient still static |
| OLED dark smearing | Low (thin glows) | Medium | Higher ambient risk |
| High saturation fatigue | Low | Medium | High |
| Long-session chat readability | Best | Good if chat neutrals held | Weakest |

**Do not approve a treatment that only works in screenshots.**

---

## Long-session risks

| Risk | Mitigation |
|------|------------|
| Neon fatigue | Prefer A; cap glow radius |
| Color-coded people | Reject permanent identity rainbows |
| Competing chat chrome | Keep human bubbles production-neutral |
| Moment spam glow | One luminous moment at a time (product restraint) |

---

## Recommended production subset

| Include | Source |
|---------|--------|
| Semantic moment borders + mark colors | A |
| Subtle primary CTA cyan bloom | A |
| Optional active-tab underglow | B (borrow) |
| Full ambient multi-gradient shell | **Reject** (C) |
| Permanent participant neon colors | **Reject** |
| Rainbow fills on every surface | **Reject** |

---

## Elements explicitly rejected

- Indiscriminate saturation across the whole app  
- Color-only state without text/icon  
- Loud permanent person colors  
- Gaming/neon full-shell treatment as default  
- Changing walkthrough copy or Join behavior as part of this experiment  
- Merging experiment branch as production theme without founder visual review  

---

## Founder decision required

| Decision | Options |
|----------|---------|
| Production starting theme | **A (recommended)** / B / custom hybrid |
| Borrow B tab accent into A? | Yes / No |
| Approve any C ambient for marketing only? | Yes / No (default No for product) |
| Lock semantic map after a11y lab? | Pending founder + a11y |

**PR #53 stays OPEN and unmerged until founder reviews actual visuals** via `technicolor-review.html` and/or local `data-theme` opt-in.

---

## How to review locally

```bash
cd apps/opal_web
npm run dev
# open http://localhost:5173/experiments/technicolor-review.html
```

Or open the HTML file directly in Brave for static A/B/C comparison.

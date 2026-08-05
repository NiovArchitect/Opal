# Dark Technicolor Opal — founder review package (corrected)

**Branch:** `experiment/dark-technicolor-opal`  
**PR:** #53 OPEN — **do not merge until founder sees a functional, visibly differentiated study**  
**Status:** Visual experiment only. **Not production.**  
**Does not alter** walkthrough, Join, member shell, Phase 3, SF18, Foundation, or Kafka.

---

## Prior failure (founder-experienced)

Following the old instructions, the founder reached ordinary post-walkthrough Opal. No unmistakable Technicolor treatment was visible.

**Decision recorded:**

> DARK TECHNICOLOR FOUNDER REVIEW FAILED FOR ROUTE, PRESENTATION, OR VISUAL-DIFFERENTIATION REASONS

### Root cause (audit)

| Factor | Finding |
|--------|---------|
| Review asset | Static HTML under `public/experiments/technicolor-review.html` (not SPA) |
| Common failure mode | Opening `http://localhost:5173/` boots the **React SPA** (walkthrough / activation), not the study |
| Prior visual design | Variant A used only subtle border tints — easy to miss even if HTML opened |
| Presentation | Banner/controls insufficiently “this is an experiment” |
| Isolation | Study must not require walkthrough, auth, localStorage, or API |

**Correction:** self-contained study with red experiment chrome, three bold modes, side-by-side compare, and automation markers.

---

## Exact review instructions (do not open bare localhost root)

```bash
cd /Users/genghishameha/Developer/NIOVI-Architect/Opal/apps/opal_web
npm run dev
```

**Exact URL (preferred):**

```text
http://localhost:5173/experiments/technicolor-review.html
```

**Alias redirect:**

```text
http://localhost:5173/technicolor-study.html
```

**Do not open only:**

```text
http://localhost:5173/
```

That is production-like SPA Opal (walkthrough), not the Technicolor study.

---

## Isolation guarantees

The study page:

- is pure static HTML/CSS/JS in `public/`
- does **not** load the React app
- does **not** run walkthrough, activation, session, or member shell
- does **not** call the hosted API
- exposes `data-experiment="opal-dark-technicolor-study"`
- exposes `window.__OPAL_TECHNICOLOR_STUDY__` for automation

---

## Three modes (must be unmistakable)

| Mode | Label | Intent |
|------|-------|--------|
| 0 | **CURRENT OPAL** | Production baseline — calm, no spectral identity |
| 1 | **CONTROLLED TECHNICOLOR** | Credible production direction — spectral Opal moments, cyan tab underglow, CTA bloom — **visibly different** |
| 2 | **FULL TECHNICOLOR** | Upper creative boundary — ambient multi-hue shell, strong spectral edges, bolder navigation |

Keyboard: `1` / `2` / `3`. Layout: **Single** or **Side-by-side**.

---

## Opal cinematic spectrum (not Google)

| Color | Role |
|-------|------|
| Deep near-black | Stage |
| Luminous cyan | Intelligence / recognition |
| Golden amber | Possibility / participation / time sensitivity |
| Deep violet | Privacy / reflection |
| Electric royal blue | Approved execution |
| Rich emerald | Secured / completed |
| Saturated ruby | Urgency / failure |
| Warm ivory | Human clarity |

### Signature behavior

1. **Spectral edge** — multi-channel light separation on Opal intelligence surfaces  
2. **State-dominant color** + secondary separation  
3. **Dark glass body**  
4. **Color follows movement** — quiet chat stays quiet  
5. **Human baseline** — dark, warm, readable; Opal moments are a different material  

---

## Human vs Opal material

| Surface | Treatment |
|---------|-----------|
| Human messages | Dark neutral, warm readable text, minimal saturation |
| Opal moments | Dark translucent body, spectral edge, dominant state color, mark + label text, controlled glow |

Moments covered: Becoming a plan · Still open · Keep private · Reservation requested · Table held · Booked · Handled · Failure/expired · Plans · You · Walkthrough Join · Home · empty/populated Chats · quiet conversation

---

## Motion

- Still open: slow amber pulse (not flash)  
- Full plan: soft spectral settle  
- `prefers-reduced-motion`: static edges only  

---

## Accessibility

- Labels + marks always present (never color-only)  
- Body text warm ivory on near-black  
- Reduced motion respected  
- Mobile-width phones in study (~360 CSS px)  

---

## Founder decision (only after visual proof)

1. Approve **Controlled** exactly  
2. Approve **Controlled** + limited Full atmosphere  
3. Reject / revise  

**Variant “Full” is not the default production recommendation** — it is the upper bound.

---

## Production status

| Item | Status |
|------|--------|
| Merged to main | **No** |
| Live public web | **Untouched** by this experiment |
| PR #53 | **Open — do not merge until founder review succeeds** |

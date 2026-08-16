# Pass 30 — Minimal product match (P30R2)

**Product SHA:** (this commit)  
**Baseline Figma:** P30R2 nodes on `116:2`  
**Verdict:** **HOLD — DO NOT MERGE**  
**Intelligence diff:** **NONE**

---

## Approved directions implemented

| Figma | Product |
|-------|---------|
| `123:3` CTA inline | `SocialMomentCard` desire CTA → `I want to do this →` + `.is-inline` (no full-width outline) |
| `123:17` Solo/people | Fork sheet: Solo / With people / Not now — **equal weight** (no preselect cyan) |
| `123:34` Named neutral | When `earnedNamedPresence(chats)` → Solo / With {Name} / Someone else, all neutral |
| `123:52` After tap | `.is-active` only after human taps named option |
| `124:2` Forming | `RealityFormingSurface`: atmosphere + residue image; **Dinner with X**; still opening; **Where should dinner be?** only |
| `124:17` Settled | Existing V2 Presence / SR plates; no “began as…” copy |
| `124:33` Private impact | `PrivateCreatorImpact` on **You** only — soft wash + sentence |
| `124:45` Follow B | Quiet `·` + inline CTA path |

**Law coded:** `earnedNamedPresence` — context earns **option presence**, never preselection.

---

## Media

Demo assets (founder-review / product match):

- `/demo/moments/food.jpg`
- `/demo/moments/portrait.jpg`
- `/demo/moments/restaurant.jpg`

Moment uses food media for first-second desire test.

---

## Motion

- Fork sheet: existing `momentForkIn`
- Forming: `realityFormIn` + plate rise from Moment path (no spinner / AI sparkle)
- Sequence: interest → fork → (named tap) → forming → place sheet (private curate path)

---

## Language guards

Rejected still: mine/yours, recompose philosophy, `began as … Moment`, FORMING/WHERE as schema string tokens in product sources.

---

## Figma ↔ product intentional deltas

| Topic | Difference |
|-------|------------|
| Settled 4:2 plate full screen | Product uses live presence/plan cards for durable SR; full atmospheric plate may refine with live data |
| Transition polish | Motion tested live; static Figma still reference |
| Named person | First name from real chats, not hard-coded “Jordan” only |

---

## CI law

This product commit must report its **own** remote Intelligence Gate. Do not cite `f6a4c49` / `312b36d` as product proof.

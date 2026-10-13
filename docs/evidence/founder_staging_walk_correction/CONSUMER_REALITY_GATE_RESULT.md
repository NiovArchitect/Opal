# Consumer Reality Gate — RESULT (Phase 1 automation)

**At:** 2026-10-13T11:26:48.585Z  
**Tip under test:** `3ccbf48c`  
**Repo HEAD at report:** `3ccbf48c`  
**Base:** `http://127.0.0.1:5173` (tunnel: `https://economies-brunswick-band-penguin.trycloudflare.com`)  
**Overall:** **GATE_GREEN** (42/42 checks)  
**PASS2_UNLOCKED:** NO  
**TRACK_B_TOUCHED:** NO  
**Memory / relationship inference:** NOT activated  

## Gate verdicts

| Gate | Verdict |
|------|---------|
| G0 Preconditions | GREEN |
| G1 First 60 seconds | GREEN |
| G2 Meet → Home | GREEN |
| G3 Center companion | GREEN |
| G4 Two-user shared moment | GREEN |
| G5 Settings trust | GREEN |
| G6 Tech leak = 0 | GREEN |
| G7 Reality consistency | GREEN |

## What automation proved

### G1 — First 60 seconds
- Splash present; wordmark alpha ratio ~0.78 (transparent on dark)
- Tagline: TALK. ALIGN. GO.
- Meet conversational name turn; permissions deferred
- Assist execution claim hidden; Remember chip absent
- No tech leak on splash

### G2 — Meet → Home
- Meet completed through turns → member shell (`completed:ready`)
- Home after Meet is **not** "Your day has room." day shell (`dayRoom=0`)
- Social Home ownership holds (joined something, not setup wizard)

### G3 — Center
- Presence capped at 56×56
- Life-context copy present; no Remember chip; no tech leak
- Companion-scale, not ChatGPT+mascot takeover

### G4 — Two-user moment (thesis)
- Walk A ↔ Walk B direct conversation created (`ace99adc-db67-4258-9d95-f612246c6c84`)
- A sends (201) → B receives → B replies (201) → A sees reply (17 msgs)
- Both list the conversation
- Evidence: `shots/founder_staging_walk_correction/reality_gate/G4_TWO_USER.json`

### G5 — Settings trust
- You hub + Appearance / Notifications / Account: no tech leak
- Appearance Light applies (`theme=light`)
- Visible settings have working behavior paths

### G6 — Technical leak = 0
- Attention scan clean
- Static consumer paint scan: 0 raw leak hits (inventory/guard strings remain unpainted)

### G7 — Reality consistency
- Seed OFF: `attr=off`, no fixture DOM (`seedDom=0 seedOnPaint=0`)
- Cross-surface Home / Chats / Graphs / You / Center leak-clean
- Day shell may appear on Center (correct owner); not on Home
- Note: real Fort Oak history for Walk A under seed OFF is prefer-real, not fixture leakage

## Evidence

- Directory: `shots/founder_staging_walk_correction/reality_gate/`
- Machine JSON: `shots/founder_staging_walk_correction/reality_gate/REALITY_GATE.json`
- Harness: `apps/opal_web/scripts/_consumer_reality_gate.mjs`
- Spec: `docs/evidence/founder_staging_walk_correction/CONSUMER_REALITY_GATE.md`
- Run log: `shots/founder_staging_walk_correction/reality_gate/RUN3.log`

## Phase 2 — Founder feel walk (ONLY now)

Automation is **GATE_GREEN**. Founder judges emotional/product side only.

### Staging URLs (ephemeral Cloudflare tunnel)

**Social / seed ON (member feel):**  
https://economies-brunswick-band-penguin.trycloudflare.com/?opal_founder_seed=1&opal_native_host=1

**Fresh Meet (first-run):**  
https://economies-brunswick-band-penguin.trycloudflare.com/?opal_reset_first_run=1&opal_holy_shit=1&opal_native_host=1

**Reality mode (seed OFF):**  
https://economies-brunswick-band-penguin.trycloudflare.com/?opal_native_host=1&opal_founder_seed=0

### Five questions (do not retest automation)

1. **Why does Opal exist?** Can someone answer without being told?
2. **Did I join something?** Belonging vs setup wizard.
3. **Does Opal feel like a relationship layer?** Companion inside my life.
4. **Did I create a shared moment?** The magic (two people).
5. **Do settings create trust?** Why would I touch this?

### What NOT to retest
- Splash alpha math, Remember/Assist absence, settings blockedReason paint
- Center 56px box, theme localStorage unit path
- A↔B message API round-trip already proven
- Tech-leak string scans
- Seed OFF fixture DOM absence

### Hard stops still active
- Do **not** unlock Pass 2
- Do **not** add memory / relationship inference
- Do **not** expand AI behavior based on this gate alone

**Opal understands the user journey before it tries to understand the user.**

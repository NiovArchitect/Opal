# Investor Touch Acceptance

**Authority:** Founder physical iPhone walk — per `docs/authority/OPAL_NON_REGRESSION_PRESERVE_EXTEND_COMPOUND.md`
**Not authority:** Automated test counts, isolated route proofs, or “technically green” slices

Evidence hierarchy (binding — a green test never overrules an observed failure):

1. Founder phone reality
2. Runtime evidence (screenshots / traces from those walks)
3. Automation
4. Comments / docs

**Repair baseline tip:** `aeb3a41e`
**Checklist tip:** `aeb3a41e` (update after each push)
**Branch:** `muse/repair-11`
**Classification:** P0 foundation infrastructure GREEN · Consumer experience coherence HOLD
**Freeze:** HOLD until this checklist is founder-signed
**Pass 2:** LOCKED

**At this stage: do not expand features. Do not unlock Pass 2. Do not add more intelligence.**
Finish the emotional loop first.

---

## Two gates (do not conflate)

### Engineering truth

- tests pass
- APIs respond
- permissions exist
- state machines work
- backend wiring exists

### Human truth

- “I know what to do next.”
- “I trust what Opal is telling me.”
- “I understand why this exists.”
- “I feel like Opal helps me, not like I’m configuring software.”

Investor standard:

> Does a new human understand, trust, and emotionally connect with Opal in five minutes?

**164/164 vitest is not the stopping point.**

---

## The five-minute product loop

Everything else is built on whether this moment works:

**Meet Opal → connect one person → have a conversation → see Opal help → feel the Graph forming → trust the system.**

That loop is the product.

---

## Founder walk URL

Hard-refresh Safari or force-quit Expo after every Vite tip move.

```
http://192.168.86.156:5173/?opal_founder_seed=1&opal_native_host=1&opal_reset_first_run=1
```

Confirm served tip matches branch tip before starting.

---

## Hostile consumer walk (not a casual tour)

Try to break it. Focus hardest on the areas most likely to still fail.

### 1. Splash — one lockup, true counters

- [ ] Exactly one Opal character / one lockup renders (no collage, no second logo layer, no residual old wordmark)
- [ ] O / P / A counters show the midnight background (no white filled holes — including the big-O ring counter)
- [ ] Character does not look pasted into the letters
- [ ] Splash emotionally correct — a stranger feels “something alive,” not “a setup screen”

### 2. First 60 seconds — investor moment

Splash → Opal → permissions → name → first person.

A stranger should think:

> “Oh, this is a social intelligence layer.”

They should not think:

> “I am filling out setup screens.”

Watch for: too much text · unclear purpose · repeated explanations · technical language · permission anxiety.

- [ ] First 60 seconds understandable as social intelligence (not setup forms)
- [ ] Permission copy is benefit-first; no internal “You” navigation language
- [ ] Selected / Allowed is unmistakably positive (brand glow + check — never muted-as-failure)
- [ ] Declined / Not now is calm; browser contacts fallback feels intentional

### 3. First connection — heartbeat / magic moment

The magic is not “Account created.”
The magic is: **“I connected with someone I actually know.”**

Choose Chanelle (or a real person).

- [ ] First connection created and feels meaningful
- [ ] Identity committed before friend flow (name → handle resolved → handle committed; no late username collision, no dead Accept)
- [ ] No frozen Continue; no stacked compressed bubbles
- [ ] Transition feels natural into chat / call / graph / shared context
- [ ] Does **not** feel like a contact-import tool

### 4. Chat feels alive

- [ ] Send a message in the Chanelle thread → it appears **below** older messages, never above (FL-R7-005)
- [ ] Open a shared plan from chat → Back returns to the **Chanelle chat**, not Graphs (FL-R7-004)
- [ ] Bubbles never stack compressed; timestamps read naturally
- [ ] Chat becomes more valuable than a messenger because context accumulates with restraint (“Opal helped,” not “Opal is watching”)

### 5. Call works

- [ ] Start a call from a chat → call surface opens, other side rings
- [ ] Mute / speaker / video toggles respond; ending the call returns cleanly to the chat
- [ ] No dead call buttons; no stuck “connecting” state with no way out

### 6. Keyboard-open composer on every input surface (`KEYBOARD_SAFE`)

A mobile app lives or dies here. Remains PARTIAL until these pass on device.
For **each** surface: tap the input → keyboard opens → input stays visible above keyboard and dock → type and send → dock returns correctly on dismiss.

**Chat thread**

- [ ] Tap composer → keyboard opens, composer rides above keyboard (never hidden behind it)
- [ ] Dock hides while typing, returns after dismiss
- [ ] Thread scrolls independently above the keyboard; latest bubble reachable
- [ ] Focus does not yank scroll position; no scroll trap

**Center** (must feel like talking to a companion — conversation, not form submission)

- [ ] Same keyboard / composer / dock checks as Chat
- [ ] Response area scrolls; composer stays reachable
- [ ] Typing feels like conversation, not form submit
- [ ] Type 5–10 lines → text stays inside the composer, never escapes the shell (FL-R7-003)

**Search People**

- [ ] Search field not under dock or keyboard
- [ ] Results appear above keyboard
- [ ] Fixed header + list + dock do not corrupt confidence

**YOU inputs (Edit Profile)**

- [ ] Name / handle fields scroll into view above the keyboard
- [ ] Save confirms against the server (no fake success); error shows an actionable message

### 7. Center feels intelligent (honest)

Fake capability destroys trust. Opal does the opposite.

Ask: **“Help me plan something this weekend.”**
(Also: “Help me plan dinner Saturday.”)

- [ ] Center feels intelligent
- [ ] Helps find / narrow options; asks what you want next
- [ ] Does **not** claim “I booked your reservation” (or any external action that did not happen)
- [ ] Future real actions (OpenTable, calendar, pay, rides, tickets) stay behind real permissions when they exist

**Ledger regression probes** (every `docs/evidence/failure_ledger/FAILURE_LEDGER.md` failure mode, reproduced by hand):

- [ ] FL-R7-001 — After a successful Nighthawk result, ask “Arrange dinner at Nighthawk in Coronado.” → resolves the venue, never generic chat fluff
- [ ] FL-R7-002 — Then ask “Find three Mediterranean restaurants in Coronado.” → fresh discovery; does not inherit Nighthawk / Friday / exact-entity scope
- [ ] FL-R7-006 — “Let's arrange dinner Friday.” with no Home card → produces a usable planning flow
- [ ] FL-R7-007 — Cuisine discovery → copy never invents “Friday”/“Saturday” when no day was given
- [ ] FL-R7-008 — Plan copy never reads “dinner Friday Friday” (no duplicated day)

### 8. Graphs feel meaningful — accumulated understanding

Not “Does Graphs have data?”
Does Graphs feel like **accumulated understanding**?

Preference in chat · recurring activity · relationship · shared plan · place · interest — without becoming a noisy database dump.

- [ ] Graphs feel meaningful
- [ ] Feels like “Opal understands my world”
- [ ] Does **not** feel like “Opal recorded everything I said”
- [ ] New Chat / search / plan overlays do not bleed into Graphs on tab switch

### 9. YOU feels trustworthy — control plane, not fake toggles

- [ ] Change display name in Edit Profile → save → **force-quit the app** → relaunch → new name on YOU, in chat sender identity, and on other identity surfaces (persistence across relaunch, not optimistic UI)
- [ ] Every toggle / preference visibly persists after relaunch
- [ ] Sign-out path is reachable and honest

### 10. No dead buttons

- [ ] Every button on the walk does something, shows busy, or shows an actionable error — including: Meet Accept / Try another / Continue, permission Allow / Not now, plan-card CTAs, call controls, sheet close controls
- [ ] No button silently swallows a tap

### 11. No visual collisions

- [ ] Composer never underlaps the dock; dock never covers send/input
- [ ] No text overlapping icons, no clipped pills, no stacked compressed bubbles on 390×844 and 430×932

### 12. Cold stranger test (final gate)

Before showing anyone as “investor ready”:

1. Hand the phone to someone who knows nothing about Opal.
2. **Do not prime the category.** Do not say “This is my AI social graph app.”
   Say only: **“I built something. Try it.”**
3. Do not explain the product thesis, features, or what to tap next.
4. Watch where they tap, what they misunderstand, where they hesitate, what they assume happens.
5. Do not correct them.

Their confusion is the product telling you where it still needs work.

Founder watch-points during any walk (including your own):

1. Does Opal feel alive immediately — understands intent, not “has AI”?
2. Does connecting a person feel like bringing someone into your world (not contact import)?
3. Does Chat become more valuable than a messenger because context accumulates with restraint (“Opal helped,” not “Opal is watching”)?
4. Does Center feel like moving life forward — assistant with honesty, not chatbot that fakes bookings?
5. Would you show Graphs and say “Yeah, that feels like me”?

- [ ] Cold stranger completes the five-minute loop without coaching
- [ ] Hesitation points noted (do not argue them away in the moment)
- [ ] No founder narration required for “what to do next”

Stranger notes:

```
Who:     ______________________
Hesitated at: _________________
Assumed: ______________________
Misunderstood: ________________
Would they open it again?: YES / NO / UNSURE
```

---

## Investor-touch scoreboard (human)

Sign only when the hostile walk **and** cold stranger test pass on a physical iPhone.

| Signal | Pass? |
|--------|-------|
| Splash: one lockup, true counters | [ ] |
| First 60 seconds understandable | [ ] |
| First connection created (meaningful) | [ ] |
| Chat feels alive | [ ] |
| Call works | [ ] |
| Center feels intelligent (honest) | [ ] |
| Graphs feel like understanding | [ ] |
| YOU feels trustworthy (persist across relaunch) | [ ] |
| Keyboard-open composer on every input surface | [ ] |
| No dead buttons | [ ] |
| No visual collisions | [ ] |
| Cold stranger completes loop uncoached | [ ] |

**Investor touch readiness:** HOLD until founder signs below.

```
Founder: ______________________
Date:     ______________________
Device:   ______________________
Tip SHA:  ______________________
Cold stranger: _________________
Result:   PASS / NO PASS / HOLD
Notes:    ______________________
```

---

## What engineering already repaired

Repair #11 verification sweep (`muse/repair-11-verify`) — foundation preserved; interaction layer verified/repaired.
Non-regression law held: `CAPABILITY_LOSS=0`, `PRIOR_GREEN_REGRESSIONS=0`, `DEAD_ACTIONS=0`, `FAKE_SUCCESS=0`.

- Fixed dock / independent content scroll — VERIFIED (native-host `position:fixed`, 100dvh shell clip)
- Chat-thread keyboard-open composer rule — REPAIRED (was PARTIAL: no keyboard-open adaptation existed)
- Splash single-lockup runtime — VERIFIED; big-O ring counter alpha — REPAIRED at asset level (wordmark O/P/A counters were already transparent)
- Permission granted visual language (glow + check, never muted) — VERIFIED web + mobile
- Meet identity-before-friend state machine — VERIFIED (commit → friend turn; no late collision; no dead Accept/Continue)
- New Chat / plan / find-people overlay dismiss on tab switch — VERIFIED (dock handler + `dismissHomeChildren`)
- Native profile persist bridge — VERIFIED end to end (Edit Profile → PATCH → DB → `notifyNativeHostSession` → SecureStore → boot `fetchSession` refresh)

From Founder Reality Repair (`bf674242`) — superseded baseline; re-verified above.

If the phone still fails any item above, that item stays RED for investor touch even if tests are green.

---

## After a FAIL

Do not open Pass 2.
Do not add intelligence depth.
Do not expand features.
Repair the failed human interaction layer, re-prove on device (including cold stranger), then return here.

**Freeze remains HOLD until this checklist is founder-signed PASS.**

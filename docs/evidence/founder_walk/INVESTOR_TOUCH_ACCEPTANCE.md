# Investor Touch Acceptance

**Authority:** Founder physical iPhone walk  
**Not authority:** Automated test counts, isolated route proofs, or “technically green” slices  

**Repair baseline tip:** `bf674242`  
**Checklist tip:** `eedf3c69` (update after each push)  
**Branch:** `muse/packet-b-batch-2`  
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

Hierarchy for this stage:

1. Real founder phone  
2. Cold stranger (uncoached)  
3. Runtime evidence / screenshots from those walks  
4. Automated mobile proof  
5. Source comments / test names  

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

### 1. First 60 seconds — investor moment

Splash → Opal → permissions → name → first person.

A stranger should think:

> “Oh, this is a social intelligence layer.”

They should not think:

> “I am filling out setup screens.”

Watch for: too much text · unclear purpose · repeated explanations · technical language · permission anxiety.

- [ ] Splash emotionally correct
- [ ] Exactly one Opal character / one lockup (no collage, no second logo layer)
- [ ] O / P / A counters show midnight background (no white filled holes)
- [ ] Character does not look pasted into the letters
- [ ] First 60 seconds understandable as social intelligence (not setup forms)
- [ ] Permission copy is benefit-first; no internal “You” navigation language
- [ ] Selected / Allowed is unmistakably positive (never muted-as-failure)
- [ ] Declined / Not now is calm; browser contacts fallback feels intentional

### 2. First relationship — heartbeat / magic moment

The magic is not “Account created.”  
The magic is: **“I connected with someone I actually know.”**

Choose Chanelle (or a real person).

- [ ] First connection created and feels meaningful
- [ ] Identity committed before friend flow (no late username collision / dead Accept)
- [ ] No frozen Continue; no stacked compressed bubbles
- [ ] Transition feels natural into chat / call / graph / shared context
- [ ] Does **not** feel like a contact-import tool

### 3. Keyboard torture test (`KEYBOARD_SAFE`)

A mobile app lives or dies here. Remains PARTIAL until these pass on device.

**Chat thread**

- [ ] Tap composer → keyboard opens
- [ ] Input stays visible; no obstruction
- [ ] Can type and send
- [ ] Dock stays correct

**Center** (must feel like talking to a companion — conversation, not form submission)

- [ ] Same keyboard / composer / dock checks as Chat
- [ ] Response area scrolls; composer stays reachable
- [ ] Typing feels like conversation, not form submit

**Search People**

- [ ] Search field not under dock
- [ ] Results appear above keyboard
- [ ] Fixed header + resize + list + dock do not corrupt confidence

### 4. Center honesty test

Fake capability destroys trust. Opal does the opposite.

Ask: **“Help me plan something this weekend.”**  
(Also: “Help me plan dinner Saturday.”)

- [ ] Center feels intelligent
- [ ] Helps find / narrow options; asks what you want next
- [ ] Does **not** claim “I booked your reservation” (or any external action that did not happen)
- [ ] Future real actions (OpenTable, calendar, pay, rides, tickets) stay behind real permissions when they exist

### 5. Graphs — accumulated understanding

Not “Does Graphs have data?”  
Does Graphs feel like **accumulated understanding**?

Preference in chat · recurring activity · relationship · shared plan · place · interest — without becoming a noisy database dump.

- [ ] Graphs feel meaningful
- [ ] Feels like “Opal understands my world”
- [ ] Does **not** feel like “Opal recorded everything I said”
- [ ] New Chat / search overlays do not bleed into Graphs
- [ ] YOU feels trustworthy (control plane, not fake toggles)
- [ ] No visual collisions; no dead buttons on the walk

### 6. Cold stranger test (final gate)

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
| Splash emotionally correct | [ ] |
| First 60 seconds understandable | [ ] |
| First connection created (meaningful) | [ ] |
| Chat feels alive | [ ] |
| Call works | [ ] |
| Center feels intelligent (honest) | [ ] |
| Graphs feel like understanding | [ ] |
| YOU feels trustworthy | [ ] |
| Keyboard / composers usable | [ ] |
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
Result:   PASS / FAIL / HOLD
Notes:    ______________________
```

---

## What engineering already repaired

From Founder Reality Repair (`bf674242`) — foundation preserved; interaction layer repaired:

- Fixed dock / independent content scroll
- Splash single-lockup runtime + flex layout + counter alpha work
- Permission granted visual language
- Meet identity-before-friend state machine
- New Chat / overlay dismiss on dock change
- Native profile persist bridge

If the phone still fails any item above, that item stays RED for investor touch even if tests are green.

---

## After a FAIL

Do not open Pass 2.  
Do not add intelligence depth.  
Do not expand features.  
Repair the failed human interaction layer, re-prove on device (including cold stranger), then return here.

**Freeze remains HOLD until this checklist is founder-signed PASS.**

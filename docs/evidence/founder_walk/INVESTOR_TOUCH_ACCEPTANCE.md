# Investor Touch Acceptance

**Authority:** Founder physical iPhone walk  
**Not authority:** Automated test counts, isolated route proofs, or “technically green” slices  

**Current tip (repair baseline):** `bf674242` on `muse/packet-b-batch-2`  
**Classification:** P0 foundation infrastructure GREEN · Consumer experience coherence HOLD  
**Freeze:** HOLD until this checklist is founder-signed  
**Pass 2:** LOCKED  

---

## Why this file exists

Engineering milestones prove:

- routes exist
- APIs respond
- actions are not fake

Investor touch proves:

> I touched this for five minutes and I understand why this needs to exist.

Those are different tests.  
**164/164 vitest is not the stopping point.** The founder phone walk is the acceptance gate because the remaining failures are human interaction failures.

Hierarchy for this stage:

1. Real founder phone  
2. Runtime evidence / screenshots from that walk  
3. Automated mobile proof  
4. Source comments / test names  

---

## Founder walk URL

Hard-refresh Safari or force-quit Expo after every Vite tip move.

```
http://192.168.86.156:5173/?opal_founder_seed=1&opal_native_host=1&opal_reset_first_run=1
```

Confirm served tip matches branch tip before starting.

---

## Hostile consumer walk (not a casual tour)

Try to break it. Pass only if a stranger’s thumb stays confident.

### 1. Splash — emotional first touch

- [ ] Splash emotionally correct
- [ ] Exactly one Opal character
- [ ] Exactly one wordmark / lockup (no collage, no second logo layer)
- [ ] O / P / A counters show midnight background (no white filled holes)
- [ ] Character does not look pasted into the letters
- [ ] Continue advances to Splash 2; no Skip-intro for new users

**Phone wins.** Automated “BRAND_ALPHA=GREEN” does not override what you see.

### 2. First 60 seconds — understandable

- [ ] First 60 seconds understandable
- [ ] Splash 2 → Phone → OTP path is clear without product jargon
- [ ] Permission bootstrap copy is benefit-first
- [ ] No internal navigation language (“in You”) on first-run screens

### 3. Permissions — selected state obvious

Tap Contacts, Notifications, Location.

- [ ] Selected / Allowed state is unmistakably positive (glow / check / active color)
- [ ] Allowed never looks like a muted disabled failure
- [ ] Declined / Not now is calm and recoverable
- [ ] Browser contacts fallback feels intentional (“type a name”) — not broken

### 4. Meet — identity then magic

Enter **Sadeil** (or your real name).

- [ ] Name saves
- [ ] Handle resolves before first-person (no late username collision after friend flow)
- [ ] Accept / Continue always advances, shows busy, or shows an actionable error
- [ ] No dead buttons
- [ ] Name survives refresh / relaunch (display identity persists)

### 5. First connection — the magic moment

Choose **Chanelle** (or a real person).

- [ ] First connection created
- [ ] No collision weirdness mid-flow
- [ ] No frozen Continue / Accept
- [ ] No stacked / compressed chat bubbles fighting each other
- [ ] Conversation rhythm: prior turns settle; active turn owns focus

### 6. Chats — alive

- [ ] Chat feels alive
- [ ] Messages readable
- [ ] Thread feels like a conversation
- [ ] Call button works from thread chrome

### 7. New Chat — surface ownership

- [ ] New Chat creates without bleeding into Graphs
- [ ] Switching dock tabs dismisses incompatible overlays
- [ ] Search / New Chat / phone sheets do not corrupt dock position

### 8. Keyboard / composer (KEYBOARD_SAFE — intentional break tests)

`KEYBOARD_SAFE` remains PARTIAL until these pass on device.

**Chat thread**

- [ ] Tap message box → keyboard opens
- [ ] Keyboard does not cover the input
- [ ] Dock does not overlap the composer
- [ ] Composer stays visible while typing

**Opal Center**

- [ ] Same keyboard test as Chat
- [ ] Response area scrolls independently
- [ ] Composer stays reachable with keyboard open

**Search People**

- [ ] Search field is not under the dock
- [ ] Results appear above the keyboard

### 9. Center — powerful without pretending

Ask: **“Help me plan dinner Saturday.”**

- [ ] Center feels intelligent
- [ ] Response helps find options / asks what you want next
- [ ] Does **not** claim “I booked your reservation” (or any external action that did not happen)
- [ ] Intelligence feels powerful without fake execution authority

### 10. Graphs / YOU / trust

- [ ] Graphs feel meaningful (relationships / context — not a wrong surface)
- [ ] YOU feels trustworthy (control plane, not a gear drawer of fake toggles)
- [ ] No visual collisions (false borders, overlapping sheets, dock as obstruction)
- [ ] No dead buttons anywhere on the walk

---

## Investor-touch scoreboard (human)

Sign only when every box above is checked on a physical iPhone.

| Signal | Pass? |
|--------|-------|
| Splash emotionally correct | [ ] |
| First 60 seconds understandable | [ ] |
| First connection created | [ ] |
| Chat feels alive | [ ] |
| Call works | [ ] |
| Center feels intelligent | [ ] |
| Graphs feel meaningful | [ ] |
| YOU feels trustworthy | [ ] |
| No dead buttons | [ ] |
| No visual collisions | [ ] |

**Investor touch readiness:** HOLD until founder signs below.

```
Founder: ______________________
Date:     ______________________
Device:   ______________________
Tip SHA:  ______________________
Result:   PASS / FAIL / HOLD
Notes:    ______________________
```

---

## What engineering already repaired (do not re-litigate as “unfixed” without a new phone fail)

From Founder Reality Repair (`bf674242`) — preserved foundation; repaired interaction layer:

- Fixed dock / independent content scroll (shared shell root cause)
- Splash single-lockup runtime + flex layout + counter alpha work
- Permission granted visual language
- Meet identity-before-friend state machine
- New Chat / overlay dismiss on dock change
- Native profile persist bridge (notify host + `/session` refresh)

If the phone still fails any item above, that item stays RED for investor touch even if tests are green.

---

## After a FAIL

Do not open Pass 2.  
Do not add intelligence depth.  
Repair the failed human interaction layer, re-prove on device, then return here.

**Freeze remains HOLD until this checklist is founder-signed PASS.**

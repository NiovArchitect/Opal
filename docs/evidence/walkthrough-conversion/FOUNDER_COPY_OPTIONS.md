# Walkthrough copy correction: three surfaces

**Track C only.**  
**Status:** Founder decision recorded. See `FOUNDER_DECISION_APPROVED.md`.  
**Selected final hook:** hybrid E clarity + A social meaning (approved copy below).  
**Screens 1–4 stay. Only screen 5 changes.**  
**Authenticated dinner-moment copy remains a separate surface.**  
**Docs PR does not deploy source changes.**

---

## Founder correction (locked)

Three different product jobs must not share one copy set.

| Surface | Audience | Job | Question answered |
|---------|----------|-----|-------------------|
| **A. First-run walkthrough** | Never used Opal | Product promise + desire to join | Why does this deserve a place in my life? |
| **B. Phone activation** | Ready to join, needs trust | Reassure at phone entry | Is it safe to continue? |
| **C. Authenticated experience moment** | Already in a conversation | One useful opportunity | What useful thing is taking shape right now? |

Lines such as:

- Opal noticed dinner taking shape.
- This looks promising for the three of you.
- Ready when you are.

belong to **Surface C** (after detection, permission, restraint, collective fit).

They are **not** the final first-run hook for someone who still does not understand Opal.

---

## D. Therapist feedback interpretation

**Product evidence, not abstract brand critique.**

Observed:

- **Private by design** felt unnecessary as a major walkthrough screen.
- **Calm. Human. Yours.** caused confusion.
- The practical meaning and product payoff were unclear.
- The sequence lost final impact.
- User may still ask: What does Opal actually do? Why sign in? Why add friends?

Interpretation:

This is a **comprehension and conversion** failure on the **last screen**, not a request to weaken privacy, ranking rules, or dignity.

**Founder clarification:** the first few walkthrough screens are strong. Only the **final screen** needs the conversion rewrite.

Qualities (privacy, calm, humanity, ownership) are real.

They are **not** the product payoff on the conversion screen.

---

## A. First-run walkthrough

### Keep screens 1–4 (current product, strong)

Source of truth today: `apps/opal_web/src/onboarding/FirstRunExperience.tsx`.

| # | Kicker | Title (keep) | Body intent (keep) |
|---|--------|--------------|--------------------|
| 1 | Opal | Life starts in conversation. | Private social medium for people you actually talk to |
| 2 | Signal | When talk becomes something real. | Dinner spark noticed without turning chat into a form |
| 3 | Momentum | Decide without killing the vibe. | Times and places settle inside the conversation |
| 4 | Follow-through | Moments that actually happen. | Gentle follow-through so plans leave the chat |

By screen 4 the user already has progressive understanding:

conversation → spark → decide → real life.

### Replace screen 5 only (current broken conversion hook)

**Current (remove as final hook):**

- Kicker: Private by design  
- Title: Calm. Human. Yours.  
- Body: No ranking. No pressure. No public feed…

**Why it fails:** abstract qualities, no payoff, no reason to enter a number or invite friends.

### What the user must understand by the end

1. Opal begins with real conversation.  
2. Opal understands what people are talking about.  
3. Opal remembers relevant preferences with permission.  
4. Opal helps the people involved move toward a real experience.  
5. Opal does most of the organizational work.  
6. Opal becomes more useful when people they know join.  
7. Opal stays quiet when it is not useful.  

The final screen must create a strong reason to continue with a phone number.

---

## Final-hook options (screen 5 only)

All options assume screens 1–4 stay.  
Primary CTA candidates are listed under section CTA.

### Option A (Recommended)

| Field | Copy |
|-------|------|
| Kicker | Join |
| Headline | Turn conversation into a life you actually share. |
| Support | Opal helps you and your people carry plans forward. Bring them in. |
| Communicates | Conversation → real shared life; social network effect |
| Emotion | Warm resolve |
| Strength | Clear payoff + invite motivation |
| Risk | Slightly broad; must not sound like a feed |
| Age-14 | High: talk becomes real things with friends |
| Friend invite | High |
| Vision fit | Full product loop |

### Option B

| Field | Copy |
|-------|------|
| Kicker | Join |
| Headline | Your conversations already hold the life you want. |
| Support | Opal helps you and your people make more of it happen. |
| Communicates | Value is already in talk; Opal finishes the work |
| Emotion | Insightful |
| Strength | Distinctive |
| Risk | “Hold the life” may feel poetic without CTA context |
| Age-14 | Medium-high |
| Friend invite | High |
| Vision fit | Strong |

### Option C

| Field | Copy |
|-------|------|
| Kicker | Join |
| Headline | The best experiences usually start with something someone said. |
| Support | Opal helps the people involved carry it forward. |
| Communicates | Speech → experience with the right people |
| Emotion | Storylike |
| Strength | Memorable |
| Risk | Slightly long |
| Age-14 | High |
| Friend invite | Medium-high |
| Vision fit | Strong |

### Option D

| Field | Copy |
|-------|------|
| Kicker | Join |
| Headline | Talk becomes understanding. Understanding becomes something real. |
| Support | Bring your people into Opal so the right moments are easier to make. |
| Communicates | Product loop in plain steps |
| Emotion | Clear, slightly formal |
| Strength | Explicit transformation chain |
| Risk | Abstract if read without screens 1–4 |
| Age-14 | Medium-high with prior screens |
| Friend invite | High |
| Vision fit | Excellent |

### Option E

| Field | Copy |
|-------|------|
| Kicker | Join |
| Headline | More of what you talk about should actually happen. |
| Support | Opal helps you and your people make it real. |
| Communicates | Friction is the problem; Opal is the fix |
| Emotion | Direct, practical |
| Strength | Highest practical clarity |
| Risk | Less “premium” tone |
| Age-14 | Highest |
| Friend invite | High |
| Vision fit | Strong |

### Founder decision table (summary)

| Option | Comprehension | Desire | Invite | Recommendation |
|--------|---------------|--------|--------|----------------|
| A | High | High | High | **Recommended** |
| B | Medium-high | High | High | Strong alternate |
| C | High | Medium-high | Medium-high | Strong story alternate |
| D | Medium-high | Medium-high | High | Best loop language |
| E | Highest | Medium-high | High | Best plain-language alternate |

**Selection rule:** comprehension plus desire, not elegance alone.  
**Do not ship** without founder choice.

---

## CTA (first-run final screen)

| Candidate | Notes |
|-----------|-------|
| **Continue with phone number** (Recommended) | Unmistakable action |
| Start with your number | Clear, slightly softer |
| Enter Opal | Brand-forward; less clear about phone |
| Avoid alone: Continue / Get started / Begin | Too vague unless body already forces the action |

Secondary line (optional under CTA):

> Invite friends after you join.

---

## B. Phone activation trust copy

Privacy belongs **at the risk moment**, not as the walkthrough climax.

| Moment | Line |
|--------|------|
| Phone entry | Your relationships and conversations stay private. You choose what Opal may use or share. |
| Contact pick | Only the people you select are invited. |
| Location (later) | Used only for this experience unless you choose otherwise. |

These reassure. They must not replace the product promise on screen 5.

---

## C. Authenticated experience-moment copy

For use **after** context detection, permission, restraint, and collective fit.

### Moment headlines (review)

| Line | Note |
|------|------|
| Dinner is starting to come together. | Preferred over “noticed” (less surveillant) |
| This could work for the three of you. | Soft, useful |
| There may be a good fit here. | Uncertainty-safe |
| This one fits what everyone has shared. | Group-safe |
| This looks promising for the three of you. | Acceptable if already in use |
| Ready when you are. | Soft; low information alone |
| Opal noticed dinner taking shape. | Risk: observational / slightly creepy; deprioritize |

### Actions (not walkthrough CTAs)

Interested · Not this time · See why · Keep private

These are context-specific participation controls.  
A first-run user must **not** be asked to be “Interested” in a fictional dinner fixture.

---

## E. Age-14 comprehension checklist

For the full sequence with a chosen screen 5:

- [ ] Can they explain Opal without only saying “AI” or “chat”?  
- [ ] Can they say what happens after conversation?  
- [ ] Can they say why friends improve it?  
- [ ] Can they understand the CTA?  
- [ ] Does the last screen answer “why continue?” not only “that sounds pretty”?  

Reject abstract brand interpretation as the only message.

---

## Conversion test for final screen

Score the chosen option against:

product understanding · emotional impact · distinctiveness · trust · motivation to enter phone · motivation to invite · expectation accuracy · noise restraint · privacy placement  

Target feeling:

> I understand why I should continue.

Not only:

> That sounds pretty.

---

## F. Founder decision (locked)

| Decision | Value |
|----------|--------|
| Final hook | Hybrid E + A (approved) |
| Headline | More of what you talk about should actually happen. |
| Support | Opal understands what is taking shape and helps you and your people carry it forward. |
| CTA | Continue with phone number |
| Secondary | Bring your people in after you join. |
| Screens 1–4 | Unchanged |
| Privacy climax | Removed (Private by design / Calm. Human. Yours.) |
| Phone trust | Your relationships and conversations stay private. You choose what Opal may use or share. |
| Contact trust | Only the people you select are invited. |

Source implementation: separate branch `fix/walkthrough-final-conversion-hook`.

### Full loop (for final-hook alignment)

```text
conversation → understanding → shared experience
  → careful memory → more useful next time
```

# Social Flow Scenario Library

**Authority:** ACCEPTED PRODUCT TRUTH (templates)  
**Rule:** These are **behavioral templates**, not hard-coded product modes.  
Implementation must use primitives (proposal, grant, option, poll, plan, commitment, revision, hold)—not “ConcertMode” or “BeachDayMode.”

---

## Pattern catalog

| Pattern | User language examples | System response shape |
|---------|------------------------|------------------------|
| Soft possibility | “We should get dinner next week” | Proposal only; no event |
| Availability offer | “I’m free Thursday after work” | Time candidate evidence |
| Invite expansion | “Ask Michelle if she wants to come” | Participant pending interest |
| Time change | “Can we make it later?” | Revision proposal |
| Private hold | “Hold Thursday for me” | Personal hold, not shared |
| Group poll | “What works better, Thu or Fri?” | In-chat poll |
| Commitment | “I’ll book the table” | Commitment object |
| Completion | “Booked” | Commitment resolved |
| Late arrival | “Running 20 min late” | Adaptation offer, no silent reschedule |
| Cancellation | “I can’t make it” | Participation state change + notify rules |
| Follow-through | “You said you’d send the pics” | Private or shared reminder |

---

## Scenario templates (examples only)

### S1 — One-to-one meal

Discuss dinner → propose times → free/busy grants → agree → reservation commitment → day-of reminder → optional late adaptation.

### S2 — Small group activity (game night / movie)

Chat suggestion → in-chat poll → consensus time → shared plan → who-brings-what commitments → gentle nudges.

### S3 — Public outing (concert / fair)

Interest + tickets responsibility → payment/commitment privacy → shared “we’re going” plan without full personal budget.

### S4 — Work-adjacent coffee/lunch

Colleague invite → limited free/busy (work circle) → no romantic-context bleed → simple accept/decline.

### S5 — Trip / multi-day

Destination candidates → dates → bookings as commitments → packing/prep private vs shared → revision when flights change.

### S6 — Flexible / ADHD-friendly day

Prefer soft structure: fewer hard blocks, gentle nudges, easy reschedule without guilt theater or gamified “streaks” as pressure.

### S7 — Spontaneous “now-ish”

“Coffee nearby?” → coarse location only if granted → short-lived plan → auto-expire if no accept.

### S8 — Recurring hang

“Every Thursday?” → series plan with easy skip · not silent auto-RSVP forever without review.

---

## Source mapping

Many examples appear in `docs/source-material/original/NIOV-Social-Flow-Calendar.md` (polling, auto-scheduling, group planning, collaborative prep).  

**Keep** the social coordination behaviors.  
**Drop** staking, wallet, Social Score matching, and public discovery-as-default from implementation authority.

# Founder Direction: Real User Activation and Social Graph Foundation

**Authority:** FOUNDER-DIRECTED REQUIREMENT (2026-08-02 directive)  
**Status:** Recorded. Not fully implemented.  
**Does not rewrite:** Social Flow 1–14 closed history.  
**Related:** `CURRENT_STATE_TRUTH_MATRIX.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, ADR-0002–0005, SF10 onboarding domain.

---

## Locked product synthesis

Opal is an **AI-native social communication system**.

Central principle:

> Life starts in conversation.

Quality bar (not visual clone):

| Reference | Borrow | Do not copy |
|-----------|--------|-------------|
| **Signal** | Clarity, trust, directness, calm, identity boundaries, simple activation, reliable messaging, low noise | Layouts, icons, colors, wording, hierarchy, brand |
| **WhatsApp** | Social familiarity, network utility, chats-first low friction | Palette, chrome, density, identity |
| **Opal** | Social intelligence, journey continuity, shared meaning, real-world follow-through, Lumen Lens | Reduce to chatbot, calendar, CRM, feed |

Result must not feel like Signal with an AI button or WhatsApp with planning cards.

---

## Preserve (already accepted)

- Brand: **Lumen Lens**, tagline **Life starts in conversation.**  
- Visual: void depth, cyan glass, iris/pearl sheen, futuristic calm (not cyberpunk).  
- SF14 first-run Motion walkthrough quality.  
- Elixir authority; Python bounded; Postgres; Channels; Expo; Vite web.  
- Vibra study-only; no Convex/Clerk/Inngest/E2B.  
- No scores, streaks, feeds, ranking, engagement bait.

---

## Copy rules (founder)

- No em dashes or long hyphen sentence punctuation in product copy.  
- Prefer periods, commas, colons, short sentences.  
- Avoid: AI-powered, optimize relationships, scores, workflow, entity, processing, leverage, engagement, repeated “private conversation.”  
- Preferred signal language (in context only): Becoming a plan, Ready, Follow-through, Waiting for you, Still open, Changed, Handled, Nothing needs you right now, Everything for tonight is handled, Do this again sometime?

---

## Primary mission (this phase)

**Real user activation and social graph foundation.**

Connect polished Opal experience to **authoritative domain behavior**.

### First complete journey (must be proven end to end)

1. Open Opal  
2. First-run walkthrough  
3. Complete or skip  
4. Real account-creation flow  
5. Enter phone number  
6. Verify via **bounded provider abstraction**  
7. Create or restore human account  
8. Authenticated session  
9. Register device  
10. Basic profile  
11. Manual / selective choose someone known  
12. Safe invitation-path resolution  
13. Send real invitation  
14. Recipient reviews  
15. Recipient accepts  
16. Relationship context created  
17. Conversation created  
18. Persisted messages both ways  
19. Realtime delivery  
20. Bounded social signal from conversation  
21. Signal in correct context  
22. Users can act on signal  
23. Home / Chats / Plans / You update  
24. Survive reconnect / refresh / restart  
25. Sign-out removes protected access  
26. Block and report on real relationship  
27. Unrelated accounts isolated  
28. Static seed is **not** the primary journey  

### Explicitly deferred until journey proven

Public feeds, influencer systems, large event rooms, photo products, commercial booking, AI-to-AI execution, broad contact synchronization.

---

## Architecture constraints (founder + ADR)

- Elixir owns identity, verification state, sessions, devices, consent, relationships, invitations, conversations, messages, plans, block/report, privacy decisions, realtime authority.  
- Python may propose (plans, invite copy, meaning); **must not** create relationships, verify phones, create users, send invitations without Elixir authorization, or own UI.  
- If Python is down: messaging, navigation, existing plans continue.  
- Public web is non-authoritative unless it calls Elixir paths.  
- Production SMS requires provider + founder approval; synthetic path remains valid for development honesty.

---

## Implementation principle

Preserve current magic. Add actual utility.  
Do not regress visual quality.  
Do not claim completion without two-user proof and honest provider labeling.  

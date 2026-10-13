# OPAL CENTER FUNCTIONALITY + ASSISTANCE SURFACE AUDIT

**Date:** 2026-10-13  
**Branch:** `muse/packet-b-batch-2`  
**Base tip before repairs:** `ab08253f`  
**Constraint:** Pass 2 LOCKED — no memory productization, no relationship inference unlock, no fake intelligence theater.  
**Principle:** Do not make Center smarter before making Center trustworthy.

---

## Final metrics

```
OPAL_CENTER_UI = VERIFIED
OPAL_CENTER_ACTIONS = VERIFIED
PERMISSION_BOUNDARIES = PRESERVED
FAKE_SUCCESS = 0
PASS2_UNLOCKED = NO
INVESTOR_TOUCH_READY = YES
REAL_ACTIONS_ONLY = YES
FAKE_CAPABILITIES = 0
TRACK_B = UNTOUCHED
```

Runtime JSON: `shots/opal_center_functionality_audit/OPAL_CENTER_FUNCTIONALITY_RUNTIME.json`  
Harness: `apps/opal_web/scripts/_opal_center_functionality_audit.mjs`  
Counts: **21 GREEN / 0 YELLOW / 0 RED**

---

## Working today

| Surface | What is real |
|---------|----------------|
| Dock → Solo Center | `member-tab-opal` → `OpalCenterLifeGraph` |
| Character | Living Opal at **56px** rest / **64px** chat; idle/listening/thinking/speaking honesty |
| Talk to Opal | Chat phase via OC conversation API |
| Investor ask | “something with Chanelle this weekend” → contextual plan guidance |
| Plan / status | Typed “Plan something” / “What's coming up?” hit OC pipeline |
| Nearby now | Decision Intelligence conversation path (honest when no one-answer) |
| Context → YOU | Wired; permissions remain in YOU |
| Chats / Calls | Member surfaces reachable; Center does not fake call/send |
| Sample prompts | Labeled “Ideas to try…” — not live Attention |
| Day strip | Sample vs calendar attribution |
| Voice | Mic/TTS honesty (OC-6); Pass 2 Remember chip absent |
| Attach | Local preview + honest “can't read into conversation yet” |

---

## Missing UI

- In-chat action cards (plan summary stays plain text; success often navigates to Chats)
- Chat attach (Life Graph only)
- Calls CTA from Center
- Spending / Fit controls inside Center (domains stay separate; recommend may ask budget server-side)
- Stay-in-Center durable plan card after confirm

---

## Missing wiring

| Elsewhere | Center today |
|-----------|--------------|
| Live AttentionCenter | Rest nudges are **sample prompts** |
| Thread send / coordinate delivery | Draft + honest no-send (`coordinate` template-only) |
| Calendar free-busy curation | Week sample / empty honesty; no fake curation |
| Booking providers | No Center booking execute |
| Wallet / Pay | Oracle may read; no spend act from Center |

---

## Broken actions (repaired this tranche)

| Issue | Repair |
|-------|--------|
| `plan_modify` claimed “Done. X moved/cancelled” with **no mutation** | Template now Suggest→Prepare only; **LLM skipped** for `:plan_modify` and `:coordinate` so phrasing cannot invent Done/send |
| Rest lede “Two open windows before tonight” | Sample/calendar-honest lede (`opal-center-rest-lede`) |
| Post-confirm “hold a table or message them” | Replaced with “It's on your Graph.” |
| Chat invited “remember something” while Pass 2 chip locked | Chat templates offer plan / status only |
| Life Graph Curate / Move chips same DI pipe | Relabeled **Nearby now / What's next? / Tonight ideas** |

---

## Future intelligence (locked)

- Pass 2 memory / Understanding Candidates / relationship inference
- “Remember something” as a consumer feature claim
- Autonomous booking, outbound message send, act-on-behalf beyond ConsentProof
- Preference learning productization
- Deep Assist morphing from message content

Server `:remember` may still persist if a user **types** a remember utterance; UI does not advertise it. **PASS2_UNLOCKED = NO.**

---

## Repairs completed

### Backend (`apps/opal_core`)

- `lib/opal_core/opal_response.ex` — honest `plan_modify` / `plan_confirm` / `chat` / `recall` empty; template-only for `:plan_modify` + `:coordinate`
- `lib/opal_core/opal_conversations.ex` — confirm success fallback Graph-only
- `test/opal_core/opal_response_test.exs` — honesty assertions

### Frontend (`apps/opal_web`)

- `src/opalUi/OpalCenterLifeGraph.tsx` — rest lede + nearby chips
- `src/opalUi/opalCenterLifeGraph.test.ts` — investor honesty contracts
- `scripts/_opal_center_functionality_audit.mjs` — runtime investor-touch harness

---

## Runtime evidence

Shots under `shots/opal_center_functionality_audit/`:

| Shot | Proof |
|------|--------|
| `01_center_rest.png` | Sample lede, Nearby chips, Talk to Opal, 56px presence |
| `02_center_chat.png` | Chat shell |
| `03_chat_reply_chanelle.png` | Real Chanelle weekend reply |
| `04_plan_chip.png` / `05_coming_up.png` | OC follow-ups |
| `06_nearby_di.png` | DI conversation (honest unresolved note when no one-answer) |
| `07_context_you.png` | Context → YOU |
| `08_chats.png` / `09_calls.png` | Cross-surface reach |
| `10_center_430.png` | 430 viewport |

API probes (Walk A minted session):

- `Move Oak to Saturday` → `I don't see Oak on your calendar. Want to create it?` (no fake Done)
- Chanelle weekend → real contextual plan guidance
- No “hold a table / message them” booking promise
- No “remember something” advertising

Vitest: `opalCenterLifeGraph.test.ts` + `OpalCenterChat.test.tsx` → **26/26**  
Mix: `plan_modify` honesty tests → **2/2**

---

## Investor Experience Review

| Check | Result |
|-------|--------|
| First impression | Companion Center, not mascot takeover |
| Wow moment | Contextual Chanelle weekend planning from real OC pipeline |
| Interaction quality | Talk → reply → suggest next step |
| Action credibility | Suggest/Prepare language; Graph confirm for mutations |
| Visual polish | Brand character + sample/calendar honesty |
| Speed | Sub-2s class replies in runtime |
| No fake behavior | FAKE_SUCCESS = 0 |
| No broken promises | Booking/outbound/Pass 2 stay gated |

```
INVESTOR_TOUCH_READY = YES
REAL_ACTIONS_ONLY = YES
FAKE_CAPABILITIES = 0
PASS2_UNLOCKED = NO
```

---

## PRESERVED / RESTORED / IMPROVED / REPAIRED / HONESTLY DEFERRED

| Class | Items |
|-------|--------|
| **PRESERVED** | Reality Gate, YOU permissions, Access≠Action, OC-1–OC-6 pipeline, Track B untouched, Pass 2 lock |
| **RESTORED** | Trust language on plan modify / confirm (honest prepare vs fake Done) |
| **IMPROVED** | Rest lede honesty; nearby chip labels; investor-touch harness |
| **REPAIRED** | Fake plan_modify Done; booking/message soft-promises; remember advertising in chat templates; LLM bypass on action-boundary intents |
| **HONESTLY DEFERRED** | In-chat action cards; live Attention nudges; Center→Calls; booking execute; Pass 2 intelligence |

---

## Commit hashes

Recorded after push in this tranche (see git log on `muse/packet-b-batch-2`).

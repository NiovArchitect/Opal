# Paste G Phase 5 — Social API research (Instagram Graph + Threads)

**Date:** 2026-10-08  
**Branch:** `muse/packet-b-batch-2`  
**Bar:** honest current state — no vapor. Recommend build / wait / skip.

---

## Instagram Graph API (2026)

### What exists

- Official surface is the **Instagram Platform** (Graph API), currently documented around **v26.0** (July 2026 changelog).
- Hosts: `graph.instagram.com` (Instagram Login) or `graph.facebook.com` (Facebook Login for Business).
- Capabilities for **professional** accounts: media publish, comments, insights, messaging (with Advanced Access), business discovery of other Business/Creator accounts.

### Hard limits that matter for Opal

| Constraint | Reality |
|---|---|
| Personal accounts | **Not supported.** Basic Display API permanently shut down **2024-12-04**. No replacement for personal profiles. |
| Account type | App users **must** have Instagram Business or Creator. |
| Friend / contact graph | **No** “read my friends’ birthdays / life events” API for consumer social awareness. |
| Others’ private life | Graph scopes are about **owned** professional assets (posts, insights, comments), not friends’ milestones. |
| App Review | Advanced Access + (often) Business Verification required to serve accounts you don’t own. |

### Product fit for Opal “social awareness”

Opal wants: “Maya just got engaged / birthday from people I know.”  
Instagram Graph **cannot** deliver that for a normal consumer contact graph. It can only manage the user’s own professional IG presence.

### Recommendation: **SKIP** (for social-awareness sync)

Do **not** build Instagram Graph into Opal’s contact/celebration sync path. Wrong API for the product job. Revisit only if Opal later ships a **creator/business publishing** feature (out of Paste G scope).

---

## Threads API (2026)

### What exists

- Meta opened Threads API to all developers **2024-06-18**; docs updated through mid/late 2026.
- Hosts: `graph.threads.com` / `graph.threads.net`.
- OAuth user tokens (short → long-lived ~60 days; public-profile grants refreshable ~90 days; **private profiles must re-auth**).
- Scopes: `threads_basic`, `threads_content_publish`, reply management, insights, keyword search (added late 2024), etc.
- Publishing quotas documented (e.g. ~250 API posts / 24h rolling).
- Development: add **Threads Testers**; App Review required for non-testers.

### Hard limits that matter for Opal

| Constraint | Reality |
|---|---|
| Purpose | Publish / manage **the user’s own Threads posts**, replies, insights. |
| Contact life events | **No** friend-graph birthday/engagement feed for third-party apps. |
| Profile lookup | Limited / gated (`threads_profile_discovery`); not a social CRM. |
| Privacy | Private Threads profiles complicate long-lived grants. |

### Recommendation: **SKIP** (for social-awareness sync)

Same verdict as Instagram: useful for **own-account publishing**, useless for “keep up with my people’s life events.” Do not block Paste G on Threads OAuth.

---

## What Opal should build instead (this phase)

| Signal | Path | Status in Paste G Phase 5 |
|---|---|---|
| Birthday / anniversary on a **user-selected** device contact | `expo-contacts` Birthday (+ anniversary when present) → Celebration / TemporalAnchor with provenance `:observed`, note “from your contacts” | **BUILD NOW** |
| User-told life event (“Maya just got engaged”) | Extractor / ingest → person memory fact + temporal/open-loop nudge via existing Recall / Attention paths | **VERIFY / extend** (no rebuild) |
| Full address-book scrape | Forbidden by product trust law | **NEVER** |
| IG / Threads friend graph | Not available via official APIs | **SKIP** |

---

## Env / BLOCKED implications

No new Meta app keys required for Phase 5 contact sync.  
If a future paste adds **creator publish**, add `META_THREADS_APP_ID` / Instagram Business tokens to `BLOCKED.md` then — not now.

---

## Sources (checked 2026-10)

- Meta Instagram Platform overview (updated Sep 2026) — professional accounts only; Basic Display gone.
- Meta Threads get-started / overview (updated 2025–2026) — own-content publish + insights.
- Industry writeups confirming personal IG API absence post–Dec 2024 Basic Display shutdown.

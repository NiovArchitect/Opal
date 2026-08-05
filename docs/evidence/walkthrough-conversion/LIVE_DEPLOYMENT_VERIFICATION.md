# Live walkthrough deployment verification

**Date:** 2026-08-05  
**Public URL:** https://opal.niovlabs.com  
**Method:** GitHub Pages (`gh-pages` branch)  
**No credentials, cookies, phone numbers, or tokens in this document.**

---

## Source and deploy identity

| Field | Value |
|-------|--------|
| Source repository | `NiovArchitect/Opal` |
| Source commit | `8be2567f8798447c1db9e89a852c0a3611332d6d` |
| Source PR | #50 merged |
| Build | `apps/opal_web` via `npm ci` · `npm test` (49 pass) · `npm run build` |
| Node | v24.13.1 |
| npm | 11.8.0 |
| Generated JS | `assets/index-DyLD3XYN.js` |
| Generated CSS | `assets/index-s3U6F99y.css` |
| Deploy branch commit | `f6587a868570c898cafc96e04af068c52f5a41e0` |
| Prior live JS (stale) | `assets/index-BpudI8sy.js` |
| Old asset after deploy | **HTTP 404** (no longer referenced) |

---

## Bundle / live copy audit

| String | Dist | Live |
|--------|------|------|
| Life starts in conversation. | FOUND | FOUND |
| When talk becomes something real. | FOUND | FOUND |
| Decide without killing the vibe. | FOUND | FOUND |
| Moments that actually happen. | FOUND | FOUND |
| More of what you talk about should actually happen. | FOUND | FOUND |
| Opal understands what is taking shape and helps you and your people carry it forward. | FOUND | FOUND |
| Continue with phone number | FOUND | FOUND |
| Bring your people in after you join. | FOUND | FOUND |
| Your relationships and conversations stay private… | FOUND | FOUND |
| Only the people you select are invited. | FOUND | FOUND |
| Calm. Human. Yours. | ABSENT | ABSENT |
| Private by design | ABSENT | ABSENT |

Screen order positions in live JS are strictly increasing (1→5).

Live HTML references:

```html
<script type="module" crossorigin src="/assets/index-DyLD3XYN.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-s3U6F99y.css">
```

Cache: HTML/JS served with `cache-control: max-age=600`; verified with cache-bust query and confirmed new hash. No service worker in HTML.

---

## Live matrix results

| Check | Result | Notes |
|-------|--------|-------|
| Screens 1–4 copy | **PASS** | Exact match to approved sequence |
| Screen 5 headline + support | **PASS** | Exact approved hybrid hook |
| CTA string | **PASS** | Continue with phone number |
| Secondary line | **PASS** | Bring your people in after you join. |
| Old climax absent | **PASS** | Not in live JS |
| Phone trust in bundle | **PASS** | activation-trust class + approved sentence |
| Contact trust in bundle | **PASS** | Selected-only invite line |
| CTA wiring (source) | **PASS** | Last-step CTA calls existing `onComplete()` → activation |
| Skip control present | **PASS** | Skip string in live JS |
| first-run-secondary association | **PASS** | `aria-describedby` on last CTA in source |
| Reduced motion (source/CSS) | **PASS** | Motion `useReducedMotion` in component; CSS prefs remain |
| Responsive/CSS balance wrap | **PASS** | `text-wrap: balance` on `.first-run-title` |
| Accessibility (static review) | **PASS with notes** | Dialog labels, CTA name, trust as `role="note"`, skip button; full browser AT not instrumented in this agent |
| Comprehension smoke | **Simulated only** | See below |
| Therapist revalidation | **Not claimed** | No live therapist session |

### Simulated comprehension smoke (not external human research)

| Persona | What Opal does | Why continue | Why people matter | After CTA | Privacy meaning |
|---------|----------------|--------------|-------------------|-----------|-----------------|
| New user | Helps talk become real shared experiences | Clear unmet need on screen 5 | Carry plans forward together | Phone activation | Trust line at number entry |
| Age-14 | More of what we talk about should happen | Understandable hook | Friends join to make it real | Enter number | Private unless you choose |
| Privacy-conscious | Conversation-first social product | Payoff not privacy-only | Selected invites only | Trust visible | Relationships stay private by design intent |
| Invited friend | Same | Social entry already primed | Invite context | Join path | Selected-only language |
| Calendar assumption | Corrected by conversation arc | Not scheduling homework | People not calendars | Activation | N/A |
| Chatbot assumption | Corrected: not chat replacement alone | Experiences with people | Group value | Activation | N/A |
| Therapist lens | Practical payoff present | Dignity + function | Group without ranking | Activation | Privacy supports trust, not climax |

---

## Defects

| Severity | Issue | Status |
|----------|-------|--------|
| — | Live still served old climax | **Resolved** by `gh-pages` deploy `f6587a8` |
| P3 | Full Brave UI automation / real reduced-motion browser capture not run in this agent | Residual; static + HTTP parity PASS |
| P3 | Authenticated Find People path not executed live (would require fixture activation) | Contact trust string confirmed in live bundle |
| Info | GitHub Pages max-age 600 may briefly cache HTML at edge | Mitigated by new hashed asset names |

No P0/P1 remaining for walkthrough deployment parity.

---

## Fix PRs

None required for copy. Deployment-only update on `gh-pages`.

---

## Program holds

| Track | Status |
|-------|--------|
| SF18 | PARTIALLY COMPLETE (no phone) |
| Phase 2 | Closed on main |
| Phase 3 | **HOLD** proposal-only until founder live review |
| Foundation/Kafka | Untouched |

---

## Worker closure

Active workers: **0**

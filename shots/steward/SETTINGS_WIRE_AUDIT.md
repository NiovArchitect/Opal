# You settings wire audit (steward, read-only)

**Date:** 2026-10-12
**Tip:** `3c59780f` + home EMPTY regression
**Source:** `apps/opal_web/src/opalUi/YouSettingsDestination.tsx`
**Law:** Every control must eventually wire UI → API → DB → realtime → behavior. Honest `blockedReason` beats fake toggles.

## Summary

| Class | Count |
|-------|------:|
| Live / local (no blockedReason) | 11 |
| Honestly blocked | 42 |
| Notes | 15 |
| **Total row objects** | **68** |

Machine dump: `shots/steward/SETTINGS_WIRE_AUDIT.json`

## Live / local rows (keep + prove)

| Kind | Id | Title |
|------|----|-------|
| action | `save` | Save profile |
| nav | `nearby-range` | Nearby range |
| action | `save-home-timezone` | Save home timezone |
| nav | `travel-mode` | Travel mode |
| toggle | `assist` | Opal Assist on calls |
| toggle | `messages-calls` | Messages & calls |
| toggle | `read-receipts` | Read receipts |
| nav | `this-phone` | This phone |
| nav | `linked-from-account` | Linked devices |
| action | `delete-account` | Delete account |
| action | `keep-account` | Keep my account |

## Honestly blocked (do not fake)

| Id | Title | Blocked reason |
|----|-------|----------------|
| `graph-visibility` | Graph visibility | Needs per-Graph audience API — not wired yet. |
| `exact-location` | Exact location after join | Needs live location share session API. |
| `public-counts` | Public engagement counts | Needs engagement-count preference on SocialMoments. |
| `join-requests` | Join requests | Join-request policy API not shipped. |
| `blocked-muted` | Blocked & muted | Use Safety → Blocked / Muted once those lists ship. |
| `people-first` | People you know first | Feed ranking prefs need a product preferences API. |
| `local-discovery` | Local discovery | Needs location permission + discovery index. |
| `suggested-people` | Suggested people | Suggested-people ranking not exposed as a preference yet. |
| `suggested-experiences` | Suggested experiences | Suggested-experiences preference API not shipped. |
| `timing` | Use location for timing | Needs device location permission + ETA service. |
| `live-share` | Share live location | Live share needs a time-bounded location session API. |
| `home-area` | Home area | Home-area editor needs places storage. |
| `map-handoff` | Map handoff | Map deep-link preference not persisted yet. |
| `like-counts` | Public like counts | Needs SocialMoment engagement preference fields. |
| `view-counts` | Public view counts | Needs SocialMoment engagement preference fields. |
| `reposts` | Allow reposts | Repost permission flag not on content schema yet. |
| `comments` | Comments | Comment audience picker needs content ACL API. |
| `private-history` | Private shared history | Already private by product law — no toggle surface yet. |
| `ask-every` | Ask on every call | Per-call confirm needs Assist prompt UI on call start. |
| `suggest-graphs` | Suggest Graph ideas after calls | Post-call Graph suggestions need call→Graph bridge. |
| `remember-signals` | Remember useful call signals | Call-signal memory needs Assist retention policy API. |
| `call-privacy` | Call privacy | Call retention policy screen not built. |
| `graph-changes` | Graph changes | Push category needs Expo rebuild + APNs project credentials. |
| `live-movement` | Live movement | Push category needs Expo rebuild + live-location session. |
| `social-activity` | Social activity | Social push categories need Expo rebuild + preference API. |
| `critical-timing` | Critical timing | Critical timing push needs reservation hold → APNs path. |
| `desktop` | Desktop session | QR desktop linking needs signed session mint API. |
| `revoke` | Revoke a device | Session revoke UI needs device roster API. |
| `blocked` | Blocked people | Block list UI needs TrustSafety block list endpoint wired. |
| `muted` | Muted people | Mute list UI needs conversation mute roster. |
| `reported` | Reported content | Report history surface not built. |
| `unknown` | Unknown contact requests | Cold-contact policy API not shipped. |
| `location-safety` | Location safety | Depends on live-location session API. |
| `learn-choices` | Learn from my choices | Preference learning toggle needs recommend feedback store. |
| `budget-private` | Keep my budget private | Already private by financial profile policy — no separate flag. |
| `ask-when-cost` | Ask only when cost matters | Cost-interrupt policy not separate from comfort level yet. |
| `trip-goals` | Trip goals | Trip goal objects not in Trips domain yet. |
| `per-graph-fit` | Per-Graph fit | Per-Graph spend override needs Graph settings API. |
| `phone` | Phone number | Change-phone requires re-verify OTP flow — not exposed yet. |
| `two-step` | Two-step security | Phone OTP is the second factor today — no extra step UI. |
| `session-alerts` | Session alerts | Needs push + session event feed. |
| `confirm-delete` | Delete my account | Account deletion endpoint is not exposed yet. Contact support to close your account. |

## Next compound steps

1. For each **live** row: prove UI → API → DB → behavior with a focused test or evidence shot.
2. For **blocked** rows: leave honest gates; ship preference APIs only when a real consumer exists.
3. Priority live proofs: Assist on calls, Messages & calls notifications, Read receipts, Linked devices, Save profile.
4. Do not convert blockedReason into silent no-ops.

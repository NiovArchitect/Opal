# Social Flow Contact Security

**Authority:** ARCHITECTURE (CURRENT)  
**Status:** Security architecture for Social Flow contacts, invitations, and family-adjacent surfaces — **not** an implementation claim  
**Related:** `THREAT_MODEL.md`, `IDENTITY_AND_PHONE_NUMBERS.md`, `SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`, `MINOR_AND_FAMILY_PRIVACY.md`, `RELATIONSHIP_SAFETY_RULES.md`

---

## Purpose

Social Flow turns conversation into coordination. That multiplies contact-graph and invitation risk: who can appear in someone’s life, who can propose plans, who can see free/busy or location-ish signals, and how shared family devices are abused.

This document defines **security controls** around contact and coordination edges. Messaging baseline threats remain in `THREAT_MODEL.md`.

---

## Assets (contact / Social Flow specific)

1. Contact graph and discovery signals  
2. Invitation and plan-participation edges  
3. Availability grants and free/busy  
4. Plan membership and surprise rosters  
5. Guardian–minor link and approval state  
6. Session tokens on personal and shared devices  
7. Location grants (future, purpose-limited)  
8. Notification content that can leak plan or presence secrets  

---

## Adversaries (prioritized)

| Adversary | Contact-centric interest |
|-----------|--------------------------|
| External attacker | Account takeover → impersonate invites and plan changes |
| Abusive partner / peer | Stalking, coercive monitoring, surprise of blocked re-entry via plans |
| Malicious or groomer adult | Contact with minors; social engineering of guardians |
| Curious contact | Graph enumeration, invitation spam, free/busy probing |
| Compromised / shared device | Session use by wrong household member |
| Insider / subprocessor | Graph and invite metadata abuse |

---

## Account takeover and impersonation

### Risks

- Stolen session → attacker accepts/declines plans, rewrites commitments, messages as user.  
- SIM-swap / OTP interception → new device session.  
- AI drafting or future voice features used to **impersonate** the user to contacts.  
- Fake “plan update” social engineering (phishing deep links).

### Controls (design)

| Control | Requirement |
|---------|-------------|
| Session hygiene | Rotatable tokens; per-device sessions; user-visible device list; remote revoke |
| Step-up auth | Re-verify for sensitive actions: add trusted contact, change phone, export, guardian-link changes, bulk invites (policy thresholds TBD) |
| OTP / verify | Aggressive rate limits; never log raw codes; synthetic codes impossible in prod builds |
| Plan authority | Only Elixir accepts RSVP / plan revision / participation changes; clients cannot assert authority |
| Impersonation product ban | No voice-clone or call-as-user without multi-step governed consent (deferred); no auto-send of AI drafts |
| Notification integrity | Plan change notifications must bind to real plan ids and membership checks server-side |
| Audit | Auth events, device revoke, consent changes, high-trust plan actions |

**High-trust Social Flow actions** (accept/decline for user, notify group of time change, expand free/busy, create/cancel shared plan) require explicit user approval or a visible, revocable standing rule — never silent attacker-friendly defaults.

---

## Adult–child contact restrictions

When minor participation exists (deferred product; G052 / SF-D011):

| Rule | Intent |
|------|--------|
| **Default deny** unsolicited adult → child edges | Adults cannot freely discover or message minors |
| **Guardian approval** for new contacts / plan invites involving the minor | Connection is a privileged event |
| **No public discovery** of minors | No open graph, no “people you may know” for child accounts |
| **Block / report** available and enforceable for minor-linked threads | Safety baseline |
| **AI must not facilitate** underage grooming or contact circumvention | Safety classifiers + `refused` |
| **Adult private/partner context** never used to justify or route contact to a child | Isolation |

Adult–adult contact remains ordinary messenger norms, subject to block lists and rate limits.  
Age attestation and legal thresholds are LEGAL_OR_POLICY — engineering enforces whatever policy records Elixir stores.

---

## Unauthorized invitations

### Threats

- Invite to plans without being a participant or grantee.  
- Adding someone to a surprise roster to leak or harass.  
- Re-inviting blocked users via plan fan-out.  
- SMS / link invites to non-users used for spam or social-graph probing (G012).  
- Forged client payloads claiming “they already agreed.”

### Controls

1. **Server-side membership checks** on every invite, poll, RSVP, and revision path.  
2. **Block enforcement** before invite create, notification, and discovery — blocked users cannot re-enter via Social Flow objects.  
3. **Invitation authority:** only users with plan role (organizer / permitted co-host) may invite; Python proposals never fan out invites.  
4. **Surprise mode:** guest identity cannot be added as viewer; helpers are explicit; guest excluded from projection and push content.  
5. **Non-user invites:** link-first; SMS invite is FOUNDER_DECISION; never attach AI-generated intimate content to non-user messages.  
6. **Idempotency + audit** on invite creation to prevent replay storms and to support abuse review.  
7. **Rate limits** per actor on invites, plan creates, and “coordinate?” prompts.

No **auto-RSVP** and no silent invite fan-out (SF-D013, product truth).

---

## Stalking and coercive-control patterns

Social Flow must not become a stalking toolkit (threat model high-risk; G050–G051).

### Patterns to resist

- Repeated plan proposals / polls after block or decline.  
- Free/busy or presence probing to map someone’s life.  
- Using shared plans to force ongoing contact.  
- “Proof packs” of attendance, read state, or AI certainty about a partner.  
- Location or last-seen used beyond normal messenger norms.  
- Circumventing mute/block via family group or multi-plan spam.

### Controls

| Area | Design |
|------|--------|
| Block | Hard stop on message, invite, plan participation requests, and discovery |
| Decline / withdraw | First-class participation states; no punishment UX or scoring |
| Presence / last-seen | Careful defaults (G013); not precise continuous tracking |
| Availability | Grant-scoped; “ask before sharing”; no silent calendar scrape to third parties |
| AI | No evidence packs; no certainty about private intent; consent for any analysis that could enable monitoring |
| Rate / anomaly | Soft limits on repeated unilateral plan pressure (product + safety policy) |
| Reports | Abuse report path for invite/plan harassment (policy detail LEGAL + PRODUCT) |

Opal assists users; Opal is not a courtroom. Preserve evidence-minded **server audit** for platform safety without building user-facing “prosecution packs.”

---

## Location security (future capability)

Aligned with SF-D012 and privacy boundaries:

- **Off by default.**  
- **Purpose-specific and time-limited** grants (e.g. “share coarse area for this plan window”).  
- Prefer **coarse** over precise.  
- **Not visible** to others unless explicitly shared for that purpose.  
- **No covert proximity** or background tracking for social features.  
- **Not used for ads** or scoring.  
- Revocation ends future sharing; historical precise points should not linger in other users’ clients beyond policy.  
- Minor-linked location: stricter — guardian policy + stronger minimization; default off.

Until location ships, architecture must not leave half-enabled client hooks that phone home coordinates.

---

## Contact discovery limits

From identity architecture (G011): naive address-book upload leaks social graphs.

### Requirements

| Control | Notes |
|---------|--------|
| Prefer invite links / QR / single-number search | MVP recommendation |
| Full book sync | Only after privacy review |
| Rate limits | On search, match, and invite |
| Hashing / k-anonymity techniques | If bulk match ever allowed |
| Mutual or constrained discovery options | Reduce one-sided graph scrape |
| No discovery of minors via bulk match | Hard rule when minors exist |
| Logging | Do not retain raw address books in app logs or AI context |

Discovery privacy failures are **info disclosure** under STRIDE — isolation and abuse tests required.

---

## Device and session security for shared family devices

Families often share tablets, kitchen phones, or “the iPad.”

### Risks

- Wrong household member accepts a plan, reads surprise context, or messages as the logged-in adult.  
- Child uses adult session (or vice versa) and triggers AI or payments-adjacent flows.  
- Session left unlocked; push notifications reveal private plan titles on lock screen.  
- Local caches of private holds / gift prep on a shared device.

### Controls (design)

| Control | Requirement |
|---------|-------------|
| Clear account identity in UI | Always visible who is signed in before high-trust actions |
| Fast switch / lock | App PIN or OS biometrics for re-open; optional “private vault” for private holds (product) |
| Per-device revoke | From another device when a shared tablet is lost or sold |
| Notification redaction options | Hide message/plan body on lock screen (user setting) |
| No ambient multi-user bag | Do not merge two users’ private contexts on one device install |
| Guardian–minor | Separate sessions preferred; shared device profiles must not silently elevate privileges |
| Local data | Encrypt at rest on device per platform norms; logout clears or protects sensitive caches |
| Step-up on shared-looking patterns | Optional re-auth for surprise mode changes, export, contact approvals |

Social Flow offline projection (mobile) must still enforce that **authoritative** accepts/RSVPs reconcile under the correct user identity — never apply another account’s pending action.

---

## STRIDE snapshot (contact-focused)

| Threat | Examples | Mitigations |
|--------|----------|-------------|
| Spoofing | Session theft, fake invite links | Device revoke, step-up, signed deep links, membership checks |
| Tampering | Client-forged RSVP / surprise membership | Elixir authority only; schema + authz |
| Repudiation | “I didn’t invite them” | Audit of invite and participation changes |
| Info disclosure | Graph leak, surprise leak, notification bleed | Discovery limits; surprise mode; lock-screen redaction |
| DoS | Invite / plan spam | Rate limits, backpressure |
| Elevation | Read plan as non-member; adult→child contact | Authz every path; guardian gates; isolation tests |

---

## Required test themes

- Blocked user cannot be plan-invited or re-added via helpers  
- Surprise guest exclusion on API, push, and calendar projection  
- Non-member cannot RSVP or read plan fields  
- Discovery rate limits and no raw book logging  
- Device revoke invalidates plan-mutating APIs  
- Adult–child invite paths default deny without guardian approval (when built)  
- Free/busy not returned without valid grant  
- Notification content respects private vs shared vs surprise  

---

## Ownership

| Concern | Owner |
|---------|--------|
| Sessions, authz, membership, invites, blocks, plan authority | Elixir / OTP |
| Safety classification on drafts/contact circumvention | Python (proposals/refusals) under Elixir consent |
| OS biometrics / local lock UX | Mobile |
| Legal age and harassment policy text | LEGAL_OR_POLICY |

---

## Open questions

- Exact step-up auth matrix for Social Flow actions  
- SMS invites to non-users (G012)  
- Presence/last-seen final policy (G013)  
- Shared-device product mode vs “just use OS multi-user”  
- Anomaly thresholds for stalking-like plan pressure (G050–G051)  

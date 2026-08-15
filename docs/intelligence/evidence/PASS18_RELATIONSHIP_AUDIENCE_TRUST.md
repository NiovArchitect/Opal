# PASS 18 — Relationship Graph Precision + Social Audience Trust

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**Prior:** Pass 17 `00db34a` (durable Social Moment publishing)  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 17 made Moments durable.  
Pass 18 makes **who can see them** precise.

```text
FRIENDS was coarse (permissive friends?: true bypass).
→ RelationshipGraph owns friend authority.
→ contact ≠ friend
→ invite pending ≠ friend
→ group co-member alone ≠ friend
→ inference / attribution / provider cannot expand audience
→ block overrides friend edges
→ media re-checks authority on every fetch
→ audience edit revokes Moment + media access
```

**No payouts. No public feed. No second social graph. No second planning engine.**

---

## INTELLIGENCE PREFLIGHT

| Item | Result |
|------|--------|
| RELATIONSHIP GRAPH OWNER | `OpalCore.SocialFlow.RelationshipGraph` |
| CURRENT FRIEND SEMANTICS | Active `RelationshipEstablishment` **OR** shared active **dyad** (exactly 2 `ConversationMember`s) |
| CURRENT RELATIONSHIP STATES | establishment `active`/`ended`; invite `sent`…`accepted`; TrustSafety blocks |
| CURRENT CONTACT/PHONE GRAPH | Contact resolution digests only — **discovery, not visibility** |
| CURRENT BLOCK/SAFETY INTEGRATION | `TrustSafety.blocked?` either direction → deny friend + Moment delivery |
| CURRENT GROUP MODEL | `ConversationMember` membership for `group` visibility only |
| VISIBILITY DEPENDENCIES | SocialMomentVisibility + RelationshipGraph + TrustSafety |
| EXPECTED NON-CHANGES | ExperienceGraph, AttributionGraph, ProviderVertical, SocialReality, AttentionAuthority, SF15, brand, no public mode |

`./scripts/intelligence_check.sh --impact --with-tests` → **PASS** (V2 MERGE HOLD)

---

## ROOT CAUSE (Pass 17 gap)

Pass 17 enforced scopes server-side but friend path could be **default-permissive**:

- missing `friends?` could pass incorrectly in earlier drafts
- media delivery risked treating friends as always true

Pass 18:

1. `SocialMomentVisibility` — missing `friends?` is **deny**
2. `SocialMomentPublishing.viewer_opts/2` — always computes `RelationshipGraph.friend_visibility_authorized?/2`
3. Media `read_media` / delivery URLs use the same opts (no bypass)

---

## FRIEND AUTHORITY MODEL

Server-authoritative transition for **FRIENDS visibility eligibility**:

```text
author → relationship edge → current valid friend state → no block conflict → visible
```

| Source | Grants FRIENDS? |
|--------|-----------------|
| Active RelationshipEstablishment (both participant_ids) | **YES** |
| Shared dyad ConversationMember (member count == 2) | **YES** |
| Group conversation co-membership only | **NO** |
| Contact match / phone digest | **NO** |
| Invite pending (sent/delivered/viewed) | **NO** |
| Prior message without dyad/establishment | **NO** |
| Inference / ranking relevance | **NO** |
| Attribution edge | **NO** |
| Provider relationship | **NO** |

### Mutuality

**Mutual / relationship-based**, not Instagram followers:

- Establishment is mutual by construction (participant_ids)
- Dyad membership is shared (both members of the same 2-person conversation)
- Not one-way “follow”

---

## HISTORICAL ACCESS POLICY (DELIBERATE)

**Dynamic at view time** for FRIENDS and GROUP:

| Policy key | Value |
|------------|-------|
| friends | `dynamic_current_edge` |
| group | `dynamic_current_membership` |
| specific_people | `explicit_id_list` |
| private | `author_only` |
| new friend sees old FRIENDS Moments | **true** |
| removed friend loses old FRIENDS Moments | **true** |
| new group member sees old group Moments | **true** |
| removed group member loses group Moments | **true** |

Rationale: Opal relationship authority is about **current trust**, not a frozen ACL snapshot.  
specific_people remains an explicit ID list (snapshot of author intent).

---

## CONTACT MATCH MODEL

| Stage | Meaning |
|-------|---------|
| CONTACT MATCH | Phone digest resolution may discover someone is on Opal |
| RELATIONSHIP ESTABLISHED | Accept invite → RelationshipEstablishment active |
| FRIEND VISIBILITY AUTHORIZED | Only establishment **or** dyad peer |

`contact_match_implies_friend?` → **false**  
Contact import must never silently grant Moment visibility.

**Status:** Contact resolution exists (`Onboarding.resolve_contact`) with digests, no full address book upload as friend authority. Full phone-book product flow remains discovery-only gap documentation (not invented as visibility).

---

## INVITE MODEL

Pending invite (`sent` / `delivered` / `viewed`) → **not friend**.  
`invite_pending_grants_friend?` → **false**  
No visibility leakage through invites.

---

## DEFAULT VISIBILITY

Default remains **`friends`**.

Safe **after** precise semantics because FRIENDS is no longer permissive.  
`specific_people` remains the sharpest explicit scope.

---

## MATRICES (fixture-grounded)

Fixture dyads: Alex↔Jordan, Alex↔Taylor, Maya↔Chris.  
Group friends includes Alex+Jordan+Maya+Chris.

### FRIENDS matrix (author = Alex / founder)

| Viewer | Expected | Why |
|--------|----------|-----|
| Founder (Alex) | YES | author |
| Jordan | YES | dyad |
| Taylor | YES | dyad |
| Maya (after establishment) | YES | establishment |
| Chris | NO | group-only |
| Victor (unrelated) | NO | no edge |
| Blocked former friend | NO | block overrides |

### SPECIFIC PEOPLE (Jordan + Chris)

| Viewer | Expected |
|--------|----------|
| Author | YES |
| Jordan | YES |
| Chris | YES (explicit ID — contact-only may be selected deliberately) |
| Maya | NO |

### GROUP (Friends group)

| Viewer | Expected |
|--------|----------|
| Jordan (member) | YES |
| Taylor (non-member) | NO |

### PRIVATE

| Viewer | Expected |
|--------|----------|
| Author | YES |
| Anyone else | NO |

### BLOCK

Either direction TrustSafety block → no friend authority, no Moment, no media.

### RELATIONSHIP REMOVAL

Friend → establishment `ended` → new and **historical** FRIENDS Moments denied (dynamic).

### NEW FRIEND HISTORICAL

Establishment after old FRIENDS Moment → **can** see (dynamic policy).

### AUDIENCE EDIT

FRIENDS → specific_people [Jordan] → Maya loses Moment **and** media.

### GROUP REMOVAL

Dynamic membership — non-member denied (current ConversationMember required).

### MOMENT → REALITY

Moment audience does **not** grant Reality access. Reality uses conversation membership.

### ATTRIBUTION PRIVACY

Attribution edges do **not** expand social visibility.  
Downstream Reality identity is not disclosed by Moment lineage alone.

---

## MEDIA REVOCATION

Every media fetch re-runs `can_access_media?` with live `viewer_opts`.  
No permanent public URL. Audience edit immediately revokes bytes for unauthorized viewers.

**Storage:** still **LOCAL_DEV** (Pass 17 honesty unchanged).

---

## AUDIENCE UX (390)

Backend preview labels (human, not ACL jargon):

| Scope | Label |
|-------|-------|
| private | Only me |
| friends | Friends (+ optional count) |
| specific_people | N people / Selected people |
| group | Group |

Product shell audience selector (create Moment UI chips) is **not** a full 390 capture in this pass — authority is server-complete; human selector polish remains a known product surface gap without inventing settings-heavy UI.

---

## GOLDEN EPISODES

| ID | Result |
|----|--------|
| SOCIAL-14 friends visibility exact matrix | PASS |
| SOCIAL-15 specific people authority | PASS |
| SOCIAL-16 group membership authority | PASS |
| SOCIAL-17 relationship removal | PASS |
| SOCIAL-18 audience edit revokes access | PASS |
| SOCIAL-19 Moment audience does not leak Reality | PASS (architectural invariants) |
| SOCIAL-20 private matrix | PASS |
| media revocation on audience edit | PASS |
| historical dynamic new friend | PASS |
| friends? default deny | PASS |
| block overrides friend | PASS |

**18 relationship trust tests + 14 publishing tests = 32, 0 failures**

---

## PROPERTY INVARIANTS

- `contact_match_does_not_imply_friend_access`
- `invite_pending_not_friend`
- `inference_cannot_expand_audience`
- `attribution_does_not_expand_visibility`
- `block_overrides_friend_visibility`
- `audience_edit_revokes_media_access`
- `group_nonmember_cannot_view_group_moment`
- `new_friend_historical_access_follows_policy` (dynamic true)
- `removed_friend_historical_access_follows_policy` (dynamic deny)

---

## FILES

| Path | Role |
|------|------|
| `apps/opal_core/lib/opal_core/social_flow/relationship_graph.ex` | Friend/group authority, policy, preview, explain |
| `apps/opal_core/lib/opal_core/social_flow/social_moment_visibility.ex` | Default-deny friends; debug_decision |
| `apps/opal_core/lib/opal_core/social_flow/social_moment_publishing.ex` | viewer_opts → RelationshipGraph; edit audience; media re-check |
| `apps/opal_core/test/opal_core/social_flow/relationship_audience_trust_test.exs` | Matrices + properties |
| `docs/intelligence/evidence/PASS18_RELATIONSHIP_AUDIENCE_TRUST.md` | This evidence |

---

## KNOWN GAPS

1. **390 product audience selector UI** — backend labels ready; full product create-Moment audience chips not captured this pass.
2. **Contact import productization** — resolution digests exist; full import UX is discovery-only (correctly does not grant visibility).
3. **Close relationship / mute / restrict** — not invented; document as future boundary separate from block/hide.
4. **Realtime publish fanout precision** — get/list/media authority is live; dedicated PubSub audience routing audit may still tighten.
5. **LOCAL_DEV media** — unchanged; CDN still not claimed.
6. **No public visibility** — deliberately not invented.

---

## V2 MERGE VERDICT

**HOLD. DO NOT MERGE.**

Social trust is now a first-class authority layer.  
Next external acceleration should still prefer:

1. Social trust polish (UX preview, realtime routing audit)  
2. Live execution (provider → availability → booking)  
3. Economics  

— only after audience trust stays tight under money pressure.

---

## FINAL LAW (ENCODED)

```text
A CONTACT IS NOT AUTOMATICALLY A FRIEND.
AN INFERENCE IS NOT PERMISSION.
AN ATTRIBUTION EDGE IS NOT PERMISSION.
A GROUP EDGE IS ONLY AUTHORITY FOR THAT GROUP CONTEXT.
THE SERVER DECIDES WHO MAY SEE.
THE USER DECIDES WHO THEY SHARE WITH.
OPAL INTELLIGENCE MAY HELP THEM CHOOSE.
IT MAY NEVER SILENTLY EXPAND THE AUDIENCE.
```

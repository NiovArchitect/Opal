# Contact-based social onboarding

**Authority:** FOUNDER-DIRECTED (SF17)  
**Status:** Architecture + web manual path. Full mobile contact picker ships with Expo permission UX.

## Principles

1. Bringing in people you know must be **voluntary**.
2. No full address-book harvest.
3. No “people you may know” membership oracle.
4. Manual phone invite remains the universal fallback.
5. Permission denial is a first-class, calm path.

## Mobile (Expo)

| Step | Behavior |
|------|----------|
| Prompt | Explain why contacts help (“Find people you already text”) |
| Permission | OS contact picker / limited selection (not bulk upload) |
| Matching | Selected numbers only → Elixir `resolve_contact` digests |
| Decline | Skip to manual invite; never re-nag in the same session |

Native module integration is planned against Expo contact APIs. Domain reuse: `Onboarding.resolve_contact/1`, `create_invitation/1`.

## Web fallback

| Step | Behavior |
|------|----------|
| Manual entry | Name + phone (approved fixtures in hosted preview) |
| Invite | Existing product invitation API |
| Accept | Incoming invitations list |

## Privacy

- Digest storage only for identifiers
- Rate limits on resolve/invite
- No public discovery

## Hosted preview honesty

Hosted synthetic environments accept **approved test numbers only** and never send SMS.

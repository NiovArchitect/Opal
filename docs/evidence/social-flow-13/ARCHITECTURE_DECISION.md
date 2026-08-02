# SF13 Architecture Decision — Public Web Runtime

## Selected path

Add **`apps/opal_web`**: static Vite + React DOM public runtime for `opal.niovlabs.com`.

- Conversation-native product shell (Home/Chats/Plans/You) — WhatsApp-class IA, no marketing/demo chrome.
- No product authority in the browser (static seed data until authenticated API path).
- Security headers via Cloudflare Pages `_headers`.
- CSS transitions + reduced motion.

## Rejected

| Option | Why |
|--------|-----|
| Integrate Vibra Code | AGPL platform; Next/Convex/E2B/Clerk conflict with ADR-0002–0005 |
| Next.js as Opal API | Would dual-authority messaging |
| Motion on React Native | DOM-only library |
| Full authenticated web parity | Out of SF13; mobile remains primary client |

## ADR-0004 note

ADR-0004 deferred web as primary client. SF13 adds a **non-authoritative public proof surface** after SF12 RC. Mobile remains primary; Elixir remains authority.

## Public live status

DNS and Cloudflare credentials are operator-owned. This slice ships a green CI build artifact and deploy runbook. Live domain attachment may remain pending → record honestly.

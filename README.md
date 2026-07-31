# Opal

**Private AI relationship operating system.**

Opal is a personal Social Operating System: WhatsApp-like private communication with relationship intelligence underneath—not a chatbot dashboard, not social media, not relationship scoring.

## Status

**Phase 0** product truth and architecture docs are on `main`.  
**Build Slice 1** is merged to `main`: contracts + Elixir core + Python worker + consent-gated `ai_echo` + remote CI + container E2E.  
**Build Slice 2** (branch `build/slice-2-realtime-mobile-foundation`): Phoenix Channels, presence, delivery acks, thin Expo shell.

No production SMS, push, voice cloning, or relationship intelligence yet.

## Hard technical direction

| Layer | Technology |
|-------|------------|
| Realtime / authority | Elixir · OTP · Phoenix · BEAM |
| AI intelligence | Python workers (jobs in, structured results out) |
| Mobile | React Native · Expo · TypeScript |
| Identity | Phone number |
| Repo | Private monorepo (`NiovArchitect/Opal`) |

**Not used as orchestration core:** Node.js.

## Repository layout (target)

```text
apps/           # Opal_core (Elixir), Opal_mobile (Expo) — scaffold after ADR review
services/       # Opal_ai (Python) — scaffold after ADR review
packages/       # contracts, design tokens
docs/           # product, architecture, adr, ux, evidence
infra/          # local, ci, deployment
tests/          # journeys, contracts, load, safety, privacy
```

## Start here

1. [docs/product/Opal_PRODUCT_TRUTH.md](docs/product/Opal_PRODUCT_TRUTH.md)  
2. [docs/product/MVP_BOUNDARY.md](docs/product/MVP_BOUNDARY.md)  
3. [docs/architecture/SYSTEM_CONTEXT.md](docs/architecture/SYSTEM_CONTEXT.md)  
4. [docs/evidence/BLOCKER_LEDGER.md](docs/evidence/BLOCKER_LEDGER.md)  
5. [docs/evidence/PHASE_0_REPORT.md](docs/evidence/PHASE_0_REPORT.md)  

## Isolation note

Work **only** inside this repository root. Do not treat `$HOME` as the project (a home-level git root may exist on founder machines).

## License / visibility

Private. Not open-sourced without founder approval.

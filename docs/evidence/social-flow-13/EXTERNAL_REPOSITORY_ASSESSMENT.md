# Social Flow 13 — External Repository Assessment

**Date:** 2026-08-01  
**Baseline Opal main:** `7eaacaf53c56703f4fa23248e5af4c6a0be52a76`  
**Status:** MANDATORY PRE-CHANGE GATE — completed before application architecture changes  

Sources: public GitHub READMEs and licenses for [vibra-code](https://github.com/sa4hnd/vibra-code), [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), and [Motion for React docs](https://motion.dev/docs/react). Opal manifests inspected under `apps/opal_mobile/package.json`, ADRs 0002/0003/0004/0005, `services/opal_ai`, `packages/contracts`.

No secrets, tokens, or `.env` values were printed or copied.

---

## A. Exact repository believed to be “App Builder”

| Field | Value |
|-------|--------|
| Candidate | https://github.com/sa4hnd/vibra-code |
| Confidence | **confirmed** (matches user citation; README self-describes as open-source AI mobile app builder) |
| Note | There is no single universal project named only “App Builder”; Vibra Code is the specific repository under evaluation |

---

## B. Repository purpose (Vibra Code)

| Classification | Applies? |
|----------------|----------|
| Complete self-hosted application / platform | **Yes** |
| Development environment (modified Expo Go + sandboxes) | **Yes** |
| Reference implementation | **Yes** |
| Reusable UI library | **No** |
| Conventional npm dependency for product apps | **No** |
| Hosted SaaS product (also App Store binary) | **Yes (upstream product)** |

**Verdict:** Platform / complete product / development environment — not a drop-in library.

---

## C. License (Vibra Code)

| Field | Value |
|-------|--------|
| License name | **AGPL-3.0** (badge + LICENSE link on repository) |
| Copyright (visible) | © 2024–2026 Vibra Code contributors |
| Commercial use | Permitted under AGPL, **not** obligation-free |
| Modification obligations | Modified versions that users interact with over a network typically require corresponding source availability (AGPL network clause) |
| Network-use implications | **High** if Opal incorporated Vibra as a networked service component |
| Redistribution | Source and license notices required |
| Legal review advisable | **Yes** before any integration, fork-in-product, or derivative network service |

**Do not interpret “open source” as “no obligations.”**

---

## D. Maintenance condition (Vibra Code)

| Signal | Observation |
|--------|-------------|
| Commit history | **Very small** (~7 commits on main visible) |
| Structure | Multi-part monorepo: backend, mobile (modified Expo Go), expo-template submodule |
| Last visible update (user research) | ~2026-03-06 class activity; treat as low commit volume |
| Classification | **Experimental / low activity** (interesting reference, not a mature dependency) |
| Stars ≠ production quality | Explicitly acknowledged |

---

## E. Main technology stack (Vibra Code)

| Layer | Technology |
|-------|------------|
| API | Next.js 15 (App Router) |
| Database / realtime | Convex |
| Jobs | Inngest |
| Sandboxes | E2B (+ AI agent / Claude Code CLI) |
| Auth | Clerk |
| Payments (optional) | Stripe + RevenueCat |
| Mobile | React Native / Expo (modified Expo Go; RN from source) |
| Chat UI (iOS) | Texture + IGListKit |
| Template | `expo-template` git submodule |

---

## F. Artifact classification (Vibra Code)

**platform + complete product + development environment + reference implementation**

Not: skill, small library, or runtime dependency suitable for Opal product core.

---

## G. Security implications (Vibra Code)

| Area | Risk if integrated into Opal |
|------|------------------------------|
| E2B / arbitrary generated-code execution | High — expands supply-chain and RCE boundary |
| Multi-cloud API keys (Anthropic, E2B, Clerk, Convex) | High — secrets surface |
| Modified Expo / RN source builds | High — maintenance and attestation cost |
| GitHub publish of generated projects | Medium — data leakage if misconfigured |
| ENV modal / provider swapping | Medium — operator error |
| AGPL network copyleft | Legal/compliance — not purely technical |

**Conclusion:** Security and compliance cost of platform integration is incompatible with Opal’s governed Social Flow safety model without a separate product decision and legal review.

---

## H. Architectural conflicts with Opal

| Concern | Opal (accepted) | Vibra Code |
|---------|-----------------|------------|
| Runtime authority | Elixir/OTP + Phoenix (ADR-0002) | Next.js API |
| Database | PostgreSQL + Ecto (ADR-0005) | Convex |
| Jobs | Oban | Inngest |
| AI | Bounded Python workers; consent-gated (ADR-0003) | Claude Code in E2B sandbox |
| Client | Expo RN + TypeScript (ADR-0004); SQLite offline | Modified Expo Go + native Texture chat |
| Identity | Opal communication-identity / fixtures | Clerk |
| Realtime | Phoenix Channels / PubSub | Convex streams |
| Safety | SF9 control plane; Elixir authority | Generated-app execution model |

**Direct platform integration would replace or dual-authority critical layers.** Rejected.

---

## I. Recommended use (Vibra Code)

# STUDY ONLY / ADAPT SELECTED PATTERNS

| Allowed | Forbidden |
|---------|-----------|
| Read docs for chat performance ideas, sandbox boundaries, preview UX concepts | Clone into Opal monorepo |
| Cite patterns in evidence | Install as dependency |
| Optional separate research clone *outside* Opal later | Vendor AGPL code into Opal product paths |
| | Replace Elixir/Python/Postgres/Phoenix/Expo architecture |

---

## J. UI/UX Pro Max verdict

| Field | Value |
|-------|--------|
| Purpose | AI **design-intelligence skill** (styles, palettes, typography, stack guidelines) |
| License | **MIT** |
| Maintenance | **Actively maintained** (releases, CLI, multi-assistant install, large community activity) |
| Runtime | **Not** an application framework or server |
| Supports | React Native, Flutter, SwiftUI, Jetpack Compose, React, Next.js, etc. |
| Adopted for SF13 | Calm dark shell tokens, WCAG-oriented contrast, reduced-motion, no emoji-as-icon, no AI purple/pink gradients, progressive disclosure, touch targets ≥44 |
| Rejected | Dashboard/analytics aesthetics, engagement scoring chrome, style systems that contradict Opal product truth (privacy, no Social Score) |
| Authority | **Not** over Opal product truth or ADRs |

---

## K. Correct animation library

### Opal mobile (`apps/opal_mobile/package.json`)

| Package | Installed? |
|---------|------------|
| `react-native-reanimated` | **No** |
| `motion` / `framer-motion` | **No** |
| Current animation | RN StyleSheet + press states only |

### Guidance

| Surface | Library |
|---------|---------|
| Expo / React Native mobile | **React Native Reanimated** when motion is required; existing RN primitives for simple cases |
| Public DOM website | **CSS transitions** for SF13 baseline; **Motion for React** optional for richer web motion later |
| Motion for React | Browser **HTML/SVG** React — **not** primary RN animation |

**SF13 decision:**  
- Web: CSS transitions + `prefers-reduced-motion` (no Motion dependency required for closure).  
- Mobile: document Reanimated as the approved future path; **do not** force install in this slice unless a mobile animation feature is needed (none required for public web runtime).  
- Do **not** apply Motion components to React Native views.

---

## L. Smallest safe integration plan

1. **Do not** clone or vendor Vibra Code into Opal.  
2. **Do** add a separate **DOM** public runtime under `apps/opal_web` that:
   - presents product truth, legal honesty, and a **synthetic demo** shell;
   - never claims Elixir authority is replaced;
   - uses design tokens aligned with SF11/12 shell;
   - uses CSS motion with reduced-motion respect.
3. **Do** apply UI/UX Pro Max checklist items as design filter only.  
4. **Do** preserve ADRs 0002–0005; SF13 **extends** public surface after SF12 (ADR-0004’s “web deferred” is superseded only for a **non-authoritative public web proof**, not for primary client or backend).  
5. **Deploy** static build capable of serving at `opal.niovlabs.com` (Cloudflare Pages / static host); if DNS/credentials unavailable in this environment, record **OPAL PUBLIC RUNTIME: NOT LIVE** with deployable artifact + runbook.  
6. **Rollback:** remove `apps/opal_web` deploy; mobile and Elixir remain authoritative.

---

## M. Architecture decision record (summary)

| Option | Decision |
|--------|----------|
| Integrate Vibra platform | **Rejected** |
| Study Vibra patterns only | **Accepted** |
| Use UI/UX Pro Max as design intelligence | **Accepted** |
| Motion on mobile | **Rejected** |
| Motion on web (optional) | **Deferred** (CSS first) |
| Reanimated on mobile | **Approved path** when needed |
| Public static/DOM web at opal.niovlabs.com | **Accepted** (SF13 objective) |
| Next.js + Convex backend for Opal | **Rejected** |

---

## N. Residual risks

- Public web is **not** full product parity with mobile offline/SQLite.  
- Live DNS for `opal.niovlabs.com` requires operator credentials outside this agent sandbox.  
- AGPL reference materials must not be copied into Opal source.  
- Design intelligence must not introduce scoring, ads, or public social-graph UX.

**Assessment complete. Application changes for public runtime may proceed under this plan.**

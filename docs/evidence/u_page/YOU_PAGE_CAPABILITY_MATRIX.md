# YOU PAGE CAPABILITY MATRIX

**Status:** AUDIT — architecture + inventory (repair only clear RED later)  
**At:** 2026-10-13  
**Tip context:** post Reality Gate / Pass 2 constitution (`1b347ff7`+)  
**Surface name:** **YOU** (not Settings)  
**Laws:** `VISIBLE_SETTING_REQUIRES_WORKING_BEHAVIOR` · `CONSUMER_TECHNICAL_LEAK=0` · Pass 2 LOCKED  
**Sources:** `OpalApp.tsx` YOU hub · `YouSettingsDestination.tsx` · `settingsWireClass.ts` · prior Pass B matrix

## Mental model

> YOU = where I teach Opal how I want to experience the world.

Each card is a **life domain capability surface**, not an app-config row.

Audit questions per card:

1. Visible?  
2. Clickable?  
3. Destination renders?  
4. Options functional?  
5. Selection persists?  
6. Changes Opal behavior?  
7. Respects permissions?  
8. Updates rest of app?

---

## Hub (YOU home)

| Card | Visible | Destination | Intent (life domain) | Current consumer reality | Gap vs architecture |
|------|---------|-------------|----------------------|--------------------------|---------------------|
| Edit profile | Yes (identity header) | `edit-profile` | Who am I? | Name/username + Save GREEN; bio HIDE | Photo upload HIDE; must remain E2E identity |
| Privacy | Yes | `privacy` | What may Opal understand? | Filed: What Opal Remembers + Celebrations; audience toggles HIDE | Future **Opal Understanding** depth (Pass 2) — not Memory ON |
| Feed & discovery | Yes | `feed-discovery` | World vs possibility | Filed: Invite friends; feed/discovery prefs HIDE | **Split Feed vs Discovery** psychologically; today one card |
| Location & travel | Yes | `location-travel` | Coordinate life | Home TZ + Travel mode GREEN; live share HIDE | Live share / ETA / home area not productized |
| Calls & Opal Assist | Yes | `calls-assist` | Assist authority | Assist toggle + What Opal Can Do (consent) GREEN | Suggest/Prepare/Execute ladder incomplete |
| Notifications | Yes | `notifications` | What deserves attention? | Messages & calls + read receipts GREEN | Graph/live/social/critical push HIDE |
| Appearance | Yes | `appearance` | How Opal feels present | System/Dark/Light GREEN | Presence intensity / reduced motion not yet |
| Linked devices | Yes | `linked-devices` | Where Opal exists | This phone info GREEN | Desktop link / revoke HIDE |
| Spending & fit | Yes (More) | `spending-fit` | Lifestyle + wellness | SpendingComfort + wallet filed GREEN | Internal **Spending vs Fit** split; learning toggles HIDE |
| Account & security | Yes (More) | `account-security` | Control & exit | Linked devices nav + delete nest GREEN | Change phone / 2FA UI / session alerts HIDE |
| Find people | Yes (Account section) | `FindPeopleFlow` | Graph entry | Opens invite/find flow | Must be contacts → match → invite → relationship (no fake roster) |
| Engagement | **Hub hidden** | `engagement` | Content engagement prefs | All controls HIDE | Keep hidden until prefs exist |
| Safety | **Hub hidden** | `safety` | Block/mute/report | All controls HIDE | Keep hidden until lists exist |

**Copy debt (YELLOW):** hub label “More settings below” still says *settings* — rename later to YOU-aligned language (e.g. “More on You”) without expanding scope this audit.

---

## Card detail

### Profile — Edit profile

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Screen | Edit profile | — | — | — |
| Options | Name, Username, Save | `updateProfile` → product profile | Bio HIDE; photo HIDE | Prove reload-everywhere; no fake bio |
| Behavior | Session name/handle | Profile API | Cross-surface display check | RED if save fails to persist |

### Privacy — Opal Understanding gateway

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Screen | Privacy & audience | — | Audience toggles HIDE | Correct hide |
| Filed | What Opal Remembers · Celebrations | Memory transparency · celebrations API | Depth levels (Basic/Connected/Relationship-aware) | Pass 2 design only |
| Intent | Permission to understand | — | Conversation / relationship / location / calendar permission matrix | Do not ship Memory ON |

### Feed & Discovery

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Screen | Combined card | InviteFriendsSection | Feed ranking / discovery prefs | Keep HIDE |
| Intent split | Blurred | — | Separate Feed vs Discovery UX | Architecture debt |

### Location & Travel

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Options | Home timezone, Save, Travel mode (read) | home TZ store | Live share, ETA, home area, map handoff | HIDE until real |
| Intent | Coordinate life | — | Relationship-scoped share | Align with Graph |

### Calls & Opal Assist

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Options | Assist on calls | Assist preference API | Ask every / remember signals / call privacy | HIDE |
| Filed | What Opal Can Do | ConsentProof grant/revoke | Full Suggest→Prepare→Execute UX | Expand authority UI carefully |

### Notifications

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Options | Messages & calls, Read receipts | messaging prefs API | Attention categories (plans, people, moments, suggestions) | HIDE push cats |

### Appearance

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Options | System / Dark / Light | localStorage theme | Animation / a11y / presence level | Theme GREEN; rest later |

### Linked Devices

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Options | This phone | Session projection | Desktop QR, revoke roster | HIDE |

### Spending & Fit

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Filed | SpendingComfort + wallet | financial profile / wallet APIs | Fit/wellness domain; learn-from-choices | Keep learning HIDE (Pass 2) |

### Account & Security

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Options | Linked devices, Delete nest, Keep account | Delete API not exposed — honest note | Change phone, 2FA UI, session alerts | Honest; no fake delete |

### Find People

| Field | Current | Backend | Missing | Fix posture |
|-------|---------|---------|---------|-------------|
| Entry | YOU → Find people | FindPeopleFlow + invites | Native contacts permission honesty | RED if fake contacts screen |

---

## Counts (SCREENS rows)

| Class | Approx |
|-------|--------|
| Consumer-visible SCREENS controls (excl. notes) | Profile fields/actions, Assist, notif toggles, TZ, travel, theme, account navs, keep-account |
| HIDE (`blockedReason` → not painted) | 43 inventory rows |
| Filed live sections | Remembers, Celebrations, Can Do, Invites, SpendingComfort, AppearanceTheme |
| Hub-hidden domains | Engagement, Safety |

## Pass 2 lock note

Privacy / Remembers / learning toggles must not imply unlocked relationship intelligence. Understanding objects require founder unlock + Permission Capability Matrix row.

## Related

- `PERMISSION_ACTION_MAP.md`  
- `YOU_ENDPOINT_AUDIT.md`  
- `MOBILE_YOU_FLOW_REPORT.md`  
- `docs/authority/OPAL_PERMISSION_ARCHITECTURE.md`  

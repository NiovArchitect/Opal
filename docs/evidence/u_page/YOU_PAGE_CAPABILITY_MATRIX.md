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

## Hub hierarchy (person-centered)

Authority: `docs/authority/YOU_PAGE_HIERARCHY.md` — keep YOU; contains settings; not a gear drawer.

| Section | Cards |
|---------|-------|
| Your Identity | Profile header · Edit profile |
| Your World | Grow Your Circle · Feed & discovery · Location & travel |
| Your Relationships | Privacy |
| How Opal Helps | Calls & Opal Assist · Notifications · Appearance · Spending & fit |
| Your Account | Linked devices · Account & security · Sign out |

## Hub (YOU home)

| Card | Visible | Destination | User expects | System must prove | Current | Gap |
|------|---------|-------------|--------------|-------------------|---------|-----|
| Edit profile | Yes (identity) | `edit-profile` | Who am I? | UI→API→DB→reload→all surfaces | Save + session patch | Bio/photo HIDE |
| Privacy | Yes | `privacy` | I control Opal | Permission / transparency persists | Remembers + Celebrations filed | Future Opal Understanding card |
| Feed & discovery | Yes | `feed-discovery` | My world + possibility | Feed ≠ Discovery psychologically | Invites filed; prefs HIDE | Split UX later |
| Location & travel | Yes | `location-travel` | Opal helps coordinate | Sharing boundaries | Home TZ + travel GREEN | Live share HIDE |
| Calls & Opal Assist | Yes | `calls-assist` | Opal helps me communicate | Access + action authority clear | Assist + Can Do GREEN | Suggest/Prepare/Execute UI |
| Notifications | Yes | `notifications` | What deserves attention | Prefs persist | Messages + receipts GREEN | Push categories HIDE |
| Appearance | Yes | `appearance` | How Opal feels present | Theme persists | System/Dark/Light GREEN | Presence/a11y later |
| Linked devices | Yes | `linked-devices` | Opal follows me | Device state is real | This phone GREEN | Desktop/revoke HIDE |
| Spending & fit | Yes | `spending-fit` | Lifestyle fit | Comfort persists | SpendingComfort GREEN | Fit split; learn HIDE |
| Account & security | Yes | `account-security` | I stay in control | Honest delete / sessions | Nested delete GREEN | Phone/2FA HIDE |
| Grow Your Circle | Yes (Your World) | `FindPeopleFlow` | I can connect my world | Contacts→match→invite honesty | Real flow; no fake roster | Native contacts path |
| Engagement / Safety | Hub hidden | — | — | — | All nested HIDE | Keep hidden |

**Naming:** Grow Your Circle (social growth) lives under Your World — not under Account as a setting.

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

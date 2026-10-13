# PERMISSION ACTION MAP (YOU)

**Status:** AUDIT skeleton — maps permission → YOU surface → behavior  
**At:** 2026-10-13  
**Pass 2:** LOCKED  
**Law:** Permission ≠ knowledge. Permission = allowed to observe a category.

Columns:

| Permission | YOU location | Options | Backend state | Data source | Who can access | What Opal can do | How user revokes |

---

## Identity

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Edit my display identity | Edit profile | Name, Username, Save | Product profile | User profile row | Self | Show name across surfaces | Edit again / sign out |
| Bio / photo | Edit profile | HIDE | — | — | — | Nothing until media/bio API | — |

## Understanding (Pass 2 gateway — design only)

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| See what Opal stores (transparency) | Privacy → What Opal Remembers | List / manage facts | Memory transparency API | MemoryCandidate / RelationshipMemory | Self | Show stored items | Delete / dismiss in section |
| Celebrations | Privacy → Celebrations | CRUD dates | Celebrations API | Owner-scoped celebrations | Self | Reminders into Attention | Delete celebration |
| Conversation understanding depth | Privacy (future) | Not shipped | — | — | — | — | — |
| Relationship context | Privacy (future) | Not shipped | — | — | — | — | — |
| Learn from my choices | Spending & fit | HIDE | Would need feedback store | — | — | Forbidden until unlock | — |

## Assist & action authority

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Opal Assist on calls | Calls & Opal Assist | ON/OFF | Assist preference | Preference row | Self | Assist during calls (product rules) | Toggle off |
| Place calls / reserve (consent) | Calls → What Opal Can Do | Grant / revoke capabilities | ConsentProof | consent_proofs | Self | Suggest→Prepare→Execute only with grant | Revoke capability |
| Ask every call / remember signals | Calls | HIDE | — | — | — | — | — |

## Messaging attention

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Message & call notifications | Notifications | ON/OFF | Messaging prefs API | Prefs | Self | Notify for messages/calls | Toggle off |
| Read receipts | Notifications | ON/OFF | Messaging prefs API | Prefs | Self + counterparties per product | Send/show receipts | Toggle off |
| Graph / live / social / critical push | Notifications | HIDE | Needs Expo/APNs categories | — | — | — | — |

## Location coordination

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Home timezone | Location & travel | Field + Save | Home TZ store | Preference | Self | Travel mode projection, timing | Change TZ |
| Travel mode | Location & travel | Read projection | Derived from device vs home TZ | Device TZ | Self | Shift quiet hours / plan times | Return home TZ match |
| Live share / ETA / home area | Location & travel | HIDE | Need session APIs | — | — | — | — |

## Social graph entry

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Find / invite people | YOU → Find people | FindPeopleFlow | Invites / contacts match | Product invites | Self | Start relationships | Close flow; decline invites |
| Feed ranking / discovery prefs | Feed & discovery | HIDE | Prefs APIs missing | — | — | — | — |

## Commerce / lifestyle

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Spending comfort | Spending & fit | Budget / Moderate / Comfortable | Financial profile API | Trust-gated profile | Self | Shape suggestions | Change / delete profile |
| Wallet threshold | Spending & fit | Wallet controls | Wallet API | Wallet ledger | Self | Load/checkout per product | Adjust threshold |
| Fit / wellness goals | Spending & fit | Not separate | — | — | — | — | Separate domain later |

## Presence & devices

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Appearance theme | Appearance | System / Dark / Light | localStorage | Client | Self | Theme tokens | Change theme |
| This device session | Linked devices | Info | Session | DeviceSession | Self | Stay signed in | Sign out |
| Desktop / revoke other devices | Linked devices | HIDE | Roster/mint APIs | — | — | — | — |

## Account control

| Permission | YOU location | Options | Backend | Data source | Who | What Opal can do | Revoke |
|------------|--------------|---------|---------|-------------|-----|------------------|--------|
| Sign out | YOU Account | Button | Clear session | Local + server session | Self | End this browser | — |
| Delete account | Account → Delete | Nested; self-serve HIDE | Support path honest | — | Self | — | Keep account CTA |

---

## Required zeros

- Permission without revoke path = 0 (for any GREEN capability)  
- Visible control without behavior = 0  
- Pass 2 understanding without Permission + Correction + Scope + Time tests = 0  

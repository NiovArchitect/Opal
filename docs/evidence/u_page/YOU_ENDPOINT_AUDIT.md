# YOU ENDPOINT AUDIT

**Status:** AUDIT — UI → API → persistence map for YOU capabilities  
**At:** 2026-10-13  
**Pass 2:** LOCKED  
**Classifier:** `apps/opal_web/src/opalUi/settingsWireClass.ts` (GREEN / HIDDEN)

## GREEN paths (consumer-visible working wires)

| YOU control | FE entry | Client API | Backend / store | Persist | Behavior |
|-------------|----------|------------|-----------------|---------|----------|
| Save profile | `edit-profile` → `updateProfile` | `productClient.updateProfile` | Product profile | DB + session | Name/handle across app |
| Save home timezone | `location-travel` | `updateHomeTimezone` / `getHomeTimezone` | Home TZ store | Yes | Travel mode projection |
| Travel mode (read) | `location-travel` | `getHomeTimezone.active` | Derived | n/a | Display only |
| Opal Assist on calls | `calls-assist` toggle | `get/updateAssistPreference` | Assist prefs | Yes | Call Assist behavior |
| Messages & calls notif | `notifications` | `updateMessagingPreferences(message_notifications_enabled)` | Messaging prefs | Yes | Notification gating |
| Read receipts | `notifications` | `updateMessagingPreferences(read_receipts_enabled)` | Messaging prefs | Yes | Receipts |
| Appearance theme | `appearance` | `setAppearancePreference` | `localStorage` `opal.appearance.theme.v1` | Client | `data-theme` |
| This phone | `linked-devices` | Local session | DeviceSession | Session | Info |
| Linked devices nav | `account-security` | Opens nested | — | — | Navigation |
| Keep my account | `delete-account` | Local dismiss | — | — | Back |
| What Opal Can Do | filed on calls-assist | `list/grant/revokeConsent` | `consent_proofs` | Yes | Capability grants |
| What Opal Remembers | filed on privacy | Memory transparency APIs | Memory stores | Yes | List/manage |
| Celebrations | filed on privacy | Celebrations product API | Celebrations | Yes | Dates → Attention |
| Invite friends | filed on feed-discovery | Product invites | invites | Yes | Invite codes / sends |
| Spending comfort / wallet | filed on `spending` | Financial + wallet APIs | Profiles / ledger | Yes | Suggestion comfort |
| Fit domain | `fit` destination | Boundary notes only | — | Honest empty | Wellness store later |
| Find people | YOU Account row | `FindPeopleFlow` | Invites / people | Yes | Graph entry |
| Sign out | YOU Account | Session clear | Session | Yes | Logged out |

## HIDDEN inventory (not painted; keep until real endpoint)

Representative blockers (full list in `YOU_SETTINGS_END_TO_END_MATRIX.md` / SCREENS `blockedReason`):

| Control family | Needs |
|----------------|-------|
| Bio / photo | Profile bio field + media storage |
| Graph visibility / join requests | Graph audience + join policy APIs |
| Feed ranking / discovery / nearby | Preferences + discovery index |
| Live share / ETA / home area / map | Location session + places + deep links |
| Engagement counts / comments / reposts | SocialMoment prefs + ACL |
| Call ask-every / remember signals / privacy | Assist prompt UI + retention policy |
| Push categories | Expo rebuild + APNs category prefs |
| Desktop link / revoke device | Session mint + device roster |
| Safety lists | Block/mute/report endpoints wired to UI |
| Learn from choices / trip goals | Feedback store + Trips domain (Pass 2 adjacent) |
| Change phone / 2FA / session alerts | OTP re-verify + session event feed |
| Self-serve delete | Account deletion endpoint |

## Classifier vs SCREENS

| Source | Role |
|--------|------|
| `SETTINGS_WIRE_CLASSIFICATION` | Canonical GREEN shortlist for tests |
| SCREENS `blockedReason` + paint `return null` | Consumer hide (Pass B) |
| Filed sections | Live capability islands inside YOU domains |

## Risks

| Risk | Note |
|------|------|
| Profile save claimed GREEN | Must re-verify UI→API→DB→reload→all surfaces (founder-reported persist bugs = RED until re-proof) |
| Find people | Must not paint fake contacts; permission → match → invite |
| Privacy / Remembers | Transparency ≠ Pass 2 unlock |
| Spending “learn from choices” | Stay HIDE under Pass 2 lock |

## Related

- `YOU_PAGE_CAPABILITY_MATRIX.md`  
- `PERMISSION_ACTION_MAP.md`  
- Prior: `docs/evidence/founder_staging_walk_correction/YOU_SETTINGS_END_TO_END_MATRIX.md`  

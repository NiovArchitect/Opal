# YOU Permissions Tranche

**Status:** TRANCHE COMPLETE (consumer wire + hide)  
**At:** 2026-10-13  
**Pass 2:** LOCKED — `PASS2_UNLOCKED = NO`  
**Track B:** untouched — `TRACK_B_TOUCHED = NO`  
**Verify:** `shots/you_page/YOU_PERMISSIONS_VERIFY.json`  
**Script:** `apps/opal_web/scripts/_you_permissions_verify.mjs`

## Required zeros (proven)

| Metric | Value |
|--------|-------|
| `DEAD_ACTIONS` | 0 |
| `FAKE_SUCCESS` | 0 |
| `VISIBLE_BUT_UNWIRED` | 0 |
| `CONSUMER_TECH_LEAK` | 0 |
| `PASS2_UNLOCKED` | NO |
| `TRACK_B_TOUCHED` | NO |
| Overall | **GREEN** |

## Differentiator preserved

> Opal does not optimize preference similarity. Opal optimizes contextual alignment.

Complexity inside Opal. Simplicity with humans. (`OPAL_COMPLEXITY_LAW` · Agent Interpretation Guardrail)

## Access vs Action

| Layer | Meaning | YOU surface |
|-------|---------|-------------|
| **Access** | May Opal observe this category? | Privacy → What Opal may access · Assist on calls · Home TZ · Notifications |
| **Action** | What may Opal do with permission? | Calls → What Opal can do (Suggest → Prepare → Execute) · ConsentProof grant/revoke |

Users control: permissions · visibility · sharing · corrections · revocation.  
Opal owns: interpretation · alignment · assistance machinery (no algorithm knobs on YOU).

## Card status (consumer)

| Card | Live consumer surface | Hidden / blocked (exact reason) |
|------|----------------------|----------------------------------|
| Edit Profile | Name/username save → profile API → hub reload | Bio (no profile bio API) |
| Privacy | Access control section · Remembers forget · Celebrations CRUD · RU-1 types · Trust tier | Graph audience · live location share · engagement counts · join policy · Pass 2 understanding depth |
| Feed & Discovery | Invite friends (create/list/share) | Ranking prefs · nearby · suggested people/experiences (prefs APIs / discovery index) |
| Location & Travel | Home TZ save + travel mode projection | ETA timing · live share · home area · map handoff |
| Calls & Opal Assist | Assist Access toggle · Action grants (calls_outbound, bookings_reserve) with revoke | Ask-every · post-call Graph suggest · remember signals · call privacy screen |
| Notifications | Messages & calls · Read receipts | Graph/live/social/critical push (Expo/APNs) |
| Appearance | System/Dark/Light → localStorage → `data-theme` | Presence/a11y later |
| Linked Devices | This phone (session projection) | Desktop QR mint · revoke roster APIs |
| Spending | Comfort + wallet (trusted+) | Learn-from-choices (Pass 2) · trip goals · per-Graph spend |
| Fit | Honest empty boundary notes | Wellness preference store · wellness goals |
| Account & Security | Linked devices nav · Keep account · honest delete nest | Change phone OTP · 2FA UI · session alerts · self-serve delete API |
| Grow Your Circle | Honest chooser (no fake roster) | Native contacts OS path when unavailable |

## Shipped this tranche

1. Agent Interpretation Guardrail (continuity audit + Complexity Law).  
2. Privacy **Access** framing (`YouAccessControlSection`) — live Access rows only; Pass 2 understanding held.  
3. Calls **Action** ladder copy (Suggest → Prepare → Execute) on ConsentProof grants.  
4. Honest destination ledes (Privacy / Feed / Location / Calls / Notifications / Fit hub subtitle).  
5. Assist preference: revert + error on API failure (no FAKE_SUCCESS).  
6. Home timezone save refreshes travel-mode projection.  
7. Expanded Playwright verify for every hub card + profile round-trip + grow honesty.

## Explicitly not done (correct)

- Understanding Candidates  
- Memory expansion / inference / scoring / personality classification  
- Preference learning toggles  
- Track B call transport  
- Pass 2 unlock  

## Related

- `YOU_PAGE_CAPABILITY_MATRIX.md`  
- `PERMISSION_ACTION_MAP.md`  
- `YOU_ENDPOINT_AUDIT.md`  
- `docs/authority/OPAL_PERMISSION_ARCHITECTURE.md`  
- `docs/authority/USER_VS_CONTROL_LAW.md`  
- `docs/authority/OPAL_COMPLEXITY_LAW.md`  
- `shots/steward/CONTINUITY_INTEGRITY_AUDIT.md`  
)

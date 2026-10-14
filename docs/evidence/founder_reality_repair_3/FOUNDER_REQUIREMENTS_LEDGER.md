# Founder Reality Repair #3 — Requirements Ledger

**Walk / reconcile tip:** `1a5600a1`  
**Branch:** `muse/packet-b-batch-2`  
**Law:** `CLAIMED_COMPLETION_WITHOUT_REQUIREMENT_COMPLETION` ends here.  
**States:** `IMPLEMENTED` → `PROVEN` → `FOUNDER ACCEPTED` (only the third closes a founder issue)  
**Freeze:** HOLD · **Pass 2:** LOCKED  

**Machine contradiction at tip:** `shots/you_page/YOU_PERMISSIONS_VERIFY.json` → `overall=RED`, `FAKE_SUCCESS=1`. Report may not say GREEN while this is RED.

Status vocabulary (no “done” from file/DOM existence alone):

| Status | Meaning |
|---|---|
| `DONE_AND_PROVEN` | Code + automated runtime proof; still needs founder phone for FOUNDER ACCEPTED |
| `IMPLEMENTED_NOT_PHONE_PROVEN` | Code present; phone acceptance pending |
| `PARTIAL` | Some of the ask exists; requirement incomplete |
| `BROKEN` | Code exists but runtime contradicts the ask |
| `MISSING` | Ask not present |
| `EXTERNAL_BLOCKER` | Outside this tranche / credentials / Pass 2 lock |

---

## Onboarding / identity

| REQUEST | AUTHORITY / ASK | CURRENT IMPLEMENTATION | RUNTIME PROOF | STATUS | FIX IF NOT GREEN |
|---|---|---|---|---|---|
| Splash 1 = one founder-approved animated Opal identity | Walk #2 P0; Repair #2 | Splash uses `opal-character.png` only (collage removed) | Playwright 390×844 character shot | `PARTIAL` / OPEN | Confirm/replace with founder-approved animated lockup asset if character-only is incomplete brand |
| Splash 2 preserved | Holy Shit / first-run | Splash 2 path retained in first-run | Tests reference skip=0 | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Phone → OTP | First-run | FirstRunExperience phone/OTP | Production_sms live | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Full phone autofill no country-code duplicate | Founder walk | Normalization in phone path (Repair #1/#2 era) | Code present | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Permissions before Meet | Permission bootstrap | PermissionBootstrapPage before Meet | Allowed ✓ screenshots | `DONE_AND_PROVEN` (direction) | Founder ACCEPTED still phone |
| Granted permission looks granted | Walk #2 | Allowed ✓ treatment | Screenshots GREEN direction | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Permission copy consumer language | Brand V4 | Rewritten ledes | YOU_PERM leak scan 0 on assigned | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Meet asks name directly | Holy Shit | MeetOpalConversation name turn | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Handle auto-generated | Holy Shit | `suggestUsernameFromName` | Unit tests | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Unavailable handle frictionless alternate | Walk #2 | Soft copy “Your name is popular…” | Unit / copy | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Identity before first-person | Repair #1/#2 | `handleCommitted` gate | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone walk |
| Meet turns = lightweight history | Walk #2 | History model in MeetOpalConversation | Code; needs phone | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone acceptance |
| One active question/composer | Walk #2 | `is-primary` / `is-history` | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone acceptance |
| First person → real person resolution | Meet | Contacts / type path | Code | `PARTIAL` | Prove resolution → connect/invite |

---

## People / Find

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Contacts / Find / Search / Add / Invite = one human intent | Walk #2 | Separate plus actions + Grow Circle / FindPeopleFlow | Overlay z fixed in #2 | `PARTIAL` | Unify IA: Opal user→connect; contact→resolve; else→invite |
| Phone visibility by permission | Relationship Access | Bounds / phone save on profile | Code | `PARTIAL` | Prove on Call Continuity + profile |
| Grow Your Circle clean ownership | Walk #2 | FindPeople z↑ + scroll-lock | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone re-proof |

---

## Founder / demo reality

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Seed Chats ≥5: Chanelle, Maya, Juniper crew, Sabrina, Alex | Founder walk | `FOUNDER_CHATS_PLAN_PILL_ROWS` (5 names) + `remapFounderChatRowsToLive` returns seed when live empty; `composeChatsList` uses remapped when `isFounderSeedEnabled()` | Fixtures exist; **phone empty Chats = BROKEN runtime** | `BROKEN` | Trace seed flag + compose pipeline on device; force paint when seed on; never silent 0 rows |
| Calls / Home / Stories / Graphs / Live fixtures usable | Founder seed | Seed feeds / call continuity rows exist | Calls visible on phone; Chats empty contradiction | `PARTIAL` / `BROKEN` (Chats) | Repair seed Chats paint |
| Seed-off production honest | Pass 1 law | compose seed-off = live only | Code | `DONE_AND_PROVEN` (law) | Preserve |

---

## Chats

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Founder chat list populated | Walk | compose when seedOn | Phone empty | `BROKEN` | P0 B |
| New chat works | Product | NewChatPicker | — | `IMPLEMENTED_NOT_PHONE_PROVEN` | Prove |
| Person/profile Chat opens thread | Walk #2 / #3 | openChat if chats.find match | — | `PARTIAL` | Same as Call→Chat resolve |
| **New Call / Continuity → Chat opens that person’s thread** | Founder Maya failure | `onChat`: find by name → setTab chats; **openChat only if match** (`OpalApp.tsx` ~10811–10818) | Exact dead-end when no loaded chat | `BROKEN` | Resolve seed id / `ensureDirectConversation` / create+open; never land on list alone |
| Thread composer = Center language | Walk #2 | `opal-composer-brand` on composer-618 | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| Keyboard never blocks composer | Shell | Thread bottom inset; Center focus-within hide | Center pre-focus RED | `BROKEN` (Center) | Geometry first |
| Active shared plan visible in thread | Walk #2 | Plan pills on list; strip in-thread PARTIAL | Report admitted partial | `PARTIAL` | Complete plan context strip |

---

## Calls

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Call log / New Call / audio/video/group | Product | ChatsHome Calls surface + CallContinuity | Phone sees people | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| Chat from Continuity | Founder | Broken fallback | Maya | `BROKEN` | P0 C |
| Twilio live path | Track B | createConversationCall | Where available | `PARTIAL` | Preserve; no fake |
| Phone by relationship permission | Access | Profile phone save | — | `PARTIAL` | Prove |

---

## Opal Center

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Reachable from dock | IA | tab opal / ambient | — | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| **Composer hittable BEFORE focus** | Repair #3 | Dock hide on `:focus-within` only (`styles.css` ~23456+) | Causal backwards | `BROKEN` | Permanent dock exclusion / immersive Center; then keyboard |
| Dock does not move with scroll | Shell | fixed tabbar | #1 claimed | `IMPLEMENTED_NOT_PHONE_PROVEN` | Re-prove |
| Page scrolls | Shell | center scroll | — | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| Keyboard-safe | Walk | focus-within hide | Unreachable | `BROKEN` | After pre-focus geometry |
| No diagnostic language | Walk #2 | Provenance hidden; Ambient humanized | Code; phone re-proof | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| Nearby / What’s next / Tonight / Today Week Shared | Center | Rest chips / phases | — | `PARTIAL` | Calendar honesty |
| Context ≠ YOU | Walk #2 | In-Center sheet + Manage permissions | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| Honest insufficient context | Walk #2 | humanResolveNote | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |

---

## Graphs

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Graphs owns root when selected | IA | tab graphs | — | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| One New → Plan / Trip / Idea | Walk #2 | Head New trip pill removed; Create menu remains | Code | `PARTIAL` | Prove one entry; **stable opaque Create layer** |
| Create popover no bleed | Founder #3 | Popover transparency artifact | Phone | `BROKEN` | Opaque/frosted stable surface |
| Plan WHO/WHEN/WHERE retained | Journey | GraphCreateFlow | — | `PARTIAL` | Person-specific context |

---

## Home / social / Story / Live

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Social Home | Graph social home | graph-social-home | — | `IMPLEMENTED_NOT_PHONE_PROVEN` | Density under seed |
| Story create above page | Walk #2 | z-index ↑ 80 / 10060 | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| **Live normal-user path** | Repair #2/#3 | `you-go-live` **only if** `isFounderSeedEnabled()` (`OpalApp.tsx` ~12063) | Seed-only | `BROKEN` / `PARTIAL` | Expose per Live authority (Center/Home/Now); not seed-gated |
| Live = immediacy/context not livestream | Paste K / founder | LivesGoLivePanel venue confirm | Panel exists | `PARTIAL` | Wire normal entry + permissions |

---

## YOU

| REQUEST | AUTHORITY | CURRENT | PROOF | STATUS | FIX |
|---|---|---|---|---|---|
| Visible rows = real persisted behavior or not actionable | Brand V4 / #3 | Many blockedReason rows hidden; some live | YOU_PERMISSIONS overall **RED**, FAKE_SUCCESS=1 | `PARTIAL` / evidence RED | Zero FAKE_SUCCESS; audit every visible control |
| Edit Profile persist | Product | PATCH profile + onProfileSaved | Probe ok Walk1835 | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone relaunch |
| Privacy / Assist / Notifications / Appearance consumer copy | Brand V4 | Rewritten | Leak 0 assigned | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| Spending comfort real | Product | Comfort persistence | Probe comfort true | `DONE_AND_PROVEN` (automation) | Founder ACCEPTED phone |
| **Fit functional** | Founder | Hub row + destination; **activity prefs / wellness blockedReason unavailable** | FAKE_SUCCESS / honestEmpty false | `BROKEN` / `PARTIAL` | Smallest real Fit substrate + persistence |
| **Travel automatic** | Founder | Field init `"travel-mode": "Off"` (`YouSettingsDestination.tsx` ~763); ingest can set On | Hardcoded Off default | `MISSING` / `BROKEN` vs ask | Default intelligent when device TZ ≠ home; Off is opt-out not opt-in |
| Long pages scroll above dock | Shell | you-settings-body | — | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone + keyboard |
| Grow Circle | Walk #2 | Overlay fix | Code | `IMPLEMENTED_NOT_PHONE_PROVEN` | Phone |
| Sign out | Product | Present | — | `DONE_AND_PROVEN` | — |

---

## Caps (Repair #3 targets)

```
FOUNDER_SEED_CHAT_WORLD = RED → must become PROVEN (≥5 named fixtures painted)
CALL_TO_CHAT_THREAD = RED → must become PROVEN
CENTER_COMPOSER_PREFOCUS = RED → must become PROVEN
CENTER_KEYBOARD_SAFE = RED → after prefocus
DOCK_FIXED = re-prove
GRAPH_CREATE_LAYER = RED → stable opaque
STORY_CREATE = IMPLEMENTED_NOT_PHONE_PROVEN
GROW_CIRCLE = IMPLEMENTED_NOT_PHONE_PROVEN
PROFILE_PERSISTENCE = IMPLEMENTED_NOT_PHONE_PROVEN
FIT_FUNCTIONAL = RED/PARTIAL → real substrate
LIVE_NORMAL_USER_PATH = RED → not seed-only
TRAVEL_AUTOMATIC = MISSED → natural TZ adaptation
ACTIVE_PLAN_THREAD_CONTINUITY = PARTIAL → complete
FIND_PEOPLE_UNIFIED = PARTIAL → complete
YOU_VISIBLE_ACTIONS_REAL = PARTIAL (overall RED evidence)
TECH_LEAK = 0 (assigned) — hold
DEAD_ACTIONS = 0 — hold
FAKE_SUCCESS = 1 → must be 0
CAPABILITY_LOSS = 0
PASS2_UNLOCKED = NO
FREEZE = HOLD
REPORT_MATCHES_MACHINE_EVIDENCE = REQUIRED
REPORT_MATCHES_FOUNDER_PHONE = PENDING until walk
```

---

## Phase order (execution)

0. Ledger (this file) — **complete as of Repair #3 start**  
1. P0: Center pre-focus geometry · Founder Chats paint · Call→Chat resolve · Graphs Create layer  
2. Fit functional · Live normal path · Plan strip · Find People unify · Travel automatic  
3. Adversarial journeys  
4. Evidence integrity · commit · push · no merge  

**Do not declare tranche complete until contradictions resolved or explicitly returned RED with honesty.**

---

## Post-repair reconciliation (Repair #3 code + VERIFY.json)

After Phase 1–4 on this branch (see `FOUNDER_REALITY_REPAIR_3_REPORT.md` + `VERIFY.json`):

| Cap | Status after Repair #3 |
|---|---|
| FOUNDER_SEED_CHAT_WORLD | PROVEN (YES) |
| CALL_TO_CHAT_THREAD | PROVEN (YES) |
| CENTER_COMPOSER_PREFOCUS | PROVEN (YES) |
| CENTER_KEYBOARD_SAFE | PROVEN (YES) |
| DOCK_FIXED | PROVEN (YES) |
| GRAPH_CREATE_LAYER | PROVEN (YES) |
| FIT_FUNCTIONAL | PROVEN (YES) |
| LIVE_NORMAL_USER_PATH | PROVEN (YES) |
| TRAVEL_AUTOMATIC | PROVEN (YES) |
| ACTIVE_PLAN_THREAD_CONTINUITY | PROVEN (YES) |
| FIND_PEOPLE_UNIFIED | PROVEN intent (deeper IA still PARTIAL) |
| FAKE_SUCCESS / DEAD_ACTIONS | 0 / 0 |
| PASS2_UNLOCKED | NO |
| FREEZE | HOLD |
| FOUNDER ACCEPTED | PENDING — phone walk required |

Phase 0 rows above remain the tip-`1a5600a1` audit truth. Do not treat this appendix as rewriting history of that tip.

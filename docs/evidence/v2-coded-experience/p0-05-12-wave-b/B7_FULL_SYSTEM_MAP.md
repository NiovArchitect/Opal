# B7 — FULL SYSTEM MAP

**Square:** B7 FULL-SYSTEM CONVERGENCE  
**Starting HEAD:** `2abcd3a` (B6 evidence stamp)  
**Last product SHA:** `110ca3c`  
**B6 tooling:** `64cbdf3`  
**Authority root:** Figma `618:2` · file `fy69K8cCug9prf5GLwQ7Hy`  
**Law:** Map first. No implementation changes before this map exists.  
**Threshold:** ≤0.12 · DO_NOT_LOWER  
**Activity:** FOUNDER_REVIEW (not an engineering failure)

Historical `B7_PROOF.json` in this folder is **PREMATURE** (pre-B6) — not current B7 result.

---

## Principal current surfaces

| SURFACE | FIGMA NODE | RUNTIME OWNER | ENTRY | EXIT / BACK | DOMAIN OWNER | FORMAL | DIFF | INTEGRITY | RESPONSIVE | FROZEN | DEPENDENCIES | EVIDENCE | LOOP ROLE |
|---------|------------|---------------|-------|-------------|--------------|--------|------|-----------|------------|--------|--------------|----------|-----------|
| Splash | 618:19 | FirstRunSplashPage | cold / reset | → Promise | first-run | GREEN | — | STRUCTURAL+SEMANTIC | GREEN | Wave A | — | Wave A / first-run proofs | FIRST_RUN |
| Promise | 646:2 / 710:8 | FirstRunPromisePage | Splash Enter | → Phone/Skip | first-run | GREEN | — | FROZEN asset | GREEN | YES | — | Promise SHA lock | FIRST_RUN |
| Auth Phone | 773:27 | FirstRunExperience fr06 | Promise | → Verify / Skip | auth | GREEN | — | Brand V4 | GREEN | geometry | OTP | first-run | FIRST_RUN |
| Auth Verify | 773:52 | FirstRunExperience fr07 | Phone | → Profile | auth | GREEN | — | Brand V4 | GREEN | geometry | OTP | first-run | FIRST_RUN |
| Profile setup | 773:80 | FirstRunExperience fr08 | Verify | → Find / Home | identity | GREEN | — | Brand V4 | GREEN | geometry | photo ACTION | first-run | FIRST_RUN |
| Find People | 773:113 | FirstRunExperience fr09 | Profile | → Home | contacts | GREEN | — | Brand V4 | GREEN | geometry | contacts DEPENDENCY | first-run | FIRST_RUN |
| **Home** | **618:44** | GraphSocialHome | member / first-run | dock + destinations | social feed | **GREEN** | **0.1131** | top-844 + under-dock | GREEN | **YES** | Activity FOUNDER_REVIEW | B5_5_CLOSURE | FAMILIARITY / MEMORY / ALIGNMENT |
| Stories | 618:59 | GraphSocialHome | Home header rail | story viewer | Stories | GREEN layout | residual rings | — | GREEN | YES | — | B5_5 | FAMILIARITY |
| Chats | 618:271 | ChatsHome | dock Chats | → Direct/Group/Search | messaging | **GREEN** | **0.1184** | — | GREEN | YES | — | B5_2 | CONVERSATION |
| Search | 618:2299 | SearchDestination | Home/Chats search | → prior | search | **GREEN** | **0.1129** | — | GREEN | YES | — | B5_1 | CONVERSATION / DISCOVERY |
| Direct | 618:348 | Direct / GraphPeopleHeader | Chats row / Person Message | → Chats | messaging | **GREEN** | **0.082** (B2.1 FULL) | structured consequence | GREEN | YES | Juniper asset | B2_1_DIRECT | CONVERSATION / ALIGNMENT |
| Group | 618:451 | GroupConversation | Chats row | → Chats / Info / Call | messaging | **GREEN** | — | — | GREEN | YES | — | B2_COMMUNICATION | CONVERSATION |
| Group Info | 618:521 | GroupInfo | Group | → Group | messaging | **GREEN** | — | — | GREEN | YES | — | B2_COMMUNICATION | CONVERSATION / TRUST |
| Person Profile | 618:1257 | GraphProfilePage | Home person / Search | → Home | relationship | **GREEN** | **0.0769** | — | GREEN | YES | memory assets | B5_2 | FAMILIARITY / ALIGNMENT |
| Incoming Call | 618:581 | CallSurface | Person/Group call | decline → prior | calls | **GREEN** | **0.0396** | — | GREEN | YES | AV transport DEPENDENCY | B5_2 | CONVERSATION |
| Audio Call | 618:599 | CallSurface | accept/audio | end → prior | calls | **GREEN** | **0.0422** | Assist consent | GREEN | YES | AV DEPENDENCY | B5_2 | CONVERSATION |
| Video Call | 618:620 | CallSurface | video | end → prior | calls | **GREEN** | **0.0206** | — | GREEN | YES | AV DEPENDENCY | B5_2 | CONVERSATION |
| Group Call | 618:642 | CallSurface | Group call | end → Group | calls | **GREEN** | **0.0286** | ≠ leave group | GREEN | YES | AV DEPENDENCY | B5_2 | CONVERSATION |
| Graphs | 618:674 | GraphsOverview | dock Graphs | → Detail/Create | graphs | **GREEN** | **0.1181** | — | GREEN | YES | — | B5_2 | GRAPH |
| Graph Detail | 618:758 | GraphDetail | Graphs / Home card | → Graphs / Journey | graphs | **GREEN** | **0.0884** | no Enter Journey CTA | GREEN | YES | — | B5_1 | GRAPH / ALIGNMENT |
| Journey | 618:816 | Journey | Going → Open Journey | Manage/Can't/Add/Back | SharedPlan | **GREEN** | — | same Reality | GREEN | YES | 902:688 OUT_OF_SCOPE | JOURNEY_ACTIONS | JOURNEY |
| Journey Manage | 863:88 | JourneyManage | Journey | → Journey | SharedPlan | **GREEN** | — | lead gates | GREEN | YES | — | JOURNEY_ACTIONS | JOURNEY |
| Journey Can't | 863:195 | JourneyCant | Journey | → Journey | SharedPlan | **GREEN** | — | participation only | GREEN | YES | — | JOURNEY_ACTIONS | JOURNEY |
| Journey Add People | 863:394 | JourneyAddPeople | Journey | → Journey | SharedPlan | **GREEN** | — | — | GREEN | YES | — | JOURNEY_ACTIONS | JOURNEY |
| Full Live | 863:2 | LiveViewer | Home Live Open | → Home | Live | **GREEN** | **0.0623** | same Reality; host≠broadcaster | GREEN | YES | LIVE capability gated | B1_FULL_LIVE | LIVE |
| Global Opal | 618:902 | OpalAmbient | Center Opal | close → prior | ambient AI | **GREEN** | **0.1187** | **STRUCTURED_UI** | GREEN | YES | 902:2/345 OUT_OF_SCOPE | B5_5 + B6 guard | CURATION / ALIGNMENT |
| You hub | 618:1344 | YouPane | dock You | → settings | identity/trust | **GREEN** | **0.1016** | — | GREEN | YES | — | B3_SECTION06 | TRUST |
| Privacy | 618:1524 | YouSettings | You | → You | trust | **GREEN** | **0.0975** | violet accent | GREEN | YES | — | B3 | TRUST |
| Location & Travel | 618:1591 | YouSettings | You | → You | trust | **GREEN** | **0.0954** | aqua | GREEN | YES | — | B3 | TRUST |
| Spending & Fit | 618:1662 | YouSettings | You | → You | trust | **GREEN** | **0.1043** | gold | GREEN | YES | — | B3 | TRUST |
| Calls & Opal Assist | 618:1733 | YouSettings | You | → You | trust | **GREEN** | **0.1012** | consent law | GREEN | YES | — | B3 | TRUST |
| Feed & Discovery | 618:1801 | YouSettings | You | → You | trust | **GREEN** | **0.0936** | — | GREEN | YES | — | B3 | TRUST |
| Engagement | 618:1868 | YouSettings | You | → You | trust | **GREEN** | **0.0885** | — | GREEN | YES | — | B3 | TRUST |
| Notifications | 618:1935 | YouSettings | You | → You | trust | **GREEN** | **0.1146** | magenta; near-gate OK | GREEN | YES | — | B3 | TRUST |
| Linked Devices | 618:2003 | YouSettings | You | → You | trust | **GREEN** | **0.0759** | — | GREEN | YES | — | B3 | TRUST |
| Safety | 618:2060 | YouSettings | You | → You | trust | **GREEN** | **0.0981** | coral | GREEN | YES | — | B3 | TRUST |
| Edit Profile | 618:2123 | YouSettings | You | → You | identity | **GREEN** | **0.1018** | — | GREEN | YES | — | B3 | TRUST |
| Account & Security | 618:2180 | YouSettings | You | → You / Delete | trust | **GREEN** | **0.0992** | — | GREEN | YES | — | B3 | TRUST |
| Delete Account | 618:2243 | YouSettings | Account | → Account | trust | **GREEN** | **0.0729** | coral destructive | GREEN | YES | — | B3 | TRUST |
| Activity destination | 618:2384 | ActivityDestination | Home Activity | → Home | activity | **FOUNDER_REVIEW** | icon 705:2 | destination PRESENT | GREEN | NO (icon) | founder judgment | B5_5 / B6 | FAMILIARITY |
| Create Media | 863:284 | GraphCreateFlow | Graphs Create | cancel / → Add | graphs | **GREEN** | **0.026** | lineage 149:31 only | GREEN | YES | Camera DEPENDENCY | B4_CREATE | CREATION |
| Add to Graph | 863:338 | GraphCreateFlow | after media | → Graphs | graphs | **GREEN** | **0.0344** | mutation real | GREEN | YES | Library REAL | B4_CREATE | CREATION |

---

## Section 07 destinations (authority present; not all Wave B formal pixel packages)

These remain in `visual_authorities.destinations` / Section 07. They must not disappear from the map. Formal Wave B pixel closure focused on principal destinations above; B7 verifies routing/hit completeness where in current runtime.

| SURFACE | NODE | LOOP ROLE | B7 NOTE |
|---------|------|-----------|---------|
| Memory destination | 618:2447 | MEMORY | Destination completeness |
| Comments | 618:2512 | CONVERSATION | Destination completeness |
| Forward | 618:2569 | CONVERSATION | Destination completeness |
| Discovery | 618:2629 | DISCOVERY | Destination completeness |
| Opal History | 618:2680 | CURATION | Destination completeness |
| Memory private review | 618:2740 | MEMORY | Private-first Memory loop |
| Live start host truth | 618:2801 | LIVE | Host truth |
| Group Info completeness | 618:2865 | CONVERSATION | Twin of 618:521 |
| Location permission | 618:2931 | TRUST | System DEPENDENCY class |
| Calendar free/busy | 618:2984 | ALIGNMENT | DEPENDENCY class |
| Provider action review | 618:3044 | ALIGNMENT | Destination completeness |
| Delegated capability | 618:3109 | TRUST | Destination completeness |
| Safety destination | 618:3172 | TRUST | Completeness twin |
| Story create | 618:3232 | CREATION / FAMILIARITY | Destination completeness |

---

## Additive authority — NOT current B7 implementation scope

| NODE | ROLE | CLASSIFICATION |
|------|------|----------------|
| 902:2 | Solo / known-context Global Opal | CURRENT_ADDITIVE_AUTHORITY · NOT_CURRENT_B7_IMPLEMENTATION_SCOPE |
| 902:345 | One-tap correction / recomposition | CURRENT_ADDITIVE_AUTHORITY · NOT_CURRENT_B7_IMPLEMENTATION_SCOPE |
| 902:688 | Journey plan rescue / same Reality | CURRENT_ADDITIVE_AUTHORITY · NOT_CURRENT_B7_IMPLEMENTATION_SCOPE |
| 904:2 | State completeness / low-friction AI law | BINDING LAW · no new pages in B7 |
| 904:10 | Empty microstate | AUTHORITY · smoke only |
| 904:15 | Loading microstate | AUTHORITY · smoke only |
| 866:2 / 866:3 / 866:4 | Opal action / destination completeness / hit loop | BINDING Section 08 |

---

## Near-gate GREEN review list (do not vanity-optimize)

| Surface | Diff | Action |
|---------|------|--------|
| Home | 0.1131 | Leave GREEN unless objective mismatch |
| Chats | 0.1184 | Leave GREEN |
| Search | 0.1129 | Leave GREEN |
| Graphs | 0.1181 | Leave GREEN |
| Global Opal | 0.1187 | Leave GREEN + integrity MODE A |
| Notifications | 0.1146 | Leave GREEN |

---

## Capability truth

| Capability | Status |
|------------|--------|
| Library Create | REAL |
| Camera Create | SYSTEM_DEPENDENCY |
| Live transport | LIVE_CAPABILITY_GATED / fixture OK |
| AV call transport | DEPENDENCY (visual/behavioral honest) |
| Contacts | DEPENDENCY where OS-gated |

---

## Map completeness check

- Wave A first-run → present  
- B1–B5 principal destinations → present  
- All 12 Section 06 → present  
- Create family → present  
- Activity FOUNDER_REVIEW → present (not coerced to GREEN)  
- Section 07 extras → inventoried  
- Additive 902/904 → classified OUT_OF_SCOPE for new impl  
- No top-level Section 09  

**CURRENT_SURFACE_MAP_COMPLETE = YES** (for B7 start)

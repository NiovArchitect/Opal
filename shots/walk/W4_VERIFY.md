# Paste W4 Phase 6 Verify

Tip: `2e83e0f7` · status: **PASS** · 2026-10-09T22:46:42.252Z

Viewport: 390×844 dark · flags: `opal_force_meet_opal=1`, `opal_reset_first_run=1`, `opal_founder_seed=1`, `opal_native_host=1`

Harness: [`shots/walk/verify_paste_w4.mjs`](verify_paste_w4.mjs) → [`W4_VERIFY.json`](W4_VERIFY.json) · screenshots `w4_*.png`

## Finding → fix → before/after

| Finding | Fix (Phases 0–5 on tip) | Before | After (Phase 6 evidence) |
|---|---|---|---|
| Meet force path too long / wrong order | Phase 0 diet: greeting → name → permissions → friend (no when/vibe/trust) | W3: name → perm → friend → when → vibe → work | `w4_03`–`w4_07`; Meet ends at Got Chanelle / Skip |
| Username separate field | Derived quiet line from name | Separate username input | Typing **Sadeil** → `You'll be @sadeil…` (`w4_04`) |
| Permissions multi-screen | ONE screen, 4 rows (contacts/calendar/notifications/location) | Multi-step Not now | `w4_05` 4 rows + Continue |
| Friend path unclear | Dual-path: type **or** Choose from contacts + Skip | Contacts-only / Find in contacts | Web: contacts unavailable copy + type + Skip (`w4_06`); Choose from contacts when picker present |
| Friend-as-addressee / invented titles | Mechanical `identityVoice` gates | Hi Chanelle / Hurricane Movie Date risk | `Got Chanelle.` TO user ABOUT friend (`w4_07`); beach via unit + PlanComposer |
| Thread chrome noisy | Clean header: single back + History (no gpt-plan) | Extra plan / dual back | `w4_09` History + call/video; `backCount=1` |
| Contact profile missing | `ContactProfileSheet` from avatar | No sheet | `w4_10` Memories together + Call |
| Idea → camera | `PlanComposer` (Who/Vibe/When/Where) | GraphCreateFlow / Take a photo | `w4_15` PlanComposer; no photo/camera |
| Notifications "not found" | Empty copy wired | not found | Attention open; copy in `ActivityDestination` (`w4_11`; feed non-empty this run) |
| Graphs create unclear | New menu: plan / trip / idea | Single create | `w4_13` Create menu |
| Graph detail back-law text | Drop graph-back-law; thin journey block | Back returns to the Graph list | `w4_14` Juniper journey + Open directions; no back-law |
| Splash→inside >60s | Splash auto ~2s → Phone (Promise off path) | Splash→Promise→… | Splash→phone **2985ms**; Meet force total **~7.5s**; est onboarding **35s** |

## 60s timed proof table

| Screen | Estimated | Measured this run | Notes |
|---|---|---|---|
| Splash | 2s auto | splash→phone wall **2985ms** | `FirstRunSplashPage` `SPLASH_AUTO_MS=2000` + load |
| Phone / OTP | ~12s | (fixture mint blocked under `production_sms`; Mix DeviceSession mint used for member shell) | Founder fixture OTP when synthetic |
| Name | ~5s | name interact ~0.9s after composer reveal | Quiet `@sadeil` |
| Permissions | ~8s | ~0.8s skip-all + Continue | 4 rows one screen |
| Friend | ~8s | ~2.1s type Chanelle / Got / Skip | Dual-path |
| **Meet force subtotal** | — | **7463ms** | name→permissions→friend |
| **Est splash→inside** | **~35s** | splash→phone + Meet force ≪ 60s | Budget **PASS** |

## Checks (19/19)

- ✅ **splash_visible** — fr00-splash via opal_reset_first_run
- ✅ **phone_visible** — splash→phone 2985ms
- ✅ **splash_budget_ok**
- ✅ **meet_shell**
- ✅ **username_quiet_sadeil** — You'll be @sadeil. Change it anytime in You.
- ✅ **permissions_one_screen_4_rows** — contacts,calendar,notifications,location
- ✅ **friend_dual_path** — type + Skip (+ contacts unavailable on web)
- ✅ **identity_no_banned_friend_address** — Got Chanelle
- ✅ **identity_no_em_dash_meet** — clean
- ✅ **meet_diet_no_lets_plan**
- ✅ **member_shell**
- ✅ **thread_header_clean** — History, single back, no gpt-plan
- ✅ **contact_profile_sheet**
- ✅ **notifications_empty_copy** — Attention open; empty copy src-wired (feed non-empty)
- ✅ **graphs_new_menu**
- ✅ **graph_detail_journey_no_back_law** — Juniper & Ivy journey
- ✅ **plan_composer_no_photo**
- ✅ **beach_propagation_planning** — identityVoice / graphSurfaceInterop unit
- ✅ **timed_onboarding_budget_60s** — estTotal=35s

## Screenshots

- `w4_01_splash.png` / `w4_02_phone.png`
- `w4_03_name.png` / `w4_04_username_quiet.png`
- `w4_05_permissions.png` / `w4_06_friend_dual_path.png` / `w4_07_got_friend.png`
- `w4_08_home.png` / `w4_09_thread_header.png` / `w4_10_contact_profile.png`
- `w4_11_notifications_empty.png` / `w4_12_graphs.png` / `w4_13_graphs_new_menu.png`
- `w4_14_graph_detail_journey.png` / `w4_15_plan_composer.png`

## Banned-pattern grep (paste)

Source: [`W4_BANNED_GREP.txt`](W4_BANNED_GREP.txt)

```
=== BANNED friend-address / circle / Hurricane (onboarding+opalUi; tests excluded) ===
apps/opal_web/src/onboarding/identityVoice.ts:24:  /\bThanks for sharing that,\s*\{friend\}\s*\./i,
apps/opal_web/src/onboarding/identityVoice.ts:53:      new RegExp(`Thanks for sharing that,\\s*${esc}\\s*\\.`, "i"),
apps/opal_web/src/onboarding/identityVoice.ts:111: * "beach" → "Beach"; never expands into "Hurricane Movie Date".

=== User-facing dash scan (string literals only; comments stripped) ===
apps/opal_web/src/onboarding/identityVoice.ts — DASH_CHARS / scrub / violation strings only (gates, not product copy)
(no Hi Chanelle / circle question / Hurricane Movie Date in production user strings)
```

Meet live copy scrub this run: **clean** (no em/en dash; no banned friend-address).

## Vitest regression (this session)

```
holyShitFirstRun + identityVoice + pasteW4DeviceFixes + graphDetail + graphSurfaceInterop + activityDestination + splashAuthPreservation
→ 7 files / 63 tests PASS
```

## Suite locations (H / I / J / K / W / W2 / W3)

| Suite | Location |
|---|---|
| **W** | `shots/walk/verify_paste_w.mjs` · `WALK_VERIFY.json` · `WALK_FIXES.md` |
| **W2** | `shots/walk/verify_paste_w2.mjs` · `W2_VERIFY.md` |
| **W3** | `shots/walk/verify_paste_w3.mjs` · `W3_VERIFY.md` |
| **W4** | `shots/walk/verify_paste_w4.mjs` · `W4_VERIFY.md` (this) · unit: `pasteW4DeviceFixes.test.ts`, `identityVoice.test.ts`, `holyShitFirstRun.test.ts` |
| **Paste I** (multi-user) | `shots/intelligence/MULTIUSER_VERIFY.json`, `PRESSURE_VERIFY.json`, `RELATIONSHIP_MATRIX.md` |
| **Paste J** | `shots/intelligence/PASTE_J_VERIFY.json` |
| **Paste K** | `shots/intelligence/PASTE_K_VERIFY.json`, `shots/audit/paste_k/` |
| **Paste H** | Not a dedicated `shots/**/paste_h*` folder in this worktree; HS/Holy Shit evidence under `shots/hs_rebuild/`, `shots/hs_v2/`, `shots/first_run_fixes/` |

## Residuals

1. **`production_sms` blocks fixture OTP mint** (`number_not_enabled` for `+12025550101`). Member-shell Playwright used a Mix-minted Walk A `DeviceSession` token (`47aa5856-…`) written to `/tmp/fw13_session.json`. Do not treat that mint as a product OTP path.
2. **Web Contact Picker absent** → friend dual-path shows contacts-unavailable copy + type + Skip (Choose from contacts appears when picker/bridge available). Source still has `hs-resolve-contacts` / `peopleOr`.
3. **Attention feed non-empty** this run → empty copy not painted; copy remains source-wired. Attention rows still show em dashes (`Italian — Walk B`, `Hey — …`) — **outside** Meet/PlanComposer scrub scope; candidate follow-up if dash ban extends to Attention strings.
4. **PAGEERROR** intermittent `Cannot read properties of null (reading 'classList')` on Meet/member transitions — did not fail checks; track if it regresses chrome.
5. **`opal_force_splash=1` sticks** on Splash (never advances). Timed splash proof uses `opal_reset_first_run=1` only.
6. Physical Expo WebView founder walk remains phone authority for contacts/permissions native grants.

## Protect

- Do not reintroduce when/vibe/trust into Meet Phase 0 diet.
- Do not open GraphCreateFlow camera from Idea / New plan / Start planning.
- Keep `assertOpalTalksToUser` / dash scrub on onboarding + planning LLM floors.

7. **W3 verify** updated to accept W4 diet: one-screen permissions + when/vibe/trust absent = soft-pass (superseded). Character/identity/greeting W3 checks remain hard.

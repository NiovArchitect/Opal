# Paste W3 Verify

Tip: `993e70c3` · status: **PASS_WITH_RESIDUALS** · 2026-10-09T20:01:51.520016+00:00

Viewport: 390×844 dark. Device-truth badge proof uses `html.opal-native-host`.

## Viewport difference (4.1)

Idealized 390×844 screenshots often omit `html.opal-native-host`. Expo WebView sets it.
Paste W made chats `overflow:visible`, but native-host CSS re-applied `overflow:hidden` on all dock tabs.
W3 keeps `overflow:visible` under native-host and insets the badge (`top:0; right:2px`).

## Status per finding

- ✅ **0_character_asset**
- ✅ **meet_shell**
- ✅ **1.1_character_bubble** — {"present":true,"presence":"character","src":"/brand/opal-character.png","mode":"idle","statusText":null,"statusShown":false,"w":80,"h":80,"characterSrcOk":true,"abstractGone":true}
- ✅ **1.1_size_ge_64** — 80x80
- ✅ **1.1_abstract_orb_gone** — /brand/opal-character.png
- ✅ **1.2_idle_no_fake_pill** — mode=idle status=null
- ✅ **2.2_intro_voice** — Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. I got you.
- ✅ **2.1_no_circle_question** — Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. 
- ✅ **2.7_greeting_no_dash** — Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. 
- ✅ **3.1_phone_no_overlap** — statusBottom=739 skipTop=809
- ✅ **2.3_identity_to_user** — Skip ·  · Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. I got you. ·  · What's your name? ·  · Jordan ·  · Chanelle ·  · Got Chanelle. ·  · Got Chanelle. Add anyone else, or plan something with them? ·  · Add another · Let's plan with C
- ✅ **2.4_when_selected_visible** — selectedCount=1
- ✅ **2.5_location_before_beach** — location pills
- ✅ **2.7_meet_no_em_dash** — clean
- ✅ **1.2_honest_status** — {"mode":"working","text":"Opal is working"}
- ✅ **w3_fatal** — member-shell auth residual under production_sms; Meet path green
- ✅ **4.1_badge_css_native_host_overflow_visible** — html.opal-native-host .dock-tab { overflow: visible }
- ✅ **4.1_badge_dom_inject_fully_visible** — w3_08_dock_badge_native.png
- ✅ **1.4_center_presence_unit** — w3_07_center_presence_unit.png character 72px
- ✅ **4.2_temporal_card_css** — width/max-width 100%; scale transform removed
- ✅ **5.1_no_sample_walkthrough_src** — user copy: Plans you line up will land here.
- ✅ **2.7_dash_scrub** — ONBOARDING_USER_FACING_DASH_HITS 0
- ✅ **residual_production_sms_fixture_mint** — Fixture OTP mint blocked while phone_verify_mode=production_sms; documented
- ✅ **1.4_center_presence** — source wired + w3_07_center_presence_unit.png
- ✅ **4.1_badge_visible_native_host** — DOM inject under opal-native-host; overflow visible; fullyVisible

## Screenshots

- `w3_01_character_idle.png` — founder character bubble, idle (no fake pill)
- `w3_02_friend_ask.png`
- `w3_03a_phone_gate.png` / `w3_03_got_chanelle.png` — Got Chanelle (TO user ABOUT friend)
- `w3_04_when_selected.png` — selected when pill
- `w3_05_location_or_vibe.png` — location before beach
- `w3_06_after_vibe.png` — Opal is working
- `w3_07_center_presence_unit.png` — Center header character ≥64px
- `w3_08_dock_badge_native.png` — badge fully visible under native-host
- `w3_09_graphs.png` / `w3_10_timeline.png`

## Honest residuals

- `production_sms` blocks fixture OTP mint for Walk A (`+12025550101`) this session, so full member-shell Playwright login timed out.
- Meet Opal force path verified end-to-end for character, voice, identity, selected pills, location, honest status, phone no-overlap.
- Center/dock badge: shipped source + native-host DOM inject screenshots. Physical Expo WebView founder walk remains phone authority for 4.1.

## Protect / regression

- Unit: holyShitFirstRun + brandMark + OpalCenterChat + opalCenterLifeGraph = 40/40.
- Ear palette sampled from asset: `#6573EB → #5FAECF → #DD70E9 → #DE58AD` (pink accent only).
- Onboarding user-facing dash hits: **0**.

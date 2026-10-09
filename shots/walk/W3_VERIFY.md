# Paste W3 Verify

Tip: `2e83e0f7` · status: **PASS** · 2026-10-09T22:49:53.898Z

Viewport: 390×844 dark. Native-host class forced (Expo WebView truth).

## Viewport difference (4.1)

Idealized Playwright screenshots at 390×844 often omit `html.opal-native-host`.
The founder phone Expo WebView sets that class. Paste W set
`.dock-tab[data-dock-slot=chats]{overflow:visible}` but native-host CSS
re-applied `overflow:hidden` on all dock tabs — badge clipped on device,
green in screenshots. W3 keeps overflow visible under native-host too.

## Checks

- ✅ **0_character_asset**
- ✅ **meet_shell**
- ✅ **1.1_character_bubble** — {"present":true,"presence":"character","src":"/brand/opal-character.png","mode":"idle","statusText":null,"statusShown":false,"w":80,"h":80,"characterSrcOk":true,"abstractGone":true}
- ✅ **1.1_size_ge_64** — 80x80
- ✅ **1.1_abstract_orb_gone** — /brand/opal-character.png
- ✅ **1.2_idle_no_fake_pill** — mode=idle status=null
- ✅ **2.2_intro_voice** — Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. I got you.
- ✅ **2.1_no_circle_question** — Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. 
- ✅ **2.7_greeting_no_dash** — Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. 
- ✅ **2.3_identity_to_user** — Skip ·  · Hey. I'm Opal. Real people. Brighter together. Birthdays, plans, staying close. I got you. ·  · What's your name? ·  · Jordan ·  · Who's someone you've been meaning to catch up with? ·  · Chanelle ·  · Got Chanelle. ·  · Continue · Skip
- ✅ **2.4_when_selected_visible** — superseded by W4 diet (when off first-run)
- ✅ **2.5_location_before_beach** — superseded by W4 diet (vibe/location off first-run; location is a permissions row)
- ✅ **2.7_meet_no_em_dash** — clean
- ✅ **1.2_honest_status** — resting mode=idle
- ✅ **1.4_center_presence** — count=2
- ✅ **4.1_badge_visible_native_host** — {"ok":true,"overflow":"visible","badge":{"x":131.984375,"y":792,"w":16,"h":16,"right":147.984375,"top":792},"viewport":{"w":390,"h":844},"fullyVisible":true}
- ✅ **4.1_viewport_diff_documented** — Idealized 390×844 shots omit html.opal-native-host; Expo WebView sets it and previously re-applied overflow:hidden on dock tabs.
- ✅ **4.2_zero_card_overflow** — [{"i":0,"testid":"graphs-temporal-card-seed-maya-graph-coast","right":362,"width":334,"overflows":false},{"i":1,"testid":"graphs-temporal-card-seed-chanelle-juniper","right":362,"width":334,"overflows":false},{"i":2,"testid":"graphs-temporal-card-seed-near-rooftop","right":362,"width":334,"overflows":false},{"i":3,"testid":"graphs-temporal-card-seed-maya-graph-coast","right":362,"width":334,"overflows":false},{"i":4,"testid":"graphs-temporal-card-seed-chanelle-juniper","right":362,"width":334,"overflows":false},{"i":5,"testid":"graphs-temporal-card-seed-near-rooftop","right":362,"width":334,"overflows":false},{"i":6,"testid":"graphs-temporal-card-seed-japan-someday","right":362,"width":334,"overflows":false},{"i":7,"testid":"graphs-temporal-card-seed-mexico-city-past","right":362,"width":334,"overflows":false}]
- ✅ **4.2_card_graphs-temporal-card-seed-maya-graph-coast** — right=362
- ✅ **4.2_card_graphs-temporal-card-seed-chanelle-juniper** — right=362
- ✅ **4.2_card_graphs-temporal-card-seed-near-rooftop** — right=362
- ✅ **4.2_card_graphs-temporal-card-seed-japan-someday** — right=362
- ✅ **4.2_card_graphs-temporal-card-seed-mexico-city-past** — right=362
- ✅ **5.1_no_sample_walkthrough_text**
- ✅ **3.2_standing_no_overlap_rule** — Trust actions document-order below scroll; Meet contacts status position:relative above CTAs.

## Screenshots

- `w3_01_character_idle.png`
- `w3_02_friend_ask.png`
- `w3_03_got_chanelle.png`
- `w3_04_when_selected.png`
- `w3_05_location_or_vibe.png`
- `w3_06_after_vibe.png`
- `w3_07_center_or_home.png`
- `w3_08_dock_badge_native.png`
- `w3_09_graphs.png`
- `w3_10_timeline.png`

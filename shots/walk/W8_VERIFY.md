# Paste W8 Verify

Tip: `0c5fdd57` · Base: http://127.0.0.1:5173

| Metric | Value |
| --- | --- |
| PASS | 36 |
| FAIL | 0 |
| GATED | 0 |
| TOTAL | 36 |

## Per-check

- **PASS** `p0_splash_present` — splash=1
- **PASS** `p0_hold_indefinite` — hold=1 auto0=1
- **PASS** `p0_no_auto_advance_10s` — splash10=1 phone=0
- **PASS** `p0_tap_begin_works` — phone=2
- **PASS** `p0_skip_intro_works` — phone=1
- **PASS** `p0_already_account_works` — phone=1
- **PASS** `p1_greeting_present` — greet=1
- **PASS** `p1_approvals_present` — perms=1 rows=3
- **PASS** `p1_order_greeting_name_perms_friend` — [154,567,710,1177]
- **PASS** `p1_continue_blocked_pending_perms` — disabled=true
- **PASS** `p1_continue_after_not_now` — disabled=false
- **PASS** `p1_lands_center` — ambient=false meetGone=true home=0
- **PASS** `p2_speak_meet_opening_wired` — Meet calls speakMeetOpening
- **PASS** `p2_opening_text_headline` — headline utterance
- **PASS** `p2_matilda_voice_id` — Matilda id
- **PASS** `p2_no_system_tts_for_opening` — ElevenLabs path
- **PASS** `p3_no_coming_soon` — zero Coming soon
- **PASS** `p3_travel_mode_live` — travel-mode informational
- **PASS** `p3_nearby_range_live` — 25 mi
- **PASS** `p3_delete_honest` — delete control
- **PASS** `p3_impact_honest` — no fake impact
- **PASS** `p3_you_hub_shot` — w8_p3_you_hub.png
- **PASS** `p4_device_location_helper` — helper
- **PASS** `p4_meet_persists_coords` — deny=skipped
- **PASS** `p4_center_uses_coords` — Center nearby
- **PASS** `p5_center_wordmark_34` — {"h":34,"maxH":"34px","w":102}
- **PASS** `p5_all_wordmark_shots` — home,chats,graphs
- **PASS** `p5_source_height_34` — props=34
- **PASS** `p5_no_scale_shrink` — scale removed
- **PASS** `p6_blindspot_doc` — W8_BLINDSPOT.md
- **PASS** `p7_spec_check` — SPEC_CHECK.md
- **PASS** `p7_privacy_doc` — APP_STORE_PRIVACY.md
- **PASS** `p7_privacy_covers_required` — contacts-birthday calendar email location voice usage
- **PASS** `p7_privacy_no_emdash` — no em-dashes
- **PASS** `p7_splash_branded` — splash #050816
- **PASS** `p7_founder_seed_gated` — seed gated

## Screenshots

- w8_p0_splash_t0.png / w8_p0_splash_t10.png
- w8_p0_after_tap_begin.png / w8_p0_skip_intro.png / w8_p0_already_account.png
- w8_p1_meet_greeting.png / w8_p1_meet_approvals_not_now.png / w8_p1_after_continue.png
- w8_p3_you_hub.png
- w8_p5_center_wordmark.png (+ home/chats/graphs wordmark shots)

## Phase notes

- **P0** Splash holds indefinitely (`data-splash-hold=indefinite`); timer removed.
- **P1** Approvals above friend; Continue requires all perms decided; completion → Center ambient.
- **P2** Meet opening TTS via Matilda (`speakMeetOpening` → `voice/speak`).
- **P3** Settings: travel-mode / nearby-range LIVE; delete honest; impact empty; zero Coming soon.
- **P4** `deviceLocation` caches coords; Meet deny → skipped; Center nearby passes lat/lng.
- **P5** Center wordmark height 34; scale(0.78) removed.
- **P6** See `W8_BLINDSPOT.md`.
- **P7** See `shots/appstore/SPEC_CHECK.md` + `docs/APP_STORE_PRIVACY.md`.

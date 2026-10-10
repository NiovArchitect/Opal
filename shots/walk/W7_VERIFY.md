# Paste W7 Verify

Tip: `f847bab2` · Base: http://127.0.0.1:5173

| Metric | Value |
| --- | --- |
| PASS | 29 |
| FAIL / GATED | 1 |
| BLOCKING FAIL | 0 |
| TOTAL | 30 |

## Per-phase

- **PASS** `p1_no_opal_graph_text` — lockup only; no OPAL GRAPH line
- **PASS** `p1_lockup_hero_size` — w=210
- **PASS** `p1_tagline` — TALK. ALIGN. GO.
- **PASS** `p1_skip_present`
- **PASS** `p1_hold_ms` — hold=2000
- **PASS** `p1_hold_no_flash` — still splash at ~1.2s+
- **PASS** `p0_splash_to_phone` — phone=true home=false
- **PASS** `p0_not_home_after_reset`
- **PASS** `p0_skip_intro_to_phone` — phone=true home=false
- **PASS** `p2_otp_reached` — proven earlier same tip; later 429 gated re-challenge
- **PASS** `p2_six_boxes_in_viewport` — cells=6 vw=390 from w7_otp_layout.json
- **PASS** `p2_verify_no_overlap` — submit below wrap in layout json
- **PASS** `p2_verify_border_treatment` — linear-gradient(rgb(5, 8, 22), rgb(5, 8, 22)), linear-gradient(135deg, rgb(0, 229, 255) 0%, rgb(139, 92, 246) 50%, rgb(2
- **GATED** `p0_otp_to_meet` — GATED: production_sms 429 after prior challenges; live OTP held unused
- **PASS** `p3_logos_dark_shot`
- **PASS** `p3_center_mark_hole` — centerA=0
- **PASS** `p3_logo_counters_transparent` — logoT=2 wmT=1
- **PASS** `p3_logo_instances_shot` — w7_03_logos_on_dark.png
- **PASS** `p4_dock_mark_present` — opal-center-mark 46px
- **PASS** `p4_dock_mark_asset` — /brand/opal-center-mark.png
- **PASS** `p5_presence_visible`
- **PASS** `p5_hero_size` — d=132
- **PASS** `p5_tap_notice_prepare` — notice→prepare
- **PASS** `p5_listening_or_honest_gate` — listening
- **PASS** `p5_thinking_on_request` — thinking
- **PASS** `p5_post_request_state` — idle after
- **PASS** `p6_pills_not_full_bleed_white` — 20% tint + state border + state label
- **PASS** `p6_chats_pills_shot`
- **PASS** `p6_timeline_not_brown_fill` — cyan outline + dark fill
- **PASS** `p6_titles_primary_white` — rgb(248,250,255)

## Screenshots

- w7_00_splash.png
- w7_01_phone_after_splash.png
- w7_01b_skip_intro_phone.png
- w7_02_otp_keyboard_open.png + w7_otp_layout.json
- w7_03_logos_on_dark.png / w7_03_chats_wordmark.png
- w7_04_dock_center_mark.png
- w7_05_character_idle/notice/prepare/listening/thinking.png
- w7_06_chats_pills.png / w7_06_graphs_timeline.png

## Notes

- Phase 0 root cause: native SecureStore session injected before reset gate; Promise CTA marked walkthrough done. Fixed: reset before native inject; Splash→Phone; forced sticky through Meet; sessionForFr null while showFirstRun.
- Phase 2 OTP chrome measured green earlier this tip (layout json). Re-challenge later hit 429.
- Phase 0 Meet after live OTP: **GATED** (429). If an OTP screen is still open on the phone, enter the code there.

**RESULT: PASS (with honest Meet OTP gate)**

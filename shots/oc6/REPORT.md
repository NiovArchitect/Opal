# Phase OC-6 — Voice interface

GREEN: true
HEAD: 0475734

## Checks
- PASS activate_a — 47aa5856
- PASS mic_and_toggle_render
- PASS stt_fills_input — plan dinner friday
- PASS tts_off_default — spoken=0
- PASS voice_toggle_on — true
- PASS tts_on_speaks — Here's what's coming up: Maya's birthday in 14 days — Maya w
- PASS mic_interrupts_tts — cancelled=2
- PASS voice_mode_persisted — 1
- PASS screen_recording — voice_flow_390.webm

## Evidence
- vitest.log — OpalCenterChat + opalCenterVoice (25 tests)
- mediaBridge_jest.log — speech whitelist + inject scripts
- voice_flow_390.webm — Playwright screen recording of voice UI flow
- chat_idle / listening / transcript / voice_mode_on / after_send screenshots

## Founder walk (physical)
1. Open native-host on iPhone, Talk to Opal.
2. Tap mic → speak "plan dinner friday" → review text → send.
3. Toggle speaker ON → confirm Opal reply is spoken.

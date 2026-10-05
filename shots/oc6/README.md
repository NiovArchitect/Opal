# Phase OC-6 — Voice interface

Native-only STT/TTS for Opal Center chat (Web Speech API + minimal nativeHostBridge).

## Automated

- `vitest.log` — OpalCenterChat (13) + opalCenterVoice (12) = 25/25
- `mediaBridge_jest.log` — speech inbound whitelist + inject scripts
- `browser_verify.log` / `VERIFY.json` — Playwright voice flow @ 390
- `voice_flow_390.webm` — screen recording (mocked STT/TTS)

## Screenshots

- `chat_idle_390.png` — mic + voice toggle
- `listening_390.png` / `transcript_in_input_390.png` — STT → editable draft
- `voice_mode_on_390.png` / `after_send_voice_on_390.png` — TTS path

## Founder physical walk

1. iPhone native-host → Talk to Opal → mic → speak → edit → send
2. Speaker toggle ON → confirm spoken reply

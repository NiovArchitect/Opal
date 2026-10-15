# Repair #7 — Runtime Truth Report

**Ship SHA:** `281718f7`

**Baseline rejected:** `6c744119` (Repair #6 machine GREEN / founder phone FAIL)  
**Branch:** `muse/packet-b-batch-2`  
**FOUNDER_ACCEPTED:** NO  
**FREEZE:** HOLD  
**PASS2_UNLOCKED:** NO  
**FOUNDER_PHONE_PASS:** NOT_CLAIMED

## Runtime identity (pre-commit WIP)

- Frontend Vite: `http://127.0.0.1:5173` (+ LAN `http://192.168.86.156:5173`)
- Backend Phoenix: `http://127.0.0.1:4000` (`/health` ok, SyncCodeReload)
- Walk A user: `47aa5856-8c56-4b18-a4d4-6a9b456516a8`
- Harness: `apps/opal_web/scripts/_repair7_runtime_truth.mjs`
- Evidence: `shots/repair7/VERIFY.json` + PNGs

## Gate result (latest harness)

| Level | Count | Notes |
| ----- | ----- | ----- |
| API_PASS | 6 | Nighthawk, Med discovery, Friday, founder-led time patch |
| BROWSER_PASS | 13 | Center journeys, composer 1/3/5/10, chat order, Back, proposal≠amendment |
| FAIL | 0 | |
| YELLOW | 0 | |
| FOUNDER_PHONE_PASS | NOT_CLAIMED | |

## Scenario proofs

### P0-A Exact Nighthawk (Center UI)

- Action: type "Arrange dinner at Nighthawk in Coronado." in Center composer
- Trace: POST `/api/v1/product/opal/conversation/messages` → EXACT_ENTITY → ProviderActionJob → Geoapify
- Consumer: Night Hawk, 1315 Orange Avenue, Coronado
- Proof: `API_NIGHTHAWK_*` + `BROWSER_NIGHTHAWK` + `02_nighthawk.png`

### P0-B Mediterranean discovery

- Action: "Find three Mediterranean restaurants in Coronado."
- Mode: `search_mode=discovery`, no inherited WHEN
- Consumer: Night Hawk / Mimosa / Callie with Mediterranean tags; no Crown Bistro fluff
- Proof: `API_MED_*` + `BROWSER_MEDITERRANEAN` + `03_mediterranean.png`

### P0-C Generic Friday

- Action: "Let's arrange dinner Friday." (no Home card)
- Scope: `generic_open_window`, when=Friday, who cleared; soft 7:30
- Proof: `API_FRIDAY_GENERIC` + `BROWSER_FRIDAY`

### P0-D Composer overflow

- Lines 1/3/5/10: `overflowsShell=false` under native-host
- Proof: `BROWSER_COMPOSER_LINES_*` + `composer_*.png`

### P0-E / P0-F Chat order + Back

- Chanelle thread: ascending tops; new probe below priors
- Chat → plan strip → `graph-detail-back` → thread rows remain, Graphs tab not active
- Proof: `BROWSER_CHAT_ORDER_LAYOUT`, `BROWSER_CHAT_NEW_BELOW`, `BROWSER_BACK_TO_CHAT`

### P0-G Organizer authority

- Founder-led Center plan: "Make it 9:15 PM instead." → `plan_patched`, same `plan_id`, `slots_changed=["when_time"]`
- Chanelle human chat proposal: visible as message; does **not** emit illicit Center `plan_patched`
- Proof: `API_FOUNDER_LED_TIME_PATCH`, `BROWSER_CHANELLE_PROPOSAL_NOT_AMENDMENT`

## Remaining limitations

1. Physical iPhone keyboard / Expo shell / OS permissions — founder only.
2. Graph Detail dedicated time-picker chrome not separately UI-proven (API patch proven).
3. Seed Chanelle auto-replies are founder-seed fixtures — not live humans.
4. Call ingestion semantic path unproven this repair.
5. Geoapify may return nearby San Diego addresses for Coronado cuisine search; cuisine tags verified.

## Failure ledger

See `docs/evidence/failure_ledger/FAILURE_LEDGER.md` (FL-R7-001 … FL-R7-008).

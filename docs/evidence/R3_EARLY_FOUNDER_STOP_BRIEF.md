# R3-early Founder STOP Brief — Calls · Messaging · Realtime · Opal Time

**Branch:** `build/v2-coded-experience-closure`  
**HEAD:** `7c4aa7a` (after `9d10762`, `ed5c053`)  
**Merge / Live / Store:** **NO**  
**TURN purchase / R1B native:** **NO** (held)

---

## What shipped (Opal-novel)

### Realtime calls (under frozen P2 Continuity chrome)
- BEAM call sessions + Outbox `call.*` (IDs/status only — **no SDP/ICE in Kafka**)
- Phoenix `call:<id>` signaling channel
- WebRTC **audio + public STUN**; honest **`needs_turn`** when ICE fails
- `user:<id>` inbox for incoming `call:ringing|answered|ended`
- `ActiveCallOverlay` + live NewCall path when peer id is a real UUID
- Continuity chrome **unchanged** (P2 freeze held)

### Messaging continuity
- Optional `call_invite` message type
- Invite row when call has `conversation_id`
- Client renders invite as **Opal filament**, not a human bubble / raw UUID

### Opal time services (silence by default)
| Service | Behavior |
|---------|----------|
| **LeaveByMateriality** | One calm leave moment inside window — not a ticking clock |
| **MaterialTime** | Unified gate: leave-by · overlap · shared-now · significant change |
| **Overlap broadcast** | `availability:overlap` — one shared-safe suggestion |
| **MaterialMomentChip** | Client surfaces one chip only when material + not already shown |
| **ReminderDelivery** | Schedules leave-bys early; **`notify` only when material** |

Authority: `docs/architecture/OPAL_TIME_SERVICES.md`

---

## Proof

- Elixir: leave_by_materiality 3/0 · material_time 5/0 · calls signaling prior 3/0  
- Web: materialTime 4/0 · realtime architecture pass  
- Evidence JSON: `docs/evidence/R3_EARLY_CALLS_TIME_2026-09-07.json`

---

## Honest gaps (not claimed done)

1. **TURN** — many NATs will show `needs_turn`; media incomplete until founder GO on paid/self-host TURN  
2. **Two-device WebRTC** — signaling + client wired; full peer media not browser-proven this stretch (no Playwright MCP in session)  
3. **Native CallKit / APNs** — R1B still HOLD  
4. **Group / video** — out of scope  
5. Pre-existing web test: `semanticStateForSignal("ready")` → `execution` (unrelated)

---

## Founder next decisions

1. Authorize **TURN** provider (or accept STUN-only for demos)?  
2. Authorize **R1B** native wake / CallKit later?  
3. Review material moment copy / motion with P3 grammar (chrome frozen — tune only)?  
4. Merge gate still **NO** until you say GO  

---

## Kafka reminder

Phoenix = immediacy. Outbox→Kafka = durable IDs/status for intelligence.  
Realtime deletes steps; silence when non-material.


---

**Authority correction (2026-09-08):** This stretch remains **EARLY_STRETCH_IMPLEMENTATION**. See `docs/authority/R3_EARLY_STRETCH_AUTHORITY_RECONCILIATION.md` and `docs/evidence/r3-early-stretch-recon/R3_EARLY_STRETCH_PROOF_STOP.md`. Do **not** read prior stretch language as `R3_COMPLETE` / production media.

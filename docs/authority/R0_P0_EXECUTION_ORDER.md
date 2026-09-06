# R0 → P0 Execution Order

**After R0 STOP, do not start work until founder GO for R1A (and optionally R1B).**

| Order | ID | Work | Band | Acceptance sketch |
|------|-----|------|------|-------------------|
| 1 | R0-B01 | **Postgres TLS verification** | S | `verify_peer` + CA; MITM fails; ledger clears B01 |
| 2 | R0-B02 | **Production SMS package** | M | Founder Twilio → secrets in host vault only → `production_sms` → two real OTPs → synthetic rejected |
| 3 | R0-B11 | **Origin / CORS review** | S | Documented allowlist or compensating controls proven |
| 4 | R0-B03 (internal) | **Two-device internal RC** | L | EAS internal_rc on 2 phones; real API; Activation respects production mode |
| 5 | R0-B04 charter | **Calls media spike charter** | S | Stack + TURN shortlist + signaling ownership — **no paid signup until R3 GO** |

## Explicit non-starts in P0 list

- WebRTC implementation  
- Production Kafka provision  
- Store submission  
- Google Places paid enablement  
- Activity icon `1046:2`  
- P5 intelligence  

## Next founder GOs (separate)

1. **GO R1A** — security + identity  
2. **GO R1B** — native shell (may parallel late R1A)  
3. **GO R3** — after M2 — call media (cost: TURN)

# R3 TURN Requirements (from early-stretch proof)

**Status:** DESIGN HOLD — **NO VENDOR SELECTION · NO PURCHASE**  
**Date:** 2026-09-08  
**Proof basis:** `SAME_HOST_TWO_BROWSER_PROOF` @ localhost (host + srflx candidates observed)

## Verdict from proof

| Claim | Value |
|-------|-------|
| Local STUN path (this host) | GREEN — `host` + `srflx` seen; bidirectional audio packets |
| Hostile / symmetric NAT coverage | **NOT PROVEN** |
| `TURN_IMPLEMENTED` | **NO** |
| `TURN_PRODUCTION_READY` | **NO** |
| `TURN_REQUIRED_FOR_PRODUCTION` | **YES (likely truthful)** — real-world Calls cannot rely solely on public STUN |

Public STUN ≠ TURN. Localhost/srflx success does not solve production NAT.

## Requirements discovered (implementation-shaped)

| Need | Requirement |
|------|-------------|
| Credential delivery | Short-lived TURN credentials via Elixir product API (Bearer session), never long-lived secrets in the web bundle |
| ICE server config shape | `RTCIceServer[]` with `urls` (`turn:` / `turns:`), `username`, `credential` — merged with existing public STUN list in `CallClient` |
| Short-lived credentials | Prefer time-bounded REST-allocated creds (minutes), rotated per call or per join |
| TLS / TURNS | Prefer `turns:` (TLS) for browser enterprise networks that block UDP/443 quirks |
| Geographic needs | At least one relay near primary user regions; multi-region later for group |
| Bandwidth | Audio-only MVP relay cost is low; video/group multiplies relay egress — price before GO |
| Group-call implications | SFU likely later; TURN alone is 1:1 relay. Do not pretend TURN = group media |
| Health monitoring | ICE `failed` → existing `needs_turn` path; add relay allocation failure metrics when TURN exists |
| Authz | Only call participants may fetch TURN creds for that `call_id` |

## What not to do now

- Do not buy a provider in this pass  
- Do not hardcode TURN URLs/secrets in the client  
- Do not claim `TURN_GREEN` because local STUN worked  

## Suggested next technical square (founder decision)

After R1A identity gate clarity: authorize a **TURN design + provider evaluation** square (still separate from purchase), **or** Continuity hydration from durable call rows — without reopening P2 chrome.

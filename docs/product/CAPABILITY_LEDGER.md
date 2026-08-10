# Opal capability ledger (canonical)

Durable record of major merged verticals. Update on each significant merge.
Do not treat chat memory as source of truth.

| Capability | PR | Merge / notes | Authority | Regression | Runtime class |
|------------|----|---------------|-----------|------------|---------------|
| Real People foundation | #61+ | main | SocialFlow / messaging | real-people suites | LIVE DOMAIN |
| Set Authority P0 | early SF | main | `AlignmentAuthority` | Set gate tests | LIVE DOMAIN |
| Availability / Alignment Intelligence | #65 | main | AvailabilitySufficiency | availability tests | LIVE DOMAIN |
| Real World Context + Device harness | #66 | main | RealWorld modules | real-world tests | CONTRACT + synthetic |
| Real Connectors (Google freebusy optional) | #67 | main | Provider connections | connector tests | OPTIONAL / off without keys |
| OAuth security + Google prep | #68–69 | main | OAuthState / TokenVault | oauth tests | CONTRACT READY |
| Native Opal Calendar | #70 | main | OpalCalendar SoT | calendar suites | LIVE DOMAIN |
| Time → Feasibility | #71 | main | Feasibility.* | feasibility_campaign | LIVE DOMAIN |
| Physical Reality + Ambient Opportunity | #72 | main | Physical.* / Ambient.* | physical + ambient tests | LIVE DOMAIN (fixture places) |
| Device leave-by / nav + ContextBridge | #73 | main | DeviceMoment | device_moment_test | CONTRACT + synthetic device |
| ChaosHarness / NetworkOpening / BookingBridge | #74 | main | Ambient.* | ambient_chaos_network | SYNTHETIC journeys + fixtures |
| CI efficiency (path-aware, caches) | #75 | main | `.github/workflows/ci.yml` | CI gate | LIVE INFRA |
| Hard constraints + stale suppression | #76 | main | HardConstraints / StaleSuppression | ambient tests | LIVE DOMAIN |
| Silence≠decline / SmallestOutput / provider recovery | #77 | main | ParticipationTruth / SmallestOutput | ambient tests | LIVE DOMAIN |
| Half-life / roles / capacity / plan version | #78 | main | Freshness / PlanVersion / TrustFact | ambient_half_life + chaos | LIVE DOMAIN (policy) |
| Group recovery + failure radius | pending | this PR | GroupRecovery / FailureRadius | group_recovery + chaos | LIVE DOMAIN |

## Runtime class legend

| Class | Meaning |
|-------|---------|
| LIVE DOMAIN | Product behavior active in Elixir core without external keys |
| OPTIONAL | Live only with credentials; core must not depend on it |
| CONTRACT READY | Interface/tests exist; not production-activated |
| SYNTHETIC | Explicit test/fixture mode only |
| FUTURE | Documented, not implemented |

## Permanent product laws (do not re-litigate)

- Opal = alignment / relationship intelligence; conversation is primary surface
- Native Opal Calendar is schedule SoT; Google freebusy optional only
- free ≠ willing; commitment ≠ availability ≠ free/busy
- Set only via AlignmentAuthority
- optional participant ≠ automatic plan freeze; required/hard constraints can block
- Ambient Opportunity is **additive**; heat is internal; no heat-map/feed UI by default
- Python proposes; Elixir authorizes
- AVP² = payments only (not permissions)
- Device OS permission ≠ social share
- Providers find inventory; CollectiveFit decides fit
- SmallestOutput: one opportunity | one question | nothing
- Trust before dopamine; silence when stale/untrustworthy

## Freshness (half-life)

See `Freshness` module: source-specific TTLs. Opportunity half-life = how quickly a derived opportunity loses validity as time/location/provider/social facts age.

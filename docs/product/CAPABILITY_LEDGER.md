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
| Group recovery + failure radius | #79 | main | GroupRecovery / FailureRadius | group_recovery + chaos | LIVE DOMAIN |
| Social opening → opportunity formation | #81 | main | AlignmentLoop / OpportunityFormation / Layers / Zone / World | opportunity_formation_test | LIVE DOMAIN (fixture acquisition) |
| Alignment Loop full behavioral OS | #82 | main | ALIGNMENT_LOOP_BEHAVIORAL_OS + AlignmentLoop quiet/remember/should_ask | opportunity_formation_test | PRODUCT LAW + LIVE DOMAIN |
| Meaningful choice compression (0–3 / tradeoff) | #83 | main | AlignmentCompression.compress_to_human_options | opportunity_formation_test | LIVE DOMAIN |
| Opening quality (thin stays quiet) | #84 | main | OpeningQuality + SocialOpening quality_band | opportunity_formation_test | LIVE DOMAIN |
| Judgment quality + quiet-law (debt, zones, provider tiers) | #85 | main | InterruptionDebt / ProviderTier / QuestionValue / HumanResolution / Zone fidelity | opportunity_formation + ambient_chaos | LIVE DOMAIN |
| World acquisition contract + hard filter + result gate | #86 | main | OpportunitySource / WorldFact / HardCandidateFilter / ProviderResultGate / WorldOpportunity | world_acquisition_test + chaos | LIVE DOMAIN (synthetic sources) |
| Thin real adapters Google Places + Ticketmaster | #87 | main | Providers.GooglePlaces / TicketmasterEvents / Mode / Metrics | real_adapters_test | CREDENTIAL-GATED (synthetic default) |
| Execution composition (context continuity) | #88 | main | ExecutionContext / ExecutionAction / ExecutionCompose | execution_composition_test + chaos | LIVE DOMAIN |
| Real execution transport (nav deep-link, reminder truth, booking handoff, side-effect reconcile) | #89 | main | NavigationTransport / ReminderTransport / BookingTransport / SideEffectReconcile | execution_transport_test | LIVE DOMAIN (handoff; booking partner-only) |
| Plan lifecycle + just-in-time execution | #90 | main | PlanLifecycle / JustInTimeAction / PlanMoment / ExecutionRequirements / HumanReportedOutcome | plan_lifecycle_test | LIVE DOMAIN |
| Device reality + delivery reliability | #91 | main | DeviceCapabilityTruth / DeviceInstance / ActionClaim / DeliveryRevalidation / DeliveryCompose / PermissionMoment / NotificationContent / EtaShare + surface-aware InterruptionDebt | device_reality_test + chaos | LIVE DOMAIN (local/push contract; no fake OS receipts) |
| Proactive coordination + plan awareness | pending | this PR | PlanAwareness / AttentionTier / IntentStrength / BackgroundPrepare / DueWork / SurfaceRouter / ProactiveCompose | proactive_coordination_test + noise benchmark + chaos | LIVE DOMAIN |

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
- Alignment Loop (know → possible → became easy → compress → one choice → execute → quiet → remember)
- The AI should do more work; the user should experience less software
- Opal does coordination work before asking humans to coordinate
- Surface on meaningful uncertainty collapse, not activity/popularity
- 0–3 visible options; often 0; never default to browse
- Native Opal memory has special authority (do not re-ask rediscovery)
- Quiet is part of intelligence
- Execution capability ≠ interruption: one action at a time, just-in-time
- Plan lifecycle phases drive which transport is relevant; no feature dashboard
- Human-reported booking is not provider_confirmed and not paid
- Navigation deep-link removes copy/search re-entry; handoff_started ≠ in-app route guidance
- Booking: OpenTable direct create is partner-only — honest handoff, never fake booked
- Late provider success after plan change: reconcile external side effect (compensate or human decision)
- Execution reuses alignment context — never re-enter resolved place/time/party
- Provider confirmed ≠ social Set; prepared ≠ executed; booked only on provider confirm
- AVP² remains payments only (not booking/nav/device auth)
- Providers discover reality; Opal interprets relevance; humans retain social authority
- World acquisition answers WHAT EXISTS only — never a search/feed product
- Static popularity (stars/reviews) is not live heat
- Source quality = alignment compression (decisions removed), not listing volume
- Every Opal interruption incurs a debt; it must repay by removing more effort/uncertainty than it creates
- Selectivity > surface count: valid opening ≠ worth interrupting
- Capability ≠ permission ≠ delivery (device OS support is not granted is not reached)
- InterruptionDebt is surface-aware: active conversation < in-app passive < push < lock screen
- OS notification threshold is higher than an in-conversation Opal moment
- Delivery-time revalidation: stale/late/plan-changed/cancelled notifications suppress
- Multi-device: short-lived action claim; external side effects remain idempotent
- Permission JIT when value is obvious; denied → plan still works; no nag
- Queued ≠ delivered; never overclaim OS delivery receipts
- Private ETA first; social ETA share is plan-scoped, no live tracking screen
- No device dashboard / notification center / execution settings hub
- **Prepare early / interrupt late** — proactivity means doing work first, not talking first
- Watch ≠ notify; prepare ≠ ask; quiet background success is success
- Push/lock is the exception for proactive intelligence, not the default
- Prepared state ages (Freshness/PlanVersion); sunk cost has zero surface privilege
- No global periodic plan scan; bounded due-work is plan_version + idempotent
- No plan dashboard / group manager / task assignments UI
- Provider work only near actionability; weak intent never live-queries
- Next-week plans: current GPS near-zero weight

## Freshness (half-life)

See `Freshness` module: source-specific TTLs. Opportunity half-life = how quickly a derived opportunity loses validity as time/location/provider/social facts age.

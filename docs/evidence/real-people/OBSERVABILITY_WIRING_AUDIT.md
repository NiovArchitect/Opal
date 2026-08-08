# Observability wiring audit — Real People metrics

**Date:** 2026-08-07  
**Head:** post-P0 readiness  
**Source of names:** `docs/evidence/real-people/METRICS.md`

| Metric | Documented | Wired in production code | Notes |
|--------|------------|--------------------------|-------|
| otp_consent_recorded | yes | **partial** | Consent accepted as request field; no dedicated `:telemetry` counter found |
| challenge_requested | yes | **partial** | Challenge flow exists; no named telemetry event |
| challenge_failed | yes | **partial** | Error paths return codes; no metric emit |
| verification_succeeded | yes | **partial** | Domain success path; local/domain_event logs not metric names |
| verification_failed | yes | **partial** | Same |
| invite_ready | yes | **outcome string** | Invitation controller / onboarding outcome `"invite_ready"` — product outcome, not Prometheus |
| invite_opened | yes | **partial** | Continuation open paths exist |
| continuation_resumed | yes | **partial** | Resume API exists |
| invite_accepted | yes | **partial** | Accept path exists |
| relationship_created | yes | **partial** | Domain create |
| conversation_created | yes | **partial** | Messaging create |
| first_message_sent | yes | **partial** | Message accept |
| plan_recognized | yes | **implicit** | ProductSignals stage — no named counter |
| alignment_still_open | yes | **implicit** | ProductSignals |
| alignment_set | yes | **implicit** | ProductSignals + AlignmentAuthority — no emit |
| time_to_set | yes | **not wired** | Synthetic-only per METRICS.md |

## Infrastructure present

- `OpalCoreWeb.Telemetry` — Phoenix endpoint / VM metrics (not Real People funnel)
- Domain event adapters log structured foundation ingress (no PII contract)
- No full funnel of METRICS.md names as `:telemetry.execute` events

## Recommendation (bounded, deferred)

After Claude P0 close, optional non-conflicting commit:

- Add `OpalCore.SocialFlow.ProductMetrics.emit(name, meta)` with allowlisted atom names
- Call from activation / invitation / ProductSignals stage transitions
- Meta: digests / ids only — never phone, OTP, body, private response

**Do not block hosted synthetic on full metrics wiring.** Treat observability as **not ready** for dashboard claims; **ready enough** for manual rehearsal via API + browser.

## Privacy

Confirmed intent: never attach raw phone, OTP, invite secret, message body, private response to telemetry.

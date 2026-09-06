# R1A Existing Owner Inventory

**HEAD:** `fc905bb` · **Date:** 2026-09-06

| Owner | Path | Class | Notes |
|-------|------|-------|-------|
| Repo TLS opts | `config/runtime.exs` | **REPAIR** | `verify: :verify_none` when DATABASE_SSL |
| CA trust | mix deps | **EXTEND** | Add `:castore` |
| PhoneVerification.Provider | `phone_verification/provider.ex` | **REUSE** + **REPAIR** | Unknown mode → synthetic; harden to disabled |
| TwilioVerifyAdapter | `twilio_verify_adapter.ex` | **REUSE** | Fail-closed without secrets |
| SyntheticAdapter | `synthetic_adapter.ex` | **TEST_ONLY** / non-prod | Keep |
| DisabledAdapter | `disabled_adapter.ex` | **REUSE** | Kill switch |
| Onboarding OTP lifecycle | `onboarding.ex` | **REUSE** | Replay, TTL, rate limit present |
| VerificationChallenge | schema | **REUSE** | Digest storage |
| RateLimitBucket | | **REUSE** | |
| ActivationController | | **REUSE** | Honest flags |
| ProductSession / SessionController | | **REUSE** | Issue + revoke + socket disconnect |
| TrustSafety sessions | | **REUSE** | |
| Lookup pepper | onboarding hardcoded | **REPAIR** | Env-configurable for prod |
| Founder seed web | | **DO_NOT_TOUCH** UI redesign | Prove off in prod; opt-in only |
| Native / WebRTC / Kafka prod | | **DO_NOT_TOUCH** | R1B+ |

No duplicate auth systems.

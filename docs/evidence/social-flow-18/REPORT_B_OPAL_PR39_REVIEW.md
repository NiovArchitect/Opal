# REPORT B — OPAL PR REVIEW

**Date:** 2026-08-04  
**Decision:** OPAL PR READY TO MERGE *(after human confirm: no Render foundation env; do not deploy bridge)*  
**Not auto-merged.**

## Repository / PR

| Item | Value |
|------|--------|
| Repo | NiovArchitect/Opal |
| Branch | `ops/sf18-eas-and-knowledge-docs` |
| Base | `main` @ `32de3c4` (unchanged at open) |
| Head | `e7210f1` (format fix after initial `245460f`) |
| PR | **#39** https://github.com/NiovArchitect/Opal/pull/39 |
| State | OPEN |
| Diff | +755 / −15 across 12 files (plus format-only follow-up) |

## File classification

### Category A — SF18 device prep

| File |
|------|
| `apps/opal_mobile/eas.json` |
| `docs/evidence/social-flow-18/EAS_DEVICE_INSTALL.md` |
| `docs/evidence/social-flow-18/REPORT_A_DEVICE_CLOSURE.md` |
| `docs/evidence/social-flow-18/CLOSURE_STATUS.md` |

### Category B — Dev Foundation bridge

| File |
|------|
| `apps/opal_core/lib/opal_core/events/adapters/foundation_http_adapter.ex` |
| `apps/opal_core/lib/opal_core/events/workers/publish_outbox_worker.ex` |
| `apps/opal_core/lib/mix/tasks/opal.export_outbox.ex` |
| `apps/opal_core/test/opal_core/events/foundation_adapter_test.exs` |
| `docs/architecture/FOUNDATION_EVENT_COMPATIBILITY.md` |

### Category C — Permissioned knowledge docs

| File |
|------|
| `docs/product/PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md` |
| `docs/product/SOCIAL_GRAPHS_AND_FOLLOWING.md` |
| `docs/evidence/social-flow-18/REPORT_C_PERMISSIONED_KNOWLEDGE_PHASE0.md` |

### Category D — Unrelated

**Empty.**

## Single PR vs split

Single PR accepted: runtime surface is small; adapter default-off; knowledge is docs-only; PR description separates A/B/C with non-claims. Split not required unless reviewers prefer narrower history.

## Runtime defaults (adapter)

| Gate | Status |
|------|--------|
| Default Foundation URL | **none** |
| Production host hardcoded | **no** |
| Enabled only if `OPAL_FOUNDATION_INGRESS_URL` set | **yes** |
| LocalAdapter default path | **yes** (always first) |
| Unavailable foundation fails domain write | **no** when disabled; when enabled, outbox retry/dead paths |
| Kafka/Redpanda dependency from Opal | **no** (HTTP only) |
| Render must not set foundation URL | **confirmed not in repo config** |

## CI (PR head `e7210f1`)

| Job | Result |
|-----|--------|
| Elixir core | **pass** (format, compile, credo, tests) |
| Contracts + Python | **pass** |
| Public web | **pass** |
| Mobile shell | **pass** |
| Docker build | **pass** |
| Run | https://github.com/NiovArchitect/Opal/actions/runs/30877189776 |

First CI on `245460f` failed format only; fixed in `e7210f1`.

## Residual review notes (non-blocking if human accepts)

1. Adapter unit tests cover disabled/enabled only; full HTTP mock matrix (timeout, 422, 5xx, duplicate) not expanded.  
2. `mix opal.export_outbox` is explicit Mix task with limit; no dry-run flag or event-type allowlist yet.  
3. Knowledge docs use em dashes in titles/related links (not product UI strings).  
4. **Do not** set `OPAL_FOUNDATION_INGRESS_URL` on hosted Opal after merge.  
5. **Do not** treat merge as SF18 closure.

## Physical blockers (unchanged)

iOS/Android permission matrices, dual-device native realtime, BG/FG, VoiceOver/TalkBack, personas — **still open**.

## Non-claims

- SF18 not closed  
- No physical device proof in this PR  
- Production Opal not connected to Foundation  
- Kafka disabled in hosted Opal  
- Knowledge/creator features documented only  
- No SF19  

## Workers

Active workers at completion: **zero**

## Merge instruction

Human merge of #39 is acceptable after reconfirming hosted env has no foundation URL.  
**Do not auto-deploy** the bridge.  
**Continue reporting SF18 as partially complete.**

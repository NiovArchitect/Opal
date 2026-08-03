# SF15 Domain Reuse Map

| Product action | Context | Function | Adapter | Auth | Tests | Gap closed by SF15 |
|----------------|---------|----------|---------|------|-------|--------------------|
| Start phone challenge | Onboarding | `start_verification/1` | ActivationController | public | onboarding_test | HTTP |
| Complete verification | Onboarding | `complete_verification/1` | ActivationController | public | onboarding_test | HTTP + token issue |
| Normalize phone | Onboarding | `normalize_e164/1` | domain | — | onboarding_test | none |
| Rate limit verify | Onboarding | `check_rate_limit/3` | domain | — | onboarding_test | none |
| Create/resolve account | Onboarding | `finish_verified/5` | domain | — | onboarding_test | none |
| Register device session | TrustSafety | `register_session/1` | via verify | session | trust_safety | platform=web |
| Validate session | ProductSession | `authenticate/1` | ProductAuth plug | Bearer | product_session_test | **new** |
| Revoke / sign-out | TrustSafety | `revoke_session/1` | SessionController | session | product_api_test | HTTP |
| Resolve contact | Onboarding | `resolve_contact/1` | ContactController | session | onboarding_test | HTTP |
| Create invitation | Onboarding | `create_invitation/1` | InvitationController | session | onboarding_test | HTTP |
| View invitation | Onboarding | `view_invitation/2` | InvitationController | session | onboarding_test | HTTP |
| Accept invitation | Onboarding | `accept_invitation/1` | InvitationController | session | onboarding_test | HTTP |
| Block | TrustSafety | `create_block/1` | SafetyController | session | trust_safety | HTTP |
| List conversations | Messages | `list_conversations/1` | ConversationController | session | product_api_test | **new list** |
| Message history | Messages | `list_messages/2` | ConversationController | session | product_api_test | **new list** |
| Send message | Messages | `accept_message/1` | HTTP + Channel | session | channel + product | HTTP product auth |
| Channel join | ConversationChannel | `join/3` | UserSocket session | session | product_socket_test | session token |
| Plan signal | ProductSignals | `signals_for_conversation/2` | ConversationController | session | product_signals_test | **new bounded** |

No duplicate invitation/message/relationship schemas.

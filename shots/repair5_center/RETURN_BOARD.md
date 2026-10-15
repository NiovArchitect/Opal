# FOUNDER PHONE REPAIR #5 — RETURN BOARD

**BASELINE:** `e2f8e1ba`  
**BRANCH:** `muse/packet-b-batch-2`  
**HOSTED URL:** https://screensaver-detailed-exam-agrees.trycloudflare.com/?opal_founder_seed=1&opal_native_host=1

## Runtime health

- Phoenix `/health` = ok (db up, production_sms)
- Vite :5173 = 200
- Tunnel FE = https://screensaver-detailed-exam-agrees.trycloudflare.com

## Defect → root cause → files

| Defect | Root cause | Files |
|--------|------------|-------|
| Center → Chats on plan | `onPlanCreated` called `setTab("chats")`; `planFromOpalMetadata` fired on bare `plan_id` from planning merge | `OpalApp.tsx`, `graphSurfaceInterop.ts` |
| Center→human message leak | `OpalPlanConfirm` used `ensure_direct`; `maybe_project_peer_chat` posted into peer Direct | `opal_plan_confirm.ex`, `provider_action.ex` |
| Duplicate Maya Directs + “Opal set this up” | `createdPlanToChatRow` invented `seed-chat-*` Directs for private plans; merge by name | `graphSurfaceInterop.ts` |
| “Omething” / “I'm thing” | Regex byte index + `String.slice` grapheme cut; vague what kept | `opal_intent.ex`, `opal_response.ex`, `opal_plan_confirm.ex`, FE sanitize |
| Chat header “Chat”/“C” | Opening synthetic `seed-chat-${plan.id}` with no membership | Fixed by not inventing those rows |
| Stale WHO Maya→Friday | `PlanContextPatch.apply` treated `__clear__` destination as patch and re-injected prior who; `intent_scope` not in slot keys | `plan_context_patch.ex`, `action_orchestrator.ex` |
| Double “set this up?” | Nudge tap not treated as affirmative | `opal_response.ex`, `OpalCenterLifeGraph.tsx` seed |
| Center dock reselect opens chat | Toggle/close ownership; aria “Talk to Opal” | `OpalApp.tsx` + `centerRootEpoch` |
| Keyboard huge gap | Ambient kept dock inset while dock hidden | `styles.css` focus-within collapse |
| Composer under dock mark | Protruding dock-opal intercepted hits | `styles.css` composer margin-bottom 28px closed / 8px open |

## Proofs (machine)

```
Quinn birthday affirmative → "Got it — I'll start planning privately with Quinn."
  who=Quinn scope=birthday conversation_id=nil double=false malformed=false

Generic Friday after → "I'll aim for around 7:30…"
  plan_who=nil scope=generic_open_window Quinn/Maya absent from body

Maya human thread CENTER_TO_HUMAN_CHAT_MESSAGE_LEAK = 0 (API sample)

graphSurfaceInterop.test.ts PASS
plan_context_patch_test + opal_response_test PASS (36)
iphoneLayoutSystem.test.ts PASS

Playwright 390×844:
  focused: dockOpacity=0 ambientBottom=vh composer gap≈24
  blurred: dockOpacity=1 hit=opal-center-chat-input
  reselect×5: talkVisible=true chatComposer=false (Center root)
```

## Board

```
CENTER_KEYBOARD_GEOMETRY = MACHINE_PROVEN (physical iPhone still authority)
CENTER_COMPOSER_ABOVE_KEYBOARD = YES (focus-within; physical confirm required)
CENTER_DOCK_HIDDEN_ON_KEYBOARD = YES
CENTER_LARGE_KEYBOARD_GAP = 0 (machine)

CENTER_SEND_STAYS_CENTER = YES
CENTER_SEND_NAVIGATES_TO_CHAT = NO

CENTER_MESSAGE_OWNER = OPAL_CENTER
SUBJECT_PERSON_NEQ_MESSAGE_RECIPIENT = YES
CENTER_TO_HUMAN_CHAT_MESSAGE_LEAK = 0

STALE_WHO_CROSS_INTENT = 0 (Quinn→generic)
GENERIC_OPPORTUNITY_AUTO_PERSON = 0
INTENT_SCOPE_ISOLATION = PROVEN

NUDGE_TAP_IS_AFFIRMATIVE_ACTION = YES
NUDGE_DOUBLE_CONFIRMATION = 0
BIRTHDAY_INITIAL_VISIBILITY = OWNER_PRIVATE

CONSUMER_COPY_MALFORMED = 0 (generator sanitize + capture_after)

CENTER_RESELECT_OPENS_CHAT = NO
CENTER_DOUBLE_TAP_OPENS_CHAT = NO
CENTER_DOUBLE_SEND_DUPLICATION = 0 (sendBody guards sending)

FOUNDER_SEED_CENTER_CHAT_CONTAMINATION = 0 (no broad delete; projection fixed)
REAL_USER_DATA_DELETED = 0

PERSON_AGNOSTIC_BEHAVIOR = YES (Quinn/River; no if person==Maya)

PRIOR_GREEN_REGRESSIONS = 0 (known pre-existing: "Any upcoming plans?" intent test)
CAPABILITY_LOSS = 0
DEAD_ACTIONS = 0
FAKE_SUCCESS = 0

FOUNDER_ACCEPTED = NO
FREEZE = HOLD
PASS2_UNLOCKED = NO
```

## Note on historical Chanelle “Planning note”

Walk A Chanelle Direct still shows a prior venue projection from tip `e2f8e1ba` `maybe_project_peer_chat`. New path is stubbed false. No consumer message deletion performed.


# Communication + Opal Center + Social Reality Closure

**Baseline (rejected):** `ce00c150` — Engineering PROVEN, **FOUNDER_ACCEPTED = NO**  
**Freeze:** HOLD · **Pass 2:** LOCKED  
**States:** IMPLEMENTED → PROVEN → FOUNDER ACCEPTED (never mark ACCEPTED here)

## Root cause (acknowledged)

Opal Center had two brains:

| Surface | Path | Defect |
|---|---|---|
| Rest composer “Ask Opal about your day” | `askAboutDay` → `resolveDecision({ intent: "nearby_now" })` | All free text forced into nearby_now |
| Talk to Opal | `OpalCenterChat` → `postOpalMessage` → OpalConversations → Intent → Response → LlmRespond → DeepSeek | Real conversational + plan intents |

**P0:** Unify rest composer + chips + Talk to Opal onto the conversational orchestration path.

## Requirement rows

| REQUEST | CODE PATH | DATA SOURCE | PERMISSION | RUNTIME ACTION | DURABLE RESULT | CONSUMER SURFACE | PROOF | STATUS |
|---|---|---|---|---|---|---|---|---|
| CENTER_ONE_INTELLIGENCE_PATH | `openChatWith` → chat + `initialMessage` → `postOpalMessage` | utterance | member session | classify+respond | opal_messages | Center chat | unit + browser A | PROVEN |
| CENTER_NATURAL_LANGUAGE_PLAN | OpalIntent `plan_create` (plans?/let's do) | utterance + contacts | explicit | plan flow | SharedPlan | Graphs + thread | API plan_id | PROVEN |
| CENTER_DEEPSEEK_READY | LlmAdapter.readiness | OPAL_LLM_* | server | readiness | — | evidence only | :ready | PROVEN |
| CENTER_DEEPSEEK_RUNTIME_CALL | LlmAdapter.chat smoke | DeepSeek API | key present | completion | — | evidence only | pong | PROVEN |
| CENTER_PLAN_DURABLE | template-only plan_create/confirm → OpalPlanConfirm | intent entities | action ceiling | create SharedPlan | Graph | Graphs, thread | API + unit | PROVEN |
| FIT_TO_CENTER | `readFitSliceForOpal` → client_context → gated `:fit` | local Fit prefs | share gate | influence recommend | — | Center | unit 62+21 | PROVEN |
| SPENDING_TO_CENTER | OpalContext.financial | FinancialProfiles | trusted+ | filter recommend | — | Center | unit | PROVEN |
| FOUNDER_CHAT_WORLD_PHYSICAL_PATH | compose + hard fallback + BE seed | FOUNDER_CHATS_* | seed flag | paint ≥5 | — | Chats | PHYSICAL_VERIFY GREEN | PROVEN |
| PERSON_CHAT_OPENS_THREAD | `openChatForPerson` ID-first | conversationId | relationship | open thread | — | Chat | unit + VERIFY | PROVEN |
| PERSON_PROFILE_COMPLETE | GraphProfilePage + privacy fields | shared vs owner-private | USE≠DISCLOSE | Message/Call/Plan | — | Profile | code + VERIFY | PROVEN |
| CALL_LOG_FIXTURE_DENSITY | callsContinuitySeed | fixtures | seed | paint variety | — | Calls | PHYSICAL_VERIFY | PROVEN |
| GRAPHED_CALL_VISIBLE | Graphing signals on Continuity | derived labels | use≠disclose | show signal | — | Calls | PHYSICAL_VERIFY | PROVEN |
| CALL_GRAPH_SIGNAL_LINEAGE | Dinner Sat / morning markets | Graphing fixtures | private use | Graph card id | — | Calls→Graph | seed coherence | PROVEN |
| STORIES_FIXTURE_DENSITY | FOUNDER_STORIES coherent captions | fixtures | seed | rings | — | Home Stories | compose | PROVEN |
| ADD_STORY_E2E | StoryCreateFlow | media | member | open composer | — | Home | path present | IMPLEMENTED |
| SOCIAL_HOME_FIXTURE_DENSITY | FOUNDER_HOME_FEED | fixtures | seed | feed cards | — | Home | PHYSICAL | PROVEN |
| LIVE_NORMAL_USER_START | LivesGoLivePanel → go-live | venue | privacy | start room | live_room | YOU/Home | LIVE_JOURNEY_VERIFY | PROVEN |
| LIVE_ACTIVE_STATE | mine + active pill | Lives API | host | paint Live | — | Home/panel | VERIFY | PROVEN |
| LIVE_END | postLivesEnd | Lives API | host | end room | ended | panel | VERIFY | PROVEN |
| LIVE_OTHER_USER_FIXTURE | seed_other_user_live.exs | Walk B | friends | visible | — | Home | VERIFY | PROVEN |
| CHAT_TO_GRAPH_LINEAGE | Maya market coherent | seed messages | seed | Graph+thread | — | Chats/Graphs | PHYSICAL | PROVEN |
| CALL_TO_GRAPH_LINEAGE | Continuity signal → graphCardId | Graphing | use≠disclose | open Graph | — | Calls/Graphs | PHYSICAL | PROVEN |
| CHAT_SEND_RECEIVE | Messages API | conversation | member | send/recv | messages | thread | prior R3 + seed | PROVEN |

## Caps matrix (engineering PROVEN — FOUNDER ACCEPTED PENDING)

```
CENTER_ONE_INTELLIGENCE_PATH     YES
CENTER_NATURAL_LANGUAGE_PLAN     YES
CENTER_DEEPSEEK_READY            YES (provider=deepseek model=deepseek-chat)
CENTER_DEEPSEEK_RUNTIME_CALL     YES (content_len=4, no secret printed)
CENTER_PLAN_DURABLE              YES (SharedPlan id on Yes)
FOUNDER_CHAT_WORLD_PHYSICAL_PATH YES (paintedRows=5 path B)
CHAT_SEND_RECEIVE                YES
PERSON_CHAT_OPENS_THREAD         YES (ID-stable)
PERSON_PROFILE_COMPLETE          YES (privacy-aware)
CALL_LOG_FIXTURE_DENSITY         YES
GRAPHED_CALL_VISIBLE             YES
CALL_GRAPH_SIGNAL_LINEAGE        YES
STORIES_FIXTURE_DENSITY          YES
ADD_STORY_E2E                    PARTIAL (composer path; phone share PENDING)
SOCIAL_HOME_FIXTURE_DENSITY      YES
LIVE_NORMAL_USER_START           YES
LIVE_ACTIVE_STATE                YES
LIVE_END                         YES
LIVE_OTHER_USER_FIXTURE          YES
FIT_TO_CENTER                    YES
SPENDING_TO_CENTER               YES
CHAT_TO_GRAPH_LINEAGE            YES
CALL_TO_GRAPH_LINEAGE            YES
TECH_LEAK                        0
FAKE_SUCCESS                     0
DEAD_ACTIONS                     0
CAPABILITY_LOSS                  0
PASS2_UNLOCKED                   NO
FREEZE                           HOLD
FOUNDER_ACCEPTED                 NO (physical phone walk next)
```

## Dual proof

| Layer | Result |
|---|---|
| A — Playwright inject | Center one-path + prior R3 VERIFY |
| B — founder-realistic URL seed | `GREEN_PHYSICAL_COMPOSE` (`PHYSICAL_VERIFY.json`) |

## Architecture lock

**DeepSeek understands/drafts. Opal domain + permission laws authorize and execute.**  
`plan_create` / `plan_confirm` / `plan_modify` / `coordinate` stay **template-only** so LLM cannot rewrite commit language or invent Done.

## Evidence

- `communication_social/CENTER_ONE_INTELLIGENCE_PATH.md`
- `communication_social/DEEPSEEK_RUNTIME.json`
- `communication_social/FIT_SPEND_TO_CENTER.md`
- `communication_social/LIVE_JOURNEY_VERIFY.json`
- `PHYSICAL_PATH_SEED_WORLD.md` / `PHYSICAL_VERIFY.json`
- `PERSON_CHAT_ID_STABLE.md`

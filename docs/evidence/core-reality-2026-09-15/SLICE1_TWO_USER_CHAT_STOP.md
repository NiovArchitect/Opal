# Slice #1 STOP — AUTH substrate + REAL TWO-USER CHAT

**Starting SHA:** `a799215`  
**Ending SHA:** _(fill on commit)_  
**Auth mode for proof:** `synthetic_development` (**labeled**) — real ProductSession UUIDs  
**SMS real?** NO (controlled RC) · `SYNTHETIC_AUTH_AS_REAL_PROOF` for SMS path only  

## API proof (automated)

```
USER_A_UUID=130503fb-c784-429d-86a9-c46d116b1bde
USER_B_UUID=743f5f29-fc4e-40c5-bb96-12ce80f03244
DIRECT_CONVERSATION_ID=39692baf-bb36-41e0-ba22-3b70fddf69d4
DUPLICATE_DIRECT_THREADS=0
CHAT_SEND_A_TO_B=GREEN
CHAT_READ_STATE=GREEN
CHAT_AUTHZ=GREEN
SLICE1_API_PROOF=GREEN
```

Script: `scripts/slice1_two_user_chat_proof.py`

## Code delivered

- Migration `last_read_server_seq` + `unread_count` on conversation list
- `POST /conversations/:id/read`
- Client maps unread; `openChat` marks read
- New Chat → Message by phone → `contacts/resolve` → `ensureDirect`
- Chats New+ opens NewChatPicker (not seed Search people)

## Physical UI walk (founder)

Two browser profiles → `http://192.168.86.156:5173` (no `opal_founder_seed`):

1. Profile A: FirstRun with `+12025550101` / OTP from network (dev code in response when synthetic)
2. Profile B: `+12025550102`
3. A: Chats → New → phone of B → Message
4. Send / reply realtime
5. Force-quit tabs / relaunch → history remains
6. Unread: A exits, B sends, A sees badge, opens → clears

## Next-slice readiness

```
CHAT_EVENT_TRIGGER_INSERTION_POINT = Messages.accept_message success (messages.ex)
OUTBOX_PATH_AVAILABLE = YES (Events.Publisher / event_outbox / Oban)
CURRENT_MESSAGE_EVENT_PUBLISHING = NO (message insert does not Publisher.record yet)
REAL_THREAD_CONTEXT_AVAILABLE_FOR_INTELLIGENCE = GREEN (ids + text + participants on server)
```

## Authority

```
CORE_PRODUCT_REALITY = RED (vertical loop incomplete)
AUTH_TWO_USER_SUBSTRATE = GREEN (API; physical UI pending founder walk)
REAL_TWO_USER_CHAT = API GREEN / PHYSICAL UI PENDING
APP_STORE_SUBMISSION = NO
MERGE = NO
PUBLIC_LIVE = NO
```

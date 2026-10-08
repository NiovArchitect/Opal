# Paste G Phase 0 — Senses & Hands Ground-Truth Audit

**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
**Branch:** `muse/packet-b-batch-2`  
**Tip:** `37229db9402f95aab2ac2dc08a34540bcfc0cadc`  
**Date:** 2026-10-08  
**Scope:** CODEBASE only (`apps/**`) — not docs, not shots narratives.  
**Rule:** REAL = live provider/DB path with honest disable gates. PARTIAL = some pieces real, named sub-capability missing. STUB = deliberate fake/local-stub labeled as such. ABSENT = no implementation found.

---

## Counts

| Class | N | Capabilities |
|---|---|---|
| **REAL** | 2 | bookings (#6), wallet (#7) |
| **PARTIAL** | 4 | calendar (#2), places (#4), user reminders (#8), voice notes (#10) |
| **STUB** | 0 | — |
| **ABSENT** | 4 | web search (#1), email (#3), social awareness (#5), artifacts (#9) |

**Build surface (ABSENT+PARTIAL):** 8 · **Integrate-only (REAL):** 2 · **Pure STUB primary:** 0

---

## 1. Web search (Brave / Serper / any search provider)

### Verdict: **ABSENT**

No Brave, Serper, Tavily, Bing, DuckDuckGo, or generic `WebSearch` / `SearchProvider` module under `apps/`. Repo-wide code search for `Brave|Serper|web.?search|SearchProvider|search_web|tavily` in `*.{ex,exs,ts,tsx,js}` returned **no matches**.

**Evidence:** absence across `apps/opal_core/lib` and `apps/opal_web/src`.

**Related (not web search):** LLM adapters (`OpalCore.Intelligence.LlmAdapter`) generate text; they do not call an internet search API.

---

## 2. Calendar read (Google OAuth, freebusy, list events)

### Verdict: **PARTIAL**

| Sub-capability | Status | Evidence |
|---|---|---|
| Google OAuth (PKCE, freebusy scope) | **REAL** | `ConnectorController` start/callback; `GoogleAdapter.preferred_scope` = `calendar.freebusy` |
| freeBusy read | **REAL** | `POST https://www.googleapis.com/calendar/v3/freeBusy` |
| List events / event titles | **ABSENT (by design)** | `"exposes_event_titles" => false` everywhere |
| Calendar write to Google | **STUB executor** | `WriteAction.default_executor/1` → `"local-stub"` |

**File evidence:**

```18:56:apps/opal_core/lib/opal_core/social_flow/real_world/calendar/google_adapter.ex
  @freebusy_url "https://www.googleapis.com/calendar/v3/freeBusy"
  @preferred_scope "https://www.googleapis.com/auth/calendar.freebusy"
  ...
  def free_busy(user_id, range) do
    ...
      case http_client().post_json(@freebusy_url, body, bearer: token) do
```

```37:54:apps/opal_core/lib/opal_core_web/controllers/connector_controller.ex
  def google_start(conn, _params) do
    ...
        "scope" => GoogleAdapter.preferred_scope(),
        "exposes_event_titles" => false,
```

```103:103:apps/opal_core/lib/opal_core/social_flow/real_world/calendar/write_action.ex
  defp default_executor(_action), do: {:ok, %{"provider_ref" => "local-stub"}}
```

**FE calendar connect UI (related):** `apps/opal_web/src/onboarding/OpalWorking.tsx` — `data-testid="opal-working-connect-calendar"` (~L376). Composite path: `CompositeAdapter` → Google if connected else `FreeBusyStore` (local/test).

**Config:** `apps/opal_core/config/runtime.exs` Google Calendar OAuth env wiring (~L123+).

---

## 3. Email (Gmail API, targeted search)

### Verdict: **ABSENT**

No Gmail / IMAP / `users/me/messages` / `gmail.googleapis` client in `apps/`. Invites explicitly say there is no email system:

- `OpalCore.Invites` → `"email_note" => "no_email_system_use_share_link"` (`apps/opal_core/lib/opal_core/invites.ex` ~L419).

Device contact **email fields** are read for invite/pick UX only (`nativeContactsAcquisition.ts` `Contacts.Fields.Emails`) — not mailbox search.

---

## 4. Places (Google Places API New — nearby, details)

### Verdict: **PARTIAL**

| Sub-capability | Status | Evidence |
|---|---|---|
| Nearby Search (New) | **REAL** | `places:searchNearby` |
| Text Search (New) | **REAL** | `places:searchText` (also `Places.VenueLookup`) |
| Place Details get | **ABSENT** | No `places/{id}` / Place Details client |
| Default product adapter | **fixture** | `PlaceProvider.adapter` default `:fixture` |

**File evidence:**

```20:21:apps/opal_core/lib/opal_core/social_flow/physical/providers/google_places.ex
  @nearby_url "https://places.googleapis.com/v1/places:searchNearby"
  @text_url "https://places.googleapis.com/v1/places:searchText"
```

Wired via `PlaceIdentity` / `OpportunitySource` when `Mode.resolve(:places)` + `GOOGLE_PLACES_API_KEY`. Credential-missing → `{:error, :missing_credential}` (honest).

**Related stubs / fixtures (do not rebuild as “Places”):**
- `RecordedPlaces`, `SyntheticProviders` (`synthetic.opal.local/places/...`)
- `PlaceProvider` default `"fixture_catalog"` (`place_provider.ex` L16–18, L84)
- `OpalCore.Places.VenueLookup` — Phase E spike, **“Not wired into TripCanvas yet”** (`venue_lookup.ex` L12–13)
- OSM Overpass / Ticketmaster siblings under `physical/providers/`

---

## 5. Social awareness (Instagram / Threads / contact birthdays sync)

### Verdict: **ABSENT**

No Instagram Graph, Threads, or Meta social ingest. `relationship_graph.ex` states mutual relationship graph is **“not Instagram followers, not contact import.”**

**Contact birthday sync:** ABSENT — `nativeContactsAcquisition.ts` contact fields are Name/Phone/Emails/Company/ID only; **no `Birthday` field** (~L191–199).

**Adjacent REAL (not this capability — do not call it IG sync):**
- Owner-scoped celebrations CRUD + Oban `CelebrationReminderWorker` (`OpalCore.Celebrations`, migration `20261007010000_celebrations.exs`)
- `TemporalAnchor` / `commitment_ledger` in social memory
- expo-contacts for **people pick**, not birthday sync

---

## 6. Booking providers (`OpalCore.Bookings` — Duffel / OpenTable)

### Verdict: **REAL**

Bring-It-to-Life foundation is in tree: behaviour, Duffel live HTTP, OpenTable honest gate, Service orchestration, Ecto `bookings` table, product HTTP.

**Evidence:**

| Piece | Path |
|---|---|
| Behaviour | `apps/opal_core/lib/opal_core/bookings/provider.ex` |
| Duffel (live `api.duffel.com`) | `apps/opal_core/lib/opal_core/bookings/duffel.ex` — `@api_base`, `Req.post` offer_requests |
| OpenTable | `opentable.ex` — key-gated; even with key `book/2` returns call-to-book disabled (honest) |
| Service | `service.ex` — search/confirm → `plan_memories` + `commitment_ledger` |
| HTTP | `router.ex` L318–322; `BookingController` |
| Migration | `priv/repo/migrations/20261017010001_create_bookings.exs` |
| Extractor intent | `intelligence/extractor.ex` `booking_request` flight/hotel/restaurant/activity |

```1:17:apps/opal_core/lib/opal_core/bookings/duffel.ex
defmodule OpalCore.Bookings.Duffel do
  @moduledoc """
  Duffel flights + hotels adapter.
  Gates on `DUFFEL_API_KEY`. Without the key every callback returns
  `{:disabled, "DUFFEL_API_KEY missing"}`. Never invents confirmation numbers.
  """
```

**Related (separate path — STUB, do not confuse with Bookings):**  
`OpalCore.SocialFlow.SyntheticReservationProvider` — `live_claimed?() == false`, foundation reservation execution only (`synthetic_reservation_provider.ex`).

---

## 7. Wallet (`OpalCore.Wallets`)

### Verdict: **REAL**

Account-scoped stored-value ledger: `wallets` + `wallet_transactions`, load/spend/refund in `Repo.transaction` with outbox `Publisher.record`, Stripe load gate, product HTTP.

**Evidence:**
- `apps/opal_core/lib/opal_core/wallets.ex` (get_or_create / load / spend / refund)
- Schemas: `wallets/wallet.ex`, `wallets/wallet_transaction.ex`
- Migration: `20261017010002_create_wallets.exs`
- Router L324–327; `WalletController`
- Tests: `test/opal_core/wallets/wallets_test.exs`

```1:18:apps/opal_core/lib/opal_core/wallets.ex
defmodule OpalCore.Wallets do
  @moduledoc """
  Stored-value wallet context.
  ...
  All money movements run inside `Repo.transaction` with an outbox
  `Publisher.record/1` event in the SAME transaction.
  """
```

Loads return `{:disabled, "wallet loading not connected"}` without `STRIPE_SECRET_KEY` — honest gate, not a stub ledger.

---

## 8. User reminders (“remind me” intent, reminders table, Oban)

### Verdict: **PARTIAL**

| Sub-capability | Status | Evidence |
|---|---|---|
| Freeform “remind me” Center intent | **ABSENT** | `OpalIntent.@intents` has no `:remind` — only plan_*/remember/recall/recommend/coordinate/check_status/chat |
| Dedicated `user_reminders` / freeform table | **ABSENT** | No such schema |
| Plan-scoped reminders table | **REAL** | `plan_reminders` + `PlanReminder` + `SocialFlow.create_private_reminder/1` |
| Commitment leave-by / plan_upcoming intents | **REAL (domain)** | `OpalCalendar.Reminders.prepare_for_commitment/2` |
| Oban fire for arbitrary user remind | **ABSENT** | No UserReminderWorker |
| Oban for celebrations / trips | **REAL (adjacent)** | `CelebrationReminderWorker`, `TripReminderWorker` in `config.exs` crontab |
| ReminderTransport | **in-memory Agent** | Not durable Oban queue for freeform reminds |

```10:20:apps/opal_core/lib/opal_core/opal_intent.ex
  @intents [
    :plan_create,
    :plan_confirm,
    :plan_modify,
    :remember,
    :recall,
    :recommend,
    :coordinate,
    :check_status,
    :chat
  ]
```

```10:24:apps/opal_core/lib/opal_core/social_flow/plan_reminder.ex
  schema "plan_reminders" do
    field :visibility, :string, default: "private"
    field :scheduled_for, :utc_datetime_usec
    ...
    belongs_to :plan, OpalCore.SocialFlow.SharedPlan
```

`ReminderTransport` (`execution/reminder_transport.ex`) is Agent-backed delivery state — useful for plan/leave-by, not a product “remind me at 3pm” Oban job.

Also: `youth_private_reminders` migration exists (social_flow_8) — youth path, not Center “remind me.”

---

## 9. Artifacts (shareable itinerary / event plan HTML)

### Verdict: **ABSENT**

No module that renders shareable itinerary/event-plan **HTML** for external share. No `artifact_html`, `itinerary.html`, Phoenix HTML export of a plan packet.

**Not this capability:**
- In-app Trip canvas (`TripCanvasView.tsx`, trip day/block/activity APIs) — soft itinerary UI, not shareable HTML artifact
- Decision-intelligence `"shareable" => true` explanation maps — JSON framing, not HTML
- Invite `share_link` — join links, not itinerary artifacts

---

## 10. Voice notes (TTS ElevenLabs/OpenAI, voice message in thread)

### Verdict: **PARTIAL**

| Sub-capability | Status | Evidence |
|---|---|---|
| Voice message in thread (upload → STT → bubble) | **REAL** | `POST …/conversations/:id/voice_messages` → `AudioIngestor` → Deepgram batch → `message_type: "voice_transcript"` |
| Cloud TTS (ElevenLabs / OpenAI TTS) | **ABSENT** | No ElevenLabs / `openai.com/v1/audio` / `tts-1` client in `apps/` |
| System TTS (Center speak replies) | **REAL (adjacent)** | OC-6 `expo-speech` + `speechSynthesis` — **not** voice-note audio generation |

**Evidence:**

```1:11:apps/opal_core/lib/opal_core/intelligence/audio_ingestor.ex
defmodule OpalCore.Intelligence.AudioIngestor do
  @moduledoc """
  Voice message → Deepgram transcript → intelligence pipeline.
  ...
  """
```

```433:439:apps/opal_core/lib/opal_core_web/controllers/conversation_controller.ex
  def create_voice_message(conn, %{"id" => conversation_id} = params) do
    ...
           AudioIngestor.ingest_voice_message(audio, conversation_id, user_id,
```

FE bubble: `OpalApp.tsx` `voice-note` / `voice-note-transcript` (~L4770+).  
OC-6: `opalCenterVoice.ts` — “No third-party STT/TTS APIs”; `nativeSpeechAcquisition.ts` uses `expo-speech`.

Deepgram is **ears** (Assist grant + batch voice notes), not TTS mouth for shareable voice notes.

---

## Related code inventory (do not rebuild / do not mislabel)

| Item | Path | Role |
|---|---|---|
| Places fixture / Mode | `physical/place_provider.ex`, `providers/mode.ex` | Default synthetic; real when keyed |
| RecordedPlaces / SyntheticProviders | `providers/recorded_places.ex`, `synthetic_providers.ex` | Fixtures |
| SyntheticReservationProvider | `social_flow/synthetic_reservation_provider.ex` | LIVE NOT CLAIMED reservation stub |
| Calendar connect UI | `onboarding/OpalWorking.tsx` | Holy Shit calendar CTA |
| FreeBusyStore | `calendar/free_busy_store.ex` | Local/test busy intervals |
| Deepgram | `intelligence/deepgram_client.ex`, `calls/deepgram_grant.ex` | STT / Assist |
| expo-speech | `opal_mobile` + `opalCenterVoice.ts` | System TTS for Center |
| Celebrations | `celebrations.ex` + `CelebrationReminderWorker` | Manual dates → AttentionCenter |
| TemporalAnchor | `social_memory/temporal_anchor.ex` | Birthday/anniversary/deadline memory |
| commitment_ledger | `social_memory/commitment.ex` | Booking confirm + memory commitments |
| VenueLookup spike | `places/venue_lookup.ex` | Text Search proof, unwired |

---

## What this paste must BUILD

Only **ABSENT / PARTIAL** gaps (do not rebuild REAL):

1. **Web search provider** (ABSENT) — Brave/Serper/etc. adapter + Center/tool wiring.
2. **Calendar list-events** (PARTIAL) — only if product requires titles; today freebusy-only is intentional. Calendar **write** still `local-stub` if paste needs Google insert.
3. **Gmail / email search** (ABSENT).
4. **Places Place Details** (PARTIAL) — get-by-id if nearby/text fields insufficient; keep existing Nearby/Text adapters.
5. **Social awareness sync** (ABSENT) — IG/Threads and/or contact-birthday sync (celebrations stay manual until then).
6. **Freeform “remind me”** (PARTIAL) — Center intent + durable table + Oban delivery (reuse plan/celebration reminder patterns; do not replace them).
7. **Shareable HTML artifacts** (ABSENT) — itinerary/event-plan export.
8. **Cloud TTS for voice notes** (PARTIAL) — only if product needs generated audio bubbles; inbound Deepgram voice notes already REAL; system TTS already covers Center speak.

---

## What to INTEGRATE (REAL — do not rebuild)

1. **`OpalCore.Bookings`** — Duffel/OpenTable/`Service`/HTTP/migrations; wire conversational paths; keep SyntheticReservationProvider out of “live booked” claims.
2. **`OpalCore.Wallets`** — ledger + HTTP; Stripe load remains gated until founder money-transmitter review.

Also **reuse without rebuilding** (PARTIAL cores that already exist):
- Google Calendar OAuth + freeBusy (`GoogleAdapter` / `ConnectorController` / `OpalWorking` CTA)
- Google Places Nearby + Text Search (`GooglePlaces`, `PlaceIdentity`, `OpportunitySource`)
- Voice-note ingest (`AudioIngestor` + Deepgram + conversation route)
- Plan/commitment reminder machinery + Celebration/Trip Oban workers

---

## CANDIDATE GAPS (not in this paste — one line each)

- Google Calendar **write** still `local-stub` — “Add to calendar” never hits Google Events.insert.
- OpenTable **book** is permanently non-self-serve even with key — restaurant live book still SyntheticReservation / handoff.
- `Places.VenueLookup` spike unwired to TripCanvas — trip curation still demo/fixture-shaped without live lookup glue.
- `PlaceProvider` default `:fixture` — real Places only when mode/credential flipped; silent synthetic forbidden when real.
- ReminderTransport Agent is process-local — not multi-node durable delivery for plan leave-bys.
- No Center `:remind` / booking / places / search tools in `OpalIntent` — senses/hands not yet Center-actionable.
- Contact pipeline omits Birthday field — celebrations cannot auto-fill from device contacts.
- No outbound **voice-note audio** media column path beyond transcript body + URL hint in `source_language`.
- Wallet spend HTTP surface thin vs load — product money flows may need spend/confirm endpoints beyond You-hub balance.
- Email absence also blocks invite-by-email (already noted `no_email_system_use_share_link`).

---

## Summary

**2 REAL · 4 PARTIAL · 0 STUB · 4 ABSENT.** Paste G should **build** search, email, social sync, HTML artifacts, freeform remind, Places details (and optionally calendar list/write + cloud TTS), and **integrate** existing Bookings + Wallets (plus freeBusy, Places nearby/text, Deepgram voice notes) without rebuilding them.

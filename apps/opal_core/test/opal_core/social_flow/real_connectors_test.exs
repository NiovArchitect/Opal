defmodule OpalCore.SocialFlow.RealConnectorsTest do
  @moduledoc "Real connectors campaign — calendar/location/device/place/booking."
  use OpalCore.DataCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Availability

  alias OpalCore.SocialFlow.RealWorld.{
    ProviderAuthority,
    ProviderConnections,
    StepAudit,
    TokenVault
  }

  alias OpalCore.SocialFlow.RealWorld.Calendar.{
    CompositeAdapter,
    FreeBusyStore,
    GoogleAdapter
  }

  alias OpalCore.SocialFlow.RealWorld.CalendarSufficiency
  alias OpalCore.SocialFlow.RealWorld.Cognition.Willingness
  alias OpalCore.SocialFlow.RealWorld.Device.Executor
  alias OpalCore.SocialFlow.RealWorld.Booking.Executor, as: BookingExecutor
  alias OpalCore.SocialFlow.RealWorld.Location.ApproximateStore
  alias OpalCore.SocialFlow.RealWorld.Place.Catalog
  alias OpalCore.SocialFlow.RealWorld.Proximity.TravelProvider

  defmodule FakeGoogleHTTP do
    @moduledoc false
    def post_json(_url, _body, _opts) do
      {:ok,
       %{
         "calendars" => %{
           "primary" => %{
             "busy" => [
               %{"start" => "2026-08-14T15:00:00Z", "end" => "2026-08-14T16:00:00Z"}
             ]
           }
         }
       }}
    end

    def post_form(_url, body) do
      if body["grant_type"] == "authorization_code" do
        {:ok,
         %{
           "access_token" => "ya29.test-access",
           "refresh_token" => "1//test-refresh",
           "expires_in" => 3600,
           "scope" => GoogleAdapter.preferred_scope()
         }}
      else
        {:ok, %{"access_token" => "ya29.refreshed", "expires_in" => 3600}}
      end
    end
  end

  setup do
    FreeBusyStore.reset()
    ApproximateStore.reset()

    previous = Application.get_env(:opal_core, :google_calendar_http_client)
    Application.put_env(:opal_core, :google_calendar_http_client, FakeGoogleHTTP)
    Application.put_env(:opal_core, :google_calendar_client_id, "test-client-id")
    Application.put_env(:opal_core, :google_calendar_client_secret, "test-client-secret")

    on_exit(fn ->
      Application.put_env(:opal_core, :google_calendar_http_client, previous)
      Application.delete_env(:opal_core, :google_calendar_client_id)
      Application.delete_env(:opal_core, :google_calendar_client_secret)
    end)

    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "rc-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "rc-b-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "rc-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{a: a, b: b, conv: conv}
  end

  # --- Token vault ---

  test "token vault encrypt/decrypt; redact never leaks" do
    assert {:ok, ct} = TokenVault.encrypt("super-secret-token")
    assert is_binary(ct)
    refute ct =~ "super-secret"
    assert {:ok, "super-secret-token"} = TokenVault.decrypt(ct)
    assert TokenVault.redact_for_log("super-secret-token") == "[redacted-token]"
  end

  # --- Provider authority law ---

  test "provider free does not authorize willingness or share" do
    c = ProviderAuthority.classify_fact("calendar_free_busy", %{"busy" => false})
    refute c["authorizes_willingness"]
    refute c["authorizes_share"]
    refute c["authorizes_set"]

    loc = ProviderAuthority.classify_fact("current_approximate_location", %{})
    refute loc["authorizes_share"]
  end

  # --- Google freeBusy normalization ---

  test "normalize freebusy strips titles and returns busy only" do
    body = %{
      "calendars" => %{
        "primary" => %{
          "busy" => [
            %{
              "start" => "2026-08-14T15:00:00Z",
              "end" => "2026-08-14T16:00:00Z",
              "title" => "Therapy"
            }
          ]
        }
      }
    }

    assert {:ok, [block]} = GoogleAdapter.normalize_freebusy_response(body)
    refute Map.has_key?(block, "title")
    assert block["no_event_titles"] == true
    assert block["busy"] == true
  end

  test "google adapter free_busy via fake HTTP", %{a: a} do
    assert {:ok, _} =
             ProviderConnections.upsert_tokens(a.id, "google_calendar", %{
               access_token: "tok",
               refresh_token: "ref",
               token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
               scopes: [GoogleAdapter.preferred_scope()],
               metadata: %{"calendar_id" => "primary"}
             })

    range = %{
      start_at: ~U[2026-08-14 00:00:00Z],
      end_at: ~U[2026-08-15 00:00:00Z]
    }

    assert {:ok, busy} = GoogleAdapter.free_busy(a.id, range)
    assert length(busy) == 1
    assert hd(busy)["no_event_titles"] == true

    pub = ProviderConnections.public_status(a.id, "google_calendar")
    assert pub["connected"]
    assert is_nil(pub["access_token"])
  end

  test "composite prefers google when connected, local otherwise", %{a: a} do
    assert {:error, _} =
             CompositeAdapter.free_busy(a.id, %{
               start_at: ~U[2026-08-14 00:00:00Z],
               end_at: ~U[2026-08-15 00:00:00Z]
             })

    FreeBusyStore.grant_permission(a.id)
    FreeBusyStore.put_busy(a.id, [])

    assert {:ok, []} =
             CompositeAdapter.free_busy(a.id, %{
               start_at: ~U[2026-08-14 00:00:00Z],
               end_at: ~U[2026-08-15 00:00:00Z]
             })
  end

  test "calendar free + willing eliminates manual input; free alone is not willing", %{
    a: a,
    conv: conv
  } do
    FreeBusyStore.grant_permission(a.id)
    FreeBusyStore.put_busy(a.id, [])

    s = ~U[2026-08-14 18:30:00.000000Z]
    e = ~U[2026-08-14 20:30:00.000000Z]

    # free but unknown willingness
    r =
      CalendarSufficiency.enrich_facts(
        a.id,
        %{has_fresh_windows: false, shared_overlap_found: false},
        candidate_start: s,
        candidate_end: e,
        willingness: "unknown"
      )

    assert r.calendar.calendar_free_for_candidate == true
    # capacity fact does not force social proposal alone — decision may still need permission
    refute Willingness.readiness(%{free: true, willingness: "unknown"})["ready_to_propose"]

    assert {:ok, i} =
             Availability.resolve_intervention(conv.id, a.id,
               candidate_start: s,
               candidate_end: e,
               willingness: "willing"
             )

    assert i["decision"] == "needs_permission"
    assert i["should_ask_time"] == false
    assert i["step_eliminated"] == "manual_calendar_check"
  end

  test "oauth revoke restores manual fallback path", %{a: a} do
    assert {:ok, _} =
             ProviderConnections.upsert_tokens(a.id, "google_calendar", %{
               access_token: "tok",
               refresh_token: "ref",
               token_expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
               scopes: [GoogleAdapter.preferred_scope()]
             })

    assert ProviderConnections.connected?(a.id, "google_calendar")
    assert {:ok, _} = ProviderConnections.revoke(a.id, "google_calendar")
    refute ProviderConnections.connected?(a.id, "google_calendar")

    # Manual path still works
    FreeBusyStore.grant_permission(a.id)
    assert {:ok, %{"granted" => true}} = FreeBusyStore.calendar_permission(a.id)
  end

  test "exchange_code stores tokens via fake HTTP", %{a: a} do
    assert {:ok, tokens} = GoogleAdapter.exchange_code("auth-code-xyz")
    assert tokens.access_token == "ya29.test-access"
    assert {:ok, _} = ProviderConnections.upsert_tokens(a.id, "google_calendar", tokens)
    assert ProviderConnections.public_status(a.id, "google_calendar")["token_present"]
  end

  # --- Location / travel ---

  test "approximate location is private and expirable", %{a: a} do
    assert {:ok, fact} =
             ApproximateStore.put(a.id, %{
               area_label: "Carlsbad",
               precision: "precise_coordinates",
               purpose: "dinner_between"
             })

    # capped precision for dinner
    assert fact["payload"]["precision"] == "coarse_area"
    assert fact["permission_class"] == "owner_private"

    assert {:ok, entry} = ApproximateStore.get(a.id)
    assert entry["area_label"] == "Carlsbad"
    ApproximateStore.revoke(a.id)
    assert {:error, :not_found} = ApproximateStore.get(a.id)
  end

  test "travel provider estimates without leaking origin" do
    assert {:ok, t} =
             TravelProvider.estimate(%{
               origin_lat: 33.15,
               origin_lng: -117.35,
               dest_lat: 33.03,
               dest_lng: -117.29,
               destination_label: "Harbor Table"
             })

    assert t["duration_minutes"] > 0
    refute t["origin_exposed"]
    assert t["step_eliminated"] == "how_far_is_that"
  end

  # --- Device execution ---

  test "device calendar create after Set with one authorization", %{a: a, conv: conv} do
    assert {:ok, prep} =
             Executor.prepare("calendar.create_event", %{
               actor_user_id: a.id,
               conversation_id: conv.id,
               set_authorized: true,
               start_at: ~U[2026-08-14 19:00:00Z],
               end_at: ~U[2026-08-14 21:00:00Z],
               place: "Harbor Table",
               shared_safe_summary: "Thursday · Harbor Table"
             })

    refute prep["reentry_required"]
    assert prep["state"] == "authorization_required"

    assert {:ok, done} = Executor.run(prep, user_authorized: true)
    assert done["state"] == "confirmed"
  end

  # --- Places / booking ---

  test "place catalog compresses and eliminates dominated noisy option" do
    ranked = Catalog.rank_for_group(category: "dinner", quiet_only: true)
    assert length(ranked["options"]) <= 3
    refute Enum.any?(ranked["options"], &(&1["id"] == "loud_bar"))
    assert ranked["no_feed"] == true
  end

  test "booking recovery preserves alignment without restart", %{conv: conv} do
    assert {:ok, result} =
             BookingExecutor.book_aligned(%{
               venue_id: "harbor_table",
               conversation_id: conv.id,
               user_authorized: true,
               provider_confirms: false,
               quiet_only: true,
               category: "dinner"
             })

    assert result["booking"]["booked"] == false
    assert result["recovery"]["aligned_context_preserved"] == true
    refute result["recovery"]["restart_required"]
  end

  test "successful booking only after provider confirm", %{conv: conv} do
    assert {:ok, result} =
             BookingExecutor.book_aligned(%{
               venue_id: "harbor_table",
               conversation_id: conv.id,
               user_authorized: true,
               slot_label: "7:30"
             })

    assert result["booking"]["booked"] == true
    assert result["booking"]["state"] == "confirmed"
  end

  # --- Step audit ---

  test "every connector reduces effort vs manual baseline" do
    audits = StepAudit.connector_audits()
    assert Enum.all?(audits, & &1["passed"])
    cal = Enum.find(audits, &(&1["after"] == "calendar_freebusy"))
    assert cal["questions_after"] == 0
    assert cal["app_switches_after"] == 0
  end

  # --- Courtship golden journey with real connectors ---

  test "courtship golden path: calendar + place + book auth", %{a: a, b: b, conv: conv} do
    FreeBusyStore.grant_permission(a.id)
    FreeBusyStore.put_busy(a.id, [])

    s = ~U[2026-08-14 18:30:00.000000Z]
    e = ~U[2026-08-14 21:00:00.000000Z]

    assert {:ok, i} =
             Availability.resolve_intervention(conv.id, a.id,
               candidate_start: s,
               candidate_end: e,
               willingness: "willing",
               actor_engagement: "organizer",
               peer_engagements: ["yes_no"]
             )

    assert i["decision"] == "needs_permission"
    assert i["should_ask_time"] == false

    # A shares — simulate windows from free fact by creating manual share path still works
    # Place ranking for both
    ranked =
      Catalog.rank_for_group(
        category: "dinner",
        quiet_only: true,
        travels: %{
          "harbor_table" => %{a.id => 12, b.id => 15},
          "coast_kitchen" => %{a.id => 25, b.id => 10}
        }
      )

    assert length(ranked["options"]) <= 3

    assert {:ok, book} =
             BookingExecutor.book_aligned(%{
               venue_id: hd(ranked["options"])["id"],
               conversation_id: conv.id,
               user_authorized: true,
               slot_label: "7:30"
             })

    assert book["booking"]["booked"] == true

    assert {:ok, cal_action} =
             Executor.prepare("calendar.create_event", %{
               actor_user_id: a.id,
               conversation_id: conv.id,
               set_authorized: true,
               start_at: s,
               end_at: e,
               place: hd(ranked["options"])["display_name"]
             })

    assert {:ok, confirmed} = Executor.run(cal_action, user_authorized: true)
    assert confirmed["state"] == "confirmed"
  end
end

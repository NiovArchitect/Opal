defmodule OpalCore.Calendar.CalendarFacadeTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Calendar
  alias OpalCore.Calendar.FreeBusyCache
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections

  defmodule FakeEventsHTTP do
    def get_json(_url, _opts) do
      {:ok,
       %{
         "items" => [
           %{
             "id" => "evt1",
             "status" => "confirmed",
             "summary" => "Secret Title",
             "start" => %{"dateTime" => "2026-10-09T18:00:00Z"},
             "end" => %{"dateTime" => "2026-10-09T20:00:00Z"}
           }
         ]
       }}
    end
  end

  defmodule FakeBusyHTTP do
    def post_json(_url, _body, _opts) do
      {:ok,
       %{
         "calendars" => %{
           "primary" => %{
             "busy" => [
               # Thursday 2026-10-08 18:00–20:00 UTC
               %{"start" => "2026-10-08T18:00:00Z", "end" => "2026-10-08T20:00:00Z"}
             ]
           }
         }
       }}
    end

    def post_form(_url, body) do
      cond do
        body["grant_type"] == "refresh_token" and body["refresh_token"] == "revoked-refresh" ->
          {:ok, %{"error" => "invalid_grant"}}

        body["grant_type"] == "refresh_token" ->
          {:ok, %{"access_token" => "ya29.refreshed", "expires_in" => 3600}}

        true ->
          {:ok,
           %{
             "access_token" => "ya29.access",
             "refresh_token" => "1//refresh",
             "expires_in" => 3600,
             "scope" => Calendar.oauth_scope_string()
           }}
      end
    end
  end

  setup do
    FreeBusyCache.reset()

    prior_events = Application.get_env(:opal_core, :google_calendar_events_http_client)
    prior_cal = Application.get_env(:opal_core, :google_calendar_http_client)

    Application.put_env(:opal_core, :google_calendar_events_http_client, FakeEventsHTTP)
    Application.put_env(:opal_core, :google_calendar_http_client, FakeBusyHTTP)
    Application.put_env(:opal_core, :google_calendar_client_id, "test-cid")
    Application.put_env(:opal_core, :google_calendar_client_secret, "test-csec")

    on_exit(fn ->
      restore(:google_calendar_events_http_client, prior_events)
      restore(:google_calendar_http_client, prior_cal)
      Application.delete_env(:opal_core, :google_calendar_client_id)
      Application.delete_env(:opal_core, :google_calendar_client_secret)
      FreeBusyCache.reset()
    end)

    {:ok, user} =
      %User{}
      |> User.changeset(%{display_name: "Cal", handle: "cal-#{System.unique_integer([:positive])}"})
      |> Repo.insert()

    %{user: user}
  end

  defp restore(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore(key, val), do: Application.put_env(:opal_core, key, val)

  defp connect!(user_id, opts \\ []) do
    refresh = Keyword.get(opts, :refresh_token, "1//refresh")
    status_expires = Keyword.get(opts, :token_expires_at, DateTime.add(DateTime.utc_now(), 3600, :second))

    assert {:ok, _} =
             ProviderConnections.upsert_tokens(user_id, "google_calendar", %{
               access_token: "ya29.access",
               refresh_token: refresh,
               token_expires_at: status_expires,
               scopes: Calendar.oauth_scopes(),
               metadata: %{"calendar_ids" => ["primary"]}
             })
  end

  test "filter_free_slots drops Thursday 7pm when busy 6-8", %{user: user} do
    connect!(user.id)

    # Thursday 2026-10-08 19:00 UTC (= 7pm) sits inside 18:00–20:00 busy block
    thu_7pm = ~U[2026-10-08 19:00:00Z]
    fri_7pm = ~U[2026-10-09 19:00:00Z]

    assert {:ok, %{calendar_checked: true, slots: slots}} =
             Calendar.filter_free_slots(user.id, [thu_7pm, fri_7pm], duration_minutes: 60)

    refute Enum.any?(slots, &(&1 == thu_7pm))
    assert fri_7pm in slots
  end

  test "free_busy cache hit within TTL; expires after short ttl", %{user: user} do
    connect!(user.id)
    start_at = ~U[2026-10-08 00:00:00Z]
    end_at = ~U[2026-10-09 00:00:00Z]

    assert {:ok, busy1} = Calendar.free_busy(user.id, start_at, end_at)
    assert length(busy1) == 1

    # Second call should be cache hit (same range) — still ok even if HTTP would fail
    Application.put_env(:opal_core, :google_calendar_http_client, OpalCore.Calendar.CalendarFacadeTest.BoomHTTP)
    assert {:ok, busy2} = Calendar.free_busy(user.id, start_at, end_at)
    assert busy2 == busy1

    # Force expiry via tiny TTL put override
    FreeBusyCache.reset()
    FreeBusyCache.put(user.id, "k", [%{"start_at" => start_at, "end_at" => end_at}], ttl_ms: 1)
    Process.sleep(5)
    assert :miss = FreeBusyCache.get(user.id, "k")
  end

  test "revoked refresh surfaces disconnected", %{user: user} do
    connect!(user.id,
      refresh_token: "revoked-refresh",
      token_expires_at: DateTime.add(DateTime.utc_now(), -60, :second)
    )

    assert {:error, :disconnected} =
             Calendar.free_busy(user.id, ~U[2026-10-08 00:00:00Z], ~U[2026-10-09 00:00:00Z])
  end

  test "list_events omits titles by default; include_titles adds them", %{user: user} do
    connect!(user.id)

    assert {:ok, [ev]} =
             Calendar.list_events(user.id, ~U[2026-10-09 00:00:00Z], ~U[2026-10-10 00:00:00Z])

    refute Map.has_key?(ev, "title")
    assert ev["busy"] == true

    assert {:ok, [ev2]} =
             Calendar.list_events(user.id, ~U[2026-10-09 00:00:00Z], ~U[2026-10-10 00:00:00Z],
               include_titles: true
             )

    assert ev2["title"] == "Secret Title"
  end

  test "not connected proposals do not claim calendar check", %{user: user} do
    assert {:ok, %{calendar_checked: false, connected: false, note: note}} =
             Calendar.filter_free_slots(user.id, [~U[2026-10-09 19:00:00Z]])

    assert note =~ "not connected"
  end

  defmodule BoomHTTP do
    def post_json(_, _, _), do: {:error, :http_error}
    def post_form(_, _), do: {:error, :http_error}
  end
end

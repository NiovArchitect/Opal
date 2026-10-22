defmodule OpalCoreWeb.R23PlaceSignalTest do
  @moduledoc """
  Repair #23 (WS-23-5) - PLACE SIGNAL, FELT: the tier read path.

  POST /api/v1/product/places/signals {"places" => [names]}.

  SERIALIZATION PURITY: the response carries ONLY a qualitative
  tier ("quiet" | "stirring" | "warm" | "alive") plus a coarse
  nearby boolean per requested place; no numeric heat field
  crosses the wire anywhere in the payload (asserted by key
  scan over the full serialized body).

  VIEWER SCOPING (two-account leg): A holds a hot place in
  their own graph (a live there + two moments from A's people);
  B holds no permitted fact about that place. B's read of the
  same place name returns "quiet". The tier is derived only
  from facts the viewer may already know - nothing from A's
  graph leaks into B's read.

  NEARBY (two-account legs, sharing backbone only): A and B are
  on a plan at a place that carries coordinates; B shares fresh
  location near the place. A's signals for that place return
  nearby true and nearby_user_ids includes B. D, on a different
  plan at another place with no one sharing, reads nearby
  false and sees no one in nearby_user_ids - the non-sharing
  pair never sees a nearby signal.

  Tier derivation leg: a place with a live + two moments reads
  strictly warmer than a place with only past memory.
  """

  use OpalCoreWeb.ConnCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Lives.{LiveRoom, Venue}
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{PlanLocationShare, PlanParticipant, SharedPlan}
  alias OpalCore.SocialFlow.Ambient.PlaceSignal
  alias OpalCore.SocialFlow.DeviceSession

  @place_hot "Harbor Pier"
  @place_cold "Quiet Beach"
  @place_share "Market Hall"
  @place_alone "Solo Ridge"

  setup do
    a = insert_user!("r23_pls_a", "R23 Signal A")
    b = insert_user!("r23_pls_b", "R23 Signal B")
    d = insert_user!("r23_pls_d", "R23 Signal D")

    # Dyad conversations make the pairs friends under
    # RelationshipGraph (friend visibility for the live leg).
    {:ok, _} = Messages.ensure_direct_conversation(a.id, b.id)
    {:ok, _} = Messages.ensure_direct_conversation(a.id, d.id)

    %{
      a: a,
      b: b,
      d: d,
      token_a: mint_token(a),
      token_b: mint_token(b),
      token_d: mint_token(d)
    }
  end

  defp authed(token), do: build_conn() |> put_req_header("authorization", "Bearer #{token}")

  defp signals!(token, places) do
    conn = authed(token) |> post("/api/v1/product/places/signals", %{"places" => places})
    json_response(conn, 200)
  end

  defp by_place(signals), do: Map.new(signals, &{&1["place"], &1})

  defp insert_user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end

  defp mint_token(%User{} = user) do
    n = System.unique_integer([:positive])
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user.id,
        device_label: "test-web",
        platform: "web",
        status: "active",
        session_ref: "ref-r23pls-#{n}",
        refresh_family: "rf-r23pls-#{n}",
        idempotency_key: "idem-r23pls-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end

  defp make_plan!(creator, participants, attrs) do
    attrs =
      Map.merge(
        %{title: "plan", status: "agreed", timezone: "UTC", source: "center", plan_type: "in_person"},
        attrs
      )
      |> Map.put(:created_by_user_id, creator.id)

    plan = %SharedPlan{} |> SharedPlan.changeset(attrs) |> Repo.insert!()

    for user <- [creator | participants] do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: user.id,
        response_state: "accepted"
      })
      |> Repo.insert!(on_conflict: :nothing)
    end

    plan
  end

  defp make_moment!(author, caption, place_name) do
    conn =
      mint_token(author)
      |> then(fn token -> authed(token) |> post("/api/v1/product/social-moments", %{
        "caption" => caption,
        "visibility" => "friends",
        "place_ref" => %{"display_name" => place_name},
        "media_ids" => []
      }) end)

    body = json_response(conn, 200)
    body["moment"]["id"]
  end

  defp make_live!(host, place_name) do
    venue =
      %Venue{}
      |> Venue.changeset(%{
        place_id: "r23-venue-#{System.unique_integer([:positive])}",
        name: place_name,
        status: "full",
        pay_token: "r23tok#{System.unique_integer([:positive])}"
      })
      |> Repo.insert!()

    %LiveRoom{}
    |> LiveRoom.changeset(%{
      host_account_id: host.id,
      venue_id: venue.id,
      status: "live",
      started_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
      title: "Live at #{place_name}"
    })
    |> Repo.insert!()
  end

  defp make_share!(plan_id, user_id, lat, lon) do
    # PlanLocationShare's changeset is private by design (the
    # share/3 context function is the writer); the row is
    # inserted directly here, the same shape share/3 persists.
    %PlanLocationShare{
      plan_id: plan_id,
      user_id: user_id,
      lat: lat,
      lon: lon,
      expires_at: DateTime.add(DateTime.utc_now(), 3600, :second)
    }
    |> Repo.insert!(
      on_conflict: {:replace, [:lat, :lon, :expires_at, :updated_at]},
      conflict_target: [:plan_id, :user_id]
    )
  end

  test "serialization purity: no numeric heat fields anywhere in the payload",
       %{a: a, b: b, token_a: token_a} do
    make_live!(a, @place_hot)
    make_moment!(b, "r23 signal moment one", @place_hot)
    make_moment!(a, "r23 signal moment two", @place_hot)

    body = signals!(token_a, [@place_hot, @place_cold])

    assert body["heat_map_ui"] == false
    assert is_list(body["signals"])
    assert length(body["signals"]) == 2

    for signal <- body["signals"] do
      assert signal["tier"] in PlaceSignal.tiers()
      assert is_boolean(signal["nearby"])
      assert is_binary(signal["place"])
    end

    flat = Jason.encode!(body)

    # No raw heat floats and no heat keys cross the wire.
    refute flat =~ "contextual_trending"
    refute flat =~ "world_heat"
    refute flat =~ "network_heat"
    refute flat =~ "relationship_heat"
    refute flat =~ "\"world\""
    refute flat =~ "\"network\""
    refute flat =~ "\"relationship\""
    refute flat =~ "heat_contribution"

    # And the full key scan: the payload's keys are exactly the
    # tier contract's keys - nothing extra rides along.
    assert Map.keys(body) |> Enum.sort() == ["heat_map_ui", "nearby_user_ids", "signals"]

    for signal <- body["signals"] do
      assert Map.keys(signal) |> Enum.sort() == ["nearby", "place", "tier"]
    end

    assert is_list(body["nearby_user_ids"])
    assert Enum.all?(body["nearby_user_ids"], &is_binary/1)
  end

  test "tier derivation: a live + two moments reads warmer than past memory alone",
       %{a: a, b: b, token_a: token_a} do
    make_live!(a, @place_hot)
    make_moment!(b, "r23 signal hot one", @place_hot)
    make_moment!(a, "r23 signal hot two", @place_hot)

    make_plan!(a, [b], %{
      title: "Long ago at the quiet beach",
      status: "completed",
      location: @place_cold,
      start_at: DateTime.add(DateTime.utc_now(), -40 * 24 * 3600, :second)
    })

    %{"signals" => signals} = signals!(token_a, [@place_hot, @place_cold])
    ranks = %{"quiet" => 0, "stirring" => 1, "warm" => 2, "alive" => 3}
    tiers = by_place(signals)

    assert ranks[tiers[@place_hot]["tier"]] > ranks[tiers[@place_cold]["tier"]]
    assert tiers[@place_cold]["tier"] == "quiet"
    refute tiers[@place_hot]["tier"] == "quiet"
  end

  test "viewer scoping (two-account): A's place reads quiet for B, who has no permitted facts",
       %{a: a, d: d, token_a: token_a, token_b: token_b} do
    # The isolation-clean fact shape is a plan: A holds an
    # agreed future plan at Solo Ridge with D. The plan is A's
    # permitted fact; B is not a party to it and holds no other
    # fact about the place. (Moments and lives are
    # friends-visible by their own gates, so they cannot
    # isolate two friend accounts from each other - plans can.)
    make_plan!(a, [d], %{
      title: "A's own plan at the solo ridge",
      status: "agreed",
      location: @place_alone,
      start_at: DateTime.add(DateTime.utc_now(), 3 * 24 * 3600, :second)
    })

    # A reads their own place as stirring (a real plan there).
    %{"signals" => a_signals} = signals!(token_a, [@place_alone])
    refute by_place(a_signals)[@place_alone]["tier"] == "quiet"

    # B - the second account, holding no permitted fact about
    # the place - reads the very same name as quiet.
    %{"signals" => b_signals} = signals!(token_b, [@place_alone])
    assert by_place(b_signals)[@place_alone]["tier"] == "quiet"

    # And an unknown name - no facts for anyone - reads quiet.
    %{"signals" => unknown} = signals!(token_b, ["Nowhere, Nowhere"])
    assert by_place(unknown)["Nowhere, Nowhere"]["tier"] == "quiet"
  end

  test "nearby: a sharing pair sees the tier; a non-sharing pair never does",
       %{a: a, b: b, d: d, token_a: token_a, token_b: token_b, token_d: token_d} do
    # Sharing pair: A and B on a plan at Market Hall, whose
    # place carries coordinates. B shares fresh location just
    # off the place.
    share_plan =
      make_plan!(a, [b], %{
        title: "Market hall afternoon",
        status: "agreed",
        location: @place_share,
        place_lat: 33.1581,
        place_lon: -117.3506,
        start_at: DateTime.add(DateTime.utc_now(), 2 * 3600, :second)
      })

    make_share!(share_plan.id, b.id, 33.1582, -117.3507)

    # Non-sharing pair: D is on a plan with A at Solo Ridge,
    # nobody shares anything there.
    make_plan!(a, [d], %{
      title: "Solo ridge hike",
      status: "agreed",
      location: @place_alone,
      place_lat: 33.2000,
      place_lon: -117.3000,
      start_at: DateTime.add(DateTime.utc_now(), 4 * 3600, :second)
    })

    # The sharing pair's read: A sees B as nearby at Market Hall.
    %{"signals" => a_signals, "nearby_user_ids" => a_nearby} =
      signals!(token_a, [@place_share, @place_alone])

    assert by_place(a_signals)[@place_share]["nearby"] == true
    assert b.id in a_nearby

    # B's side: A never shared, so B reads nearby false at
    # Market Hall - sharing is per person, never assumed back.
    %{"signals" => b_signals} = signals!(token_b, [@place_share])
    assert by_place(b_signals)[@place_share]["nearby"] == false

    # The non-sharing pair's read: A at Solo Ridge reads not
    # near - nobody there shared location.
    assert by_place(a_signals)[@place_alone]["nearby"] == false

    # D's own world: D shares nothing, sees nothing nearby.
    %{"signals" => d_signals, "nearby_user_ids" => d_nearby} =
      signals!(token_d, [@place_share, @place_alone])

    assert by_place(d_signals)[@place_share]["nearby"] == false
    assert by_place(d_signals)[@place_alone]["nearby"] == false
    refute b.id in d_nearby
    refute a.id in d_nearby

    # Expired share = no signal: move B's share into the past
    # and the pair reads not-near again.
    Repo.update_all(
      from(s in PlanLocationShare, where: s.plan_id == ^share_plan.id and s.user_id == ^b.id),
      set: [expires_at: DateTime.add(DateTime.utc_now(), -60, :second)]
    )

    %{"signals" => expired} = signals!(token_a, [@place_share])
    assert by_place(expired)[@place_share]["nearby"] == false
  end

  test "an unshared (no-share-row) pair never produces a nearby signal",
       %{a: a, b: b, token_a: token_a} do
    make_plan!(a, [b], %{
      title: "Plan with no shares",
      status: "agreed",
      location: @place_alone,
      place_lat: 33.2000,
      place_lon: -117.3000,
      start_at: DateTime.add(DateTime.utc_now(), 5 * 3600, :second)
    })

    %{"signals" => signals, "nearby_user_ids" => nearby} = signals!(token_a, [@place_alone])
    assert by_place(signals)[@place_alone]["nearby"] == false
    assert nearby == []
  end
end

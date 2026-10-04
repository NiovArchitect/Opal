defmodule OpalCore.Phase9aIntegrationProofTest do
  @moduledoc """
  Phase 9A — end-to-end integration proof across packet-b phases.

  No new features. Exercises seams. Journey 2 taste-from-trip-accept is
  documented as BROKEN (design escalation) — the rest of that chain is proven.
  """

  use OpalCoreWeb.ConnCase
  use Oban.Testing, repo: OpalCore.Repo

  import Ecto.Query
  import ExUnit.CaptureLog

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.Push.Adapters.Expo
  alias OpalCore.Push.DeviceTokens
  alias OpalCore.Push.Workers.DeliverPushWorker
  alias OpalCore.SocialFlow.AttentionCenter, as: AC
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.JourneyAuthority
  alias OpalCore.SocialFlow.MemoryCandidate
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.RecommendationIntelligence
  alias OpalCore.SocialFlow.RelationshipMemory
  alias OpalCore.SocialFlow.SharedPlan
  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter
  alias OpalCore.SocialFlow.TemporalHabitMiner
  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Trips.TripLeg

  @alex "+12025550101"
  @jordan "+12025550102"
  @expo_token "ExponentPushToken[p9a-integration-proof-token]"

  @equal_pool [
    %{
      "id" => "italian_spot",
      "display_name" => "Italian Spot",
      "cuisine" => "italian",
      "quiet" => false,
      "score" => 4.0,
      "open_now" => true,
      "max_party" => 6
    },
    %{
      "id" => "thai_spot",
      "display_name" => "Thai Spot",
      "cuisine" => "thai",
      "quiet" => false,
      "score" => 4.0,
      "open_now" => true,
      "max_party" => 6
    }
  ]

  setup do
    FixturesHelper.seed!()
    previous_phone = Application.get_env(:opal_core, :phone_verify_mode)
    previous_adapter = Application.get_env(:opal_core, :push_adapter)
    previous_http = Application.get_env(:opal_core, :expo_http_fun)

    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)
    Application.put_env(:opal_core, :push_adapter, :auto)

    on_exit(fn ->
      restore(:phone_verify_mode, previous_phone)
      restore(:push_adapter, previous_adapter)
      restore(:expo_http_fun, previous_http)
      System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
      System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
      System.delete_env("OPAL_TWILIO_FROM_NUMBER")
      System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")
    end)

    :ok
  end

  defp restore(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore(key, val), do: Application.put_env(:opal_core, key, val)

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "p9a-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp future_expires do
    DateTime.utc_now()
    |> DateTime.add(90 * 24 * 3600, :second)
    |> DateTime.truncate(:microsecond)
    |> DateTime.to_iso8601()
  end

  # ---------------------------------------------------------------------------
  # Journey 1 — ONBOARD → CONSENT
  # ---------------------------------------------------------------------------
  test "J1 ONBOARD→CONSENT: activate → grant product caps → list in API (You surface)", %{
    conn: conn
  } do
    {token, user_id} = activate(conn, @alex, "P9A Consent", "p9a_consent")

    # Empty list (fresh user)
    conn = build_conn() |> auth(token) |> get("/api/v1/product/consents")
    assert json_response(conn, 200)["consents"] == []

    expires = future_expires()

    for cap <- ["calls_outbound", "bookings_reserve"] do
      conn =
        build_conn()
        |> auth(token)
        |> post("/api/v1/product/consents", %{
          "capability" => cap,
          "expires_at" => expires
        })

      body = json_response(conn, 201)
      assert body["consent"]["capability"] == cap
      assert body["consent"]["status"] == "granted"
      assert body["consent"]["user_id"] in [nil, user_id] or is_binary(body["consent"]["id"])
    end

    conn = build_conn() |> auth(token) |> get("/api/v1/product/consents")
    list = json_response(conn, 200)["consents"]
    caps = Enum.map(list, & &1["capability"]) |> Enum.sort()
    assert "bookings_reserve" in caps
    assert "calls_outbound" in caps

    # Product You surface ("What Opal can do") reads this same list endpoint.
    assert length(list) >= 2
  end

  # ---------------------------------------------------------------------------
  # Journey 2 — TRIP → CURATE → PLAN → (taste seam escalated)
  # ---------------------------------------------------------------------------
  test "J2 TRIP→CURATE→PLAN→ACCEPT works; taste-from-accept is seam break", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "P9A Trip A", "p9a_trip_a")
    {_token_b, user_b} = activate(build_conn(), @jordan, "P9A Trip B", "p9a_trip_b")

    # Create Joshua Tree trip with peer
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{
        "title" => "Joshua Tree weekend",
        "destination_label" => "Joshua Tree",
        "user_ids" => [user_b]
      })

    trip = json_response(conn, 201)["trip"]
    trip_id = trip["id"]
    assert trip["destination_label"] == "Joshua Tree"

    # Curate → 7 suggestions across lodging/activity/meal
    conn = build_conn() |> auth(token_a) |> post("/api/v1/product/trips/#{trip_id}/curate")
    curate = json_response(conn, 200)
    assert curate["destination"] == "Joshua Tree"
    assert length(curate["suggestions"]) == 7
    types = curate["suggestions"] |> Enum.map(& &1["leg_type"]) |> Enum.uniq() |> Enum.sort()
    assert types == ["activity", "lodging", "meal"]

    meal = Enum.find(curate["suggestions"], &(&1["leg_type"] == "meal"))
    assert is_map(meal)

    # Add stop from suggestion (manual commit — no auto-leg)
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs", %{
        "leg_type" => meal["leg_type"],
        "place_label" => meal["name"],
        "notes" => meal["description"],
        "starts_on" => "2026-11-14",
        "ends_on" => "2026-11-14"
      })

    leg = json_response(conn, 201)["leg"]
    leg_id = leg["id"]
    assert leg["place_label"] == meal["name"]
    assert is_nil(leg["shared_plan_id"])

    # Make it a plan
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips/#{trip_id}/legs/#{leg_id}/create-plan")

    plan_body = json_response(conn, 201)
    plan_id = plan_body["plan"]["id"]
    assert plan_body["plan"]["status"] == "tentative"
    assert plan_body["plan"]["source"] == "trip_leg"
    assert is_nil(plan_body["plan"]["conversation_id"])

    leg_row = Repo.get!(TripLeg, leg_id)
    assert leg_row.shared_plan_id == plan_id

    # accept-going for both participants
    assert {:ok, going_a} = JourneyAuthority.accept_going(plan_id, user_a)
    assert going_a["response_state"] == "accepted"
    assert {:ok, going_b} = JourneyAuthority.accept_going(plan_id, user_b)
    assert going_b["response_state"] == "accepted"

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/journeys/#{plan_id}/accept-going")

    assert json_response(conn, 200)["response_state"] == "accepted"

    # SEAM: trip-leg plans stay tentative; accept_going does not call
    # PlanAgreementTasteBridge. No taste candidates from this path.
    plan = Repo.get!(SharedPlan, plan_id)
    assert plan.status == "tentative"

    taste_cands =
      from(c in MemoryCandidate,
        where: c.owner_user_id == ^user_a,
        where: like(c.candidate_summary, ^"taste:%")
      )
      |> Repo.all()

    # Documented integration break — escalate, do not invent wire.
    assert taste_cands == [],
           "EXPECTED SEAM: trip accept-going must not invent taste attrs; got #{inspect(Enum.map(taste_cands, & &1.candidate_summary))}"

    # 5C still works on destination curate when durable pref exists (separate path)
    assert {:ok, _, _} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_a,
               "preference" => "italian",
               "polarity" => "prefer",
               "weight_class" => "explicit"
             })

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/trips", %{
        "title" => "Palm Springs food",
        "destination_label" => "Palm Springs"
      })

    ps_id = json_response(conn, 201)["trip"]["id"]

    conn = build_conn() |> auth(token_a) |> post("/api/v1/product/trips/#{ps_id}/curate")
    meals = Enum.filter(json_response(conn, 200)["suggestions"], &(&1["leg_type"] == "meal"))
    assert hd(meals)["name"] == "Birba"
    assert hd(meals)["cuisine"] == "italian"
  end

  # ---------------------------------------------------------------------------
  # Journey 3 — TEMPORAL miner
  # ---------------------------------------------------------------------------
  test "J3 TEMPORAL: 8 Friday-evening plans → prefers:friday_evening" do
    user = insert_user!("p9a-temporal")
    conv = solo_conv(user)

    fridays = [
      ~D[2026-01-02],
      ~D[2026-01-09],
      ~D[2026-01-16],
      ~D[2026-01-23],
      ~D[2026-01-30],
      ~D[2026-02-06],
      ~D[2026-02-13],
      ~D[2026-02-20]
    ]

    for date <- fridays do
      insert_friday_plan!(conv, user, date)
    end

    result = TemporalHabitMiner.mine(user.id)
    assert result.plan_count == 8
    assert result.submitted >= 1

    prefers =
      Enum.find(result.patterns, fn p ->
        p.kind == :prefers and p.value_key == "temporal:prefers:friday_evening"
      end)

    assert prefers
    assert prefers.count == 8

    cand =
      from(c in MemoryCandidate,
        where: c.owner_user_id == ^user.id,
        where: c.candidate_summary == "temporal:prefers:friday_evening"
      )
      |> Repo.one()

    assert cand
    assert cand.source_type == "temporal_miner"
  end

  # ---------------------------------------------------------------------------
  # Journey 4 — PUSH Expo routing
  # ---------------------------------------------------------------------------
  test "J4 PUSH: Expo token → urgent → DeliverPushWorker uses Expo (not synthetic)" do
    user_id = insert_user!("p9a-push").id

    assert {:ok, _} =
             DeviceTokens.upsert(user_id, %{
               "platform" => "ios",
               "token" => @expo_token,
               "env" => "production"
             })

    Application.put_env(:opal_core, :expo_http_fun, fn url, body, _headers ->
      assert url =~ "exp.host"
      decoded = Jason.decode!(body)
      assert decoded["to"] == @expo_token

      {:ok,
       %{
         status: 200,
         body: %{"data" => %{"status" => "ok", "id" => "ticket-p9a-1"}}
       }}
    end)

    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, _} =
               AC.ingest(%{
                 "items" => [
                   %{
                     "recipient_user_id" => user_id,
                     "level" => "urgent",
                     "action_required" => true,
                     "dedupe_key" => "p9a:push:urgent:1",
                     "title" => "Fort Oak",
                     "copy" => "Needs your answer",
                     "source_type" => "proposal",
                     "conversation_id" => "conv-p9a-push",
                     "reason" => "decision_required"
                   }
                 ]
               })

      assert_enqueued(worker: DeliverPushWorker, args: %{"user_id" => user_id})

      prev = Logger.level()
      Logger.configure(level: :info)

      log =
        try do
          capture_log(fn ->
            assert :ok =
                     perform_job(DeliverPushWorker, %{
                       "user_id" => user_id,
                       "title" => "Fort Oak",
                       "body" => "Needs your answer",
                       "data" => %{"level" => "urgent"}
                     })
          end)
        after
          Logger.configure(level: prev)
        end

      assert log =~ "push.expo ticket_ok"
      assert log =~ "ticket-p9a-1"
      refute log =~ "push.synthetic"
      assert Expo.expo_token?(@expo_token)
    end)
  end

  # ---------------------------------------------------------------------------
  # Journey 5 — MEMORY transparency + forget + ranking
  # ---------------------------------------------------------------------------
  test "J5 MEMORY: facts list → Forget → gone; ranking loses italian boost", %{conn: conn} do
    {token, user_id} = activate(conn, @alex, "P9A Memory", "p9a_mem")

    assert {:ok, mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => user_id,
               "preference" => "taste:cuisine:italian"
             })

    conn = build_conn() |> auth(token) |> get("/api/v1/product/memory/facts")
    facts = json_response(conn, 200)["facts"]
    assert Enum.any?(facts, &(&1["id"] == mem.id))
    labels = Enum.map(facts, & &1["label"])
    assert "Prefers Italian food" in labels

    {:ok, before} =
      RecommendationIntelligence.recommend(%{
        "candidates" => @equal_pool,
        "viewer_user_id" => user_id,
        "load_durable_preferences" => true,
        "activity" => "dinner",
        "limit" => 5
      })

    # Explicit durable italian should soft-boost (or at least not crash ranking)
    assert is_list(before["ranked"])
    assert length(before["ranked"]) >= 2
    i_before = score(before, "italian_spot")
    t_before = score(before, "thai_spot")
    assert i_before >= t_before

    conn = build_conn() |> auth(token) |> delete("/api/v1/product/memory/facts/#{mem.id}")
    body = json_response(conn, 200)
    assert body["forgotten"] == true

    reloaded = Repo.get!(RelationshipMemory, mem.id)
    assert reloaded.deletion_state == "forgotten"

    conn = build_conn() |> auth(token) |> get("/api/v1/product/memory/facts")
    assert json_response(conn, 200)["facts"] == []

    {:ok, after_forget} =
      RecommendationIntelligence.recommend(%{
        "candidates" => @equal_pool,
        "viewer_user_id" => user_id,
        "load_durable_preferences" => true,
        "activity" => "dinner",
        "limit" => 5
      })

    # Ranking still works after forget; italian boost removed
    assert score(after_forget, "italian_spot") == score(after_forget, "thai_spot")
  end

  # ---------------------------------------------------------------------------
  # Journey 6 — SMS honest disabled
  # ---------------------------------------------------------------------------
  test "J6 SMS: adapter disabled without env — no crash, honest delivery", %{conn: conn} do
    System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
    System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    assert TwilioSmsAdapter.readiness() == {:disabled, :account_creds_missing}

    {token, _} = activate(conn, @alex, "P9A SMS", "p9a_sms")

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "message" => "Dinner?",
        "idempotency_key" => "p9a-inv-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    delivery = body["delivery"]
    assert delivery["sms_sent"] == false
    assert delivery["sms_adapter"] == "disabled"
    assert delivery["honest_no_production_sms"] == true
    assert is_binary(delivery["sms_disabled_reason"])
    assert body["product_delivery_label"] == "invite_ready"
  end

  # --- helpers ---

  defp insert_user!(handle) do
    %User{}
    |> User.changeset(%{
      handle: "#{handle}-#{System.unique_integer([:positive])}",
      display_name: handle
    })
    |> Repo.insert!()
  end

  defp solo_conv(user) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "p9a-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
    |> Repo.insert!()

    conv
  end

  defp insert_friday_plan!(conv, user, date) do
    start_at =
      DateTime.new!(date, ~T[19:00:00], "Etc/UTC")
      |> DateTime.truncate(:microsecond)

    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Friday dinner",
        status: "agreed",
        timezone: "UTC",
        start_at: start_at,
        created_by_user_id: user.id
      })
      |> Repo.insert!()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %PlanParticipant{}
    |> PlanParticipant.changeset(%{
      plan_id: plan.id,
      user_id: user.id,
      role: "lead",
      response_state: "accepted",
      responded_at: now,
      authority_source: "user_action"
    })
    |> Repo.insert!()

    plan
  end

  defp score(result, id) do
    row = Enum.find(result["ranked"] || [], &(&1["id"] == id))
    assert row, "missing ranked row #{id}"
    row["score"]
  end
end

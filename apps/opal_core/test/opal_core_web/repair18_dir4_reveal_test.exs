defmodule OpalCoreWeb.Repair18Dir4RevealTest do
  @moduledoc """
  Repair #18 DIR-4 (FR-18-DIR4) - THE PROACTIVE REVEAL derivation:
  one backend door (SocialFlow.Reveal) computes P1-P7 items from
  real records, enforces the QUIET ceilings, and honors permanent
  dismissal. Earn tests are keyed to spec section 2.1's deciding
  questions; isolation proves A's reveals never contain B's items.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Celebrations.Celebration
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    CareCheckIn,
    CareRotation,
    CheckinResponse,
    CheckinSweep,
    PlanParticipant,
    ProductShell,
    SharedPlan
  }

  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @a "+12025550301"
  @b "+12025550302"
  @c "+12025550303"

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(phone, name, handle) do
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "dir4-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)
    assert Provider.synthetic_mode?()

    conn =
      post(build_conn(), "/api/v1/product/activation/verify", %{
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

  defp reveals(token, path \\ "/api/v1/product/reveals") do
    build_conn() |> auth(token) |> get(path) |> json_response(200)
  end

  defp by_category(feed, cat), do: Enum.filter(feed["items"], &(&1["category"] == cat))

  defp insert_plan!(creator_id, attrs, participants) do
    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(
        Map.merge(
          %{
            title: "Plan",
            status: "tentative",
            created_by_user_id: creator_id,
            timezone: "UTC",
            source: "center"
          },
          attrs
        )
      )
      |> Repo.insert()

    for {user_id, response} <- participants do
      {:ok, _} =
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          plan_id: plan.id,
          user_id: user_id,
          response_state: response,
          role: "participant"
        })
        |> Repo.insert()
    end

    plan
  end

  test "FR-18-DIR4-01: P1/P2/P3/P4 earn their categories from real plan records" do
    {token_a, user_a} = activate(@a, "Dir4 A", "dir4_a")
    {token_b, user_b} = activate(@b, "Dir4 B", "dir4_b")

    # P1: B's answer is pending - the plan stops moving if B ignores it.
    p1 =
      insert_plan!(
        user_a,
        %{title: "Pending dinner", time_label: "Saturday 7 PM", location: "Juniper"},
        [{user_a, "accepted"}, {user_b, "pending"}]
      )

    feed_b = reveals(token_b)
    [item] = by_category(feed_b, "P1")
    assert item["plan_id"] == p1.id
    assert item["kicker"] == "Your move"
    assert item["plan_state"] == "action"
    assert item["entity_tint"] in 1..6
    # A has answered, so this plan earns A nothing.
    assert reveals(token_a)["items"] |> Enum.all?(&(&1["plan_id"] != p1.id))

    # P2: agreed, complete, not live - finished and waiting for a glance.
    p2 =
      insert_plan!(
        user_a,
        %{
          title: "Ready brunch",
          status: "agreed",
          time_label: "Sunday 11 AM",
          location: "Cafe"
        },
        [{user_a, "accepted"}, {user_b, "accepted"}]
      )

    [ready] = reveals(token_a)["items"] |> Enum.filter(&(&1["plan_id"] == p2.id))
    assert ready["category"] == "P2"
    assert ready["kicker"] == "Ready for you"
    assert ready["plan_state"] == "ready"

    # P3: exactly one named thing missing earns it; two missing does not.
    p3 =
      insert_plan!(
        user_a,
        %{title: "Hike", location: "The trailhead"},
        [{user_a, "accepted"}, {user_b, "accepted"}]
      )

    [shaping] = reveals(token_a)["items"] |> Enum.filter(&(&1["plan_id"] == p3.id))
    assert shaping["category"] == "P3"
    assert shaping["missing_slot"] == "time"
    assert shaping["action_label"] == "Pick a day"

    both_missing =
      insert_plan!(user_a, %{title: "Vague idea"}, [{user_a, "accepted"}, {user_b, "accepted"}])

    assert reveals(token_a)["items"] |> Enum.all?(&(&1["plan_id"] != both_missing.id))

    # P4: inside its live window right now.
    now = DateTime.utc_now()

    p4 =
      insert_plan!(
        user_a,
        %{
          title: "Live drinks",
          status: "agreed",
          location: "Bar",
          start_at: DateTime.add(now, -30 * 60, :second)
        },
        [{user_a, "accepted"}, {user_b, "accepted"}]
      )

    [live] = reveals(token_a)["items"] |> Enum.filter(&(&1["plan_id"] == p4.id))
    assert live["category"] == "P4"
    assert live["plan_state"] == "happening"
  end

  test "FR-18-DIR4-02: P5 only from an explicitly saved celebration at its moment" do
    {token_a, user_a} = activate(@a, "Dir4 A", "dir4_a")
    {token_b, _user_b} = activate(@b, "Dir4 B", "dir4_b")

    in_seven = Date.add(Date.utc_today(), 7)
    in_thirty = Date.add(Date.utc_today(), 30)

    {:ok, _} =
      %Celebration{}
      |> Celebration.changeset(%{
        user_id: user_a,
        person_name: "Maya",
        kind: "birthday",
        month: in_seven.month,
        day: in_seven.day
      })
      |> Repo.insert()

    {:ok, _} =
      %Celebration{}
      |> Celebration.changeset(%{
        user_id: user_a,
        person_name: "Far Away",
        kind: "birthday",
        month: in_thirty.month,
        day: in_thirty.day
      })
      |> Repo.insert()

    [p5] = by_category(reveals(token_a), "P5")
    assert p5["title"] == "Maya - birthday"
    assert p5["kicker"] == "Remember this"
    assert p5["plan_state"] == nil
    # Isolation: B saved nothing, so B has no P5.
    assert by_category(reveals(token_b), "P5") == []
  end

  test "FR-18-DIR4-03: P6 limited form - one recent report line, and P7 summaries count only" do
    {token_a, user_a} = activate(@a, "Dir4 A", "dir4_a")
    {token_b, user_b} = activate(@b, "Dir4 B", "dir4_b")
    {_token_c, user_c} = activate(@c, "Dir4 C", "dir4_c")

    {:ok, _, _} =
      ProductShell.record_recent_change(%{
        owner_user_id: user_a,
        title: "Plan updated",
        explanation: "Saturday dinner moved to 7:30 PM.",
        idempotency_key: "dir4-rc-1-#{System.unique_integer([:positive])}"
      })

    {:ok, _, _} =
      ProductShell.record_recent_change(%{
        owner_user_id: user_a,
        title: "Second report",
        explanation: "Another thing happened.",
        idempotency_key: "dir4-rc-2-#{System.unique_integer([:positive])}"
      })

    # The limited form is ONE line, however many reports exist.
    assert length(by_category(reveals(token_a), "P6")) == 1
    assert by_category(reveals(token_b), "P6") == []

    # P7 ask: an open sweep addressed to B that B has not answered.
    sweep_id = Ecto.UUID.generate()

    {:ok, _} =
      Repo.insert(%CheckinSweep{
        id: sweep_id,
        organizer_user_id: user_a,
        source_kind: "relationship_set",
        circle_key: "dir4-circle",
        circle_label: "Close friends",
        member_ids: [user_b, user_c],
        status: "open",
        expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
        idempotency_key: "dir4-sweep-#{System.unique_integer([:positive])}"
      })

    {:ok, _} =
      Repo.insert(%CheckinResponse{sweep_id: sweep_id, member_user_id: user_b, status: "asked"})

    {:ok, _} =
      Repo.insert(%CheckinResponse{
        sweep_id: sweep_id,
        member_user_id: user_c,
        status: "answered",
        okay: "ok",
        where_text: "PRIVATE-WHERE-TEXT",
        needs_text: "PRIVATE-NEEDS-TEXT"
      })

    [ask] = reveals(token_b)["items"] |> Enum.filter(&(&1["reveal_key"] =~ "checkin-ask"))
    assert ask["category"] == "P7"
    assert ask["kicker"] == "A gentle check-in"

    # P7 summary for the organizer: counts only - a member's private
    # words never appear in any reveal field, for anyone.
    feed_a = reveals(token_a)
    [summary] = feed_a["items"] |> Enum.filter(&(&1["reveal_key"] =~ "checkin-summary"))
    assert summary["substance"] == "1 of 2 answered."
    blob = Jason.encode!(feed_a) <> Jason.encode!(reveals(token_b))
    refute blob =~ "PRIVATE-WHERE-TEXT"
    refute blob =~ "PRIVATE-NEEDS-TEXT"

    # P7 missed care: only after the truth side surfaced it once,
    # only to a rotation member, and never in failure language.
    rotation_id = Ecto.UUID.generate()

    {:ok, _} =
      Repo.insert(%CareRotation{
        id: rotation_id,
        subject_label: "Mom",
        created_by_user_id: user_a,
        admin_user_id: user_a,
        member_user_ids: [user_a, user_b],
        cadence: %{"kind" => "daily"},
        timezone: "UTC",
        status: "active"
      })

    {:ok, _} =
      Repo.insert(%CareCheckIn{
        rotation_id: rotation_id,
        occurrence_key: "dir4-occ-1",
        assignee_user_id: user_a,
        slot_user_id: user_a,
        window_start_at: DateTime.add(DateTime.utc_now(), -7200, :second),
        window_end_at: DateTime.add(DateTime.utc_now(), -3600, :second),
        status: "open",
        missed_surfaced_at: DateTime.add(DateTime.utc_now(), -1800, :second)
      })

    [care] = reveals(token_a)["items"] |> Enum.filter(&(&1["reveal_key"] =~ "care-missed"))
    assert care["category"] == "P7"
    assert care["substance"] == "A check-in turn is still open."
    refute String.downcase(care["substance"]) =~ "fail"
    # B is a rotation member but not the assignee holder of this turn.
    assert reveals(token_b)["items"] |> Enum.all?(&(&1["reveal_key"] != care["reveal_key"]))
  end

  test "FR-18-DIR4-04: ceilings - Needs you capped at 3, exactly one lit item" do
    {_token_a, user_a} = activate(@a, "Dir4 A", "dir4_a")
    {token_b, user_b} = activate(@b, "Dir4 B", "dir4_b")

    for i <- 1..5 do
      insert_plan!(
        user_a,
        %{title: "Pending #{i}", time_label: "Saturday", location: "Somewhere"},
        [{user_a, "accepted"}, {user_b, "pending"}]
      )
    end

    feed = reveals(token_b)
    assert length(feed["deck"]["needs_you"]) == 3
    assert Enum.count(feed["items"], & &1["lit"]) == 1
  end

  test "FR-18-DIR4-05: dismissal is permanent, per viewer, across scopes" do
    {token_a, user_a} = activate(@a, "Dir4 A", "dir4_a")
    {token_b, user_b} = activate(@b, "Dir4 B", "dir4_b")

    plan =
      insert_plan!(
        user_a,
        %{title: "Dismiss me", time_label: "Saturday", location: "Somewhere"},
        [{user_a, "accepted"}, {user_b, "pending"}]
      )

    [item] = by_category(reveals(token_b), "P1")
    assert item["plan_id"] == plan.id

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/reveals/dismiss", %{"reveal_key" => item["reveal_key"]})

    feed_after = json_response(conn, 200)
    assert feed_after["items"] |> Enum.all?(&(&1["reveal_key"] != item["reveal_key"]))
    # Still gone on a fresh read, and in the conversation scope.
    assert reveals(token_b)["items"] |> Enum.all?(&(&1["reveal_key"] != item["reveal_key"]))

    scoped =
      reveals(token_b, "/api/v1/product/reveals?conversation_id=#{Ecto.UUID.generate()}")

    assert scoped["items"] == []
    # A never had this P1 (A answered), and A's feed is untouched.
    assert by_category(reveals(token_a), "P1") == []
  end

  test "FR-18-DIR4-06: two-account isolation - no item crosses accounts" do
    {token_a, user_a} = activate(@a, "Dir4 A", "dir4_a")
    {token_b, user_b} = activate(@b, "Dir4 B", "dir4_b")

    insert_plan!(
      user_a,
      %{title: "A only ready", status: "agreed", time_label: "Sunday", location: "Cafe"},
      [{user_a, "accepted"}]
    )

    insert_plan!(
      user_b,
      %{title: "B only ready", status: "agreed", time_label: "Sunday", location: "Cafe"},
      [{user_b, "accepted"}]
    )

    keys_a = MapSet.new(reveals(token_a)["items"], & &1["reveal_key"])
    keys_b = MapSet.new(reveals(token_b)["items"], & &1["reveal_key"])
    assert MapSet.disjoint?(keys_a, keys_b)
    titles_a = Enum.map(reveals(token_a)["items"], & &1["title"])
    refute "B only ready" in titles_a
  end
end

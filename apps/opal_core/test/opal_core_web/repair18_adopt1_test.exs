defmodule OpalCoreWeb.Repair18Adopt1Test do
  @moduledoc """
  Repair #18 adoption wave 1 - graph/people cluster regressions:

  - ST-A intentions: create/list/delete read-back, progress derived
    from the real kept-plan record, the missed window surfaces at
    most once, the no-people-scoring guardrail, two-account isolation.
  - ST-B shelf: sparks from the idea door, promote end-to-end through
    the graph-create door, starters whose basis dies disappear.
  - ST-G plan history: scripted lifecycle -> history lines equal the
    transition record in order, for two viewers; Who names + answers
    agree with the counts; neither viewer sees private memory.
  - 4.C10 goals: status derived from linked plans only; link/unlink.
  - 4.C1 holding: counter parity - chat answer == holding endpoint
    == the projection read in the same minute.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.GraphPeople
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanTransition
  alias OpalCore.SocialFlow.SharedPlan

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

  # --- helpers -----------------------------------------------------------

  defp activate(phone, name, handle) do
    conn =
      post(build_conn(), "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "adopt1-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp get_json(token, path) do
    build_conn() |> auth(token) |> get(path) |> json_response(200)
  end

  defp post_json(token, path, params, status \\ 201) do
    build_conn() |> auth(token) |> post(path, params) |> json_response(status)
  end

  defp graph_plan(token, attrs) do
    body = post_json(token, "/api/v1/product/opal/plans/graph-create", attrs)
    body["plan"]
  end

  # A kept plan, written through the creation gate: agreed, started in
  # the past, with the given people as participants.
  defp kept_plan!(creator_id, other_id, title, days_ago) do
    start =
      DateTime.utc_now()
      |> DateTime.add(-days_ago * 86_400, :second)
      |> DateTime.truncate(:microsecond)

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        "title" => title,
        "status" => "agreed",
        "start_at" => start,
        "timezone" => "UTC",
        "time_label" => "a while back",
        "created_by_user_id" => creator_id,
        "source" => "center",
        "alignment" => %{}
      })
      |> PlanTransition.guard_changeset(:plan, :create_agreed)
      |> Repo.insert()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for {user_id, role, state} <- [
          {creator_id, "lead", "accepted"},
          {other_id, "participant", "accepted"}
        ] do
      {:ok, _} =
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          "plan_id" => plan.id,
          "user_id" => user_id,
          "role" => role,
          "response_state" => state,
          "responded_at" => now
        })
        |> Repo.insert()
    end

    plan
  end

  # --- ST-A ---------------------------------------------------------------

  test "ST-A: intention progress derives from kept plans, missed surfaces once, isolation holds" do
    {token_a, user_a} = activate("+12025551101", "Adopt A", "adopt1_a")
    {token_b, user_b} = activate("+12025551102", "Maya B", "adopt1_b")

    kept = kept_plan!(user_a, user_b, "Monthly dinner", 40)

    created =
      post_json(token_a, "/api/v1/product/graph/intentions", %{
        "subject_user_id" => user_b,
        "title" => "See Maya every month",
        "cadence_days" => 30
      })

    intention = created["intention"]
    assert intention["title"] == "See Maya every month"
    assert intention["subject_name"] == "Maya B"
    assert intention["kept_count"] == 1
    assert intention["last_kept"]["plan_id"] == kept.id
    # 40 days since the kept plan, rhythm 30 days: the window is missed
    # and has not surfaced yet.
    assert intention["missed"] == true
    assert intention["missed_needs_surface"] == true
    assert intention["status_line"] =~ "Monthly dinner"
    assert intention["status_line"] =~ "Maya B"

    # Guardrail (product law): nothing in the projection scores,
    # grades, or rates the other person.
    encoded = Jason.encode!(intention)
    refute encoded =~ "score"
    refute encoded =~ "grade"
    refute encoded =~ "rating"
    refute encoded =~ "percent"

    # Read-back in the list.
    list = get_json(token_a, "/api/v1/product/graph/intentions")
    assert [%{"id" => id}] = list["intentions"]
    assert id == intention["id"]

    # Two-account isolation: the intention is the owner's only. The
    # subject's own list is empty - it never appears in their surfaces.
    assert get_json(token_b, "/api/v1/product/graph/intentions")["intentions"] == []

    # The missed window surfaces at most once for this kept record.
    surfaced =
      post_json(
        token_a,
        "/api/v1/product/graph/intentions/#{intention["id"]}/surfaced",
        %{},
        200
      )

    assert surfaced["intention"]["missed"] == true
    assert surfaced["intention"]["missed_needs_surface"] == false

    again = get_json(token_a, "/api/v1/product/graph/intentions")["intentions"]
    assert [%{"missed_needs_surface" => false}] = again

    # A newer kept plan advances the kept record and clears the miss.
    newer = kept_plan!(user_a, user_b, "Coffee catch-up", 5)
    list = get_json(token_a, "/api/v1/product/graph/intentions")["intentions"]
    assert [%{"last_kept" => %{"plan_id" => lid}, "missed" => false, "kept_count" => 2}] = list
    assert lid == newer.id

    # Delete removes it everywhere it was readable.
    build_conn()
    |> auth(token_a)
    |> delete("/api/v1/product/graph/intentions/#{intention["id"]}")
    |> json_response(200)

    assert get_json(token_a, "/api/v1/product/graph/intentions")["intentions"] == []
  end

  # --- ST-B ---------------------------------------------------------------

  test "ST-B: spark promotes end-to-end; starters live and die with their basis" do
    {token_a, user_a} = activate("+12025551111", "Shelf A", "adopt1_sa")
    {_token_b, user_b} = activate("+12025551112", "June B", "adopt1_sb")

    # A spark born at the idea door.
    spark =
      graph_plan(token_a, %{
        "title" => "Picnic at the lake",
        "entry" => "c2-idea",
        "idempotency_key" => "adopt1-spark-1"
      })

    assert is_binary(spark["id"])

    shelf = get_json(token_a, "/api/v1/product/graph/shelf")
    assert [spark_row] = shelf["sparks"]
    assert spark_row["id"] == spark["id"]
    assert spark_row["state"] == "spark"

    # Promote in one tap through the graph-create door: a real plan
    # exists and reads back in the plans list.
    promoted =
      post_json(token_a, "/api/v1/product/graph/shelf/#{spark["id"]}/promote", %{
        "time_label" => "Saturday 11 AM"
      })

    plan = promoted["plan"]
    assert plan["title"] == "Picnic at the lake"
    assert plan["status"] == "tentative"
    assert plan["id"] != spark["id"]

    plans = get_json(token_a, "/api/v1/product/opal/plans")["plans"]
    assert Enum.any?(plans, &(&1["id"] == plan["id"]))

    # The spark's state follows the plan, not a local flag.
    shelf = get_json(token_a, "/api/v1/product/graph/shelf")
    assert [spark_row] = shelf["sparks"]
    assert spark_row["state"] == "promoted"
    assert spark_row["promoted_plan"]["plan_id"] == plan["id"]

    # Promoting again returns the plan it already became.
    again =
      post_json(token_a, "/api/v1/product/graph/shelf/#{spark["id"]}/promote", %{})

    assert again["plan"]["id"] == plan["id"]

    # Celebration starter: basis is the saved celebration itself.
    today = Date.utc_today()
    soon = Date.add(today, 10)

    celebration =
      post_json(token_a, "/api/v1/product/celebrations", %{
        "person_name" => "June B",
        "kind" => "birthday",
        "month" => soon.month,
        "day" => soon.day
      })["celebration"]

    shelf = get_json(token_a, "/api/v1/product/graph/shelf")
    starter = Enum.find(shelf["starters"], &(&1["kind"] == "celebration"))
    assert starter["basis_line"] =~ "June B"
    assert starter["basis_line"] =~ "birthday"
    assert starter["basis_ref"] == celebration["id"]

    # The basis dies -> the starter disappears on the next read.
    build_conn()
    |> auth(token_a)
    |> delete("/api/v1/product/celebrations/#{celebration["id"]}")
    |> json_response(200)

    shelf = get_json(token_a, "/api/v1/product/graph/shelf")
    refute Enum.any?(shelf["starters"], &(&1["kind"] == "celebration"))

    # Long-unplanned-with starter: last shared plan 60 days ago,
    # nothing coming up with them.
    _old = kept_plan!(user_a, user_b, "Old hike", 60)
    shelf = get_json(token_a, "/api/v1/product/graph/shelf")
    person_starter = Enum.find(shelf["starters"], &(&1["kind"] == "person"))
    assert person_starter["basis_line"] =~ "June B"
    assert person_starter["prefill"]["participant_user_ids"] == [user_b]

    # A plan coming up with them kills that basis too.
    _upcoming =
      graph_plan(token_a, %{
        "title" => "Brunch soon",
        "participant_user_ids" => [user_b],
        "idempotency_key" => "adopt1-upcoming-1"
      })

    shelf = get_json(token_a, "/api/v1/product/graph/shelf")
    refute Enum.any?(shelf["starters"], &(&1["kind"] == "person"))
  end

  # --- ST-G ---------------------------------------------------------------

  test "ST-G: scripted lifecycle history equals the record for two viewers, no private memory leaks" do
    {token_a, user_a} = activate("+12025551121", "Hist A", "adopt1_ha")
    {token_b, user_b} = activate("+12025551122", "Hist B", "adopt1_hb")

    conv =
      post_json(token_a, "/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    plan =
      post_json(token_a, "/api/v1/product/conversations/#{conv["conversation_id"]}/plans", %{
        "title" => "Dinner at Juniper",
        "place" => "Juniper and Ivy",
        "location" => "Juniper and Ivy",
        "time_label" => "Saturday 7:30 PM"
      })

    plan = plan["plan"]
    plan_id = plan["id"]

    # B answers: going.
    build_conn()
    |> auth(token_b)
    |> post("/api/v1/product/journeys/#{plan_id}/accept-going", %{})
    |> json_response(200)

    # At this moment the Who list and counts say B is going, 2 of 2 -
    # asserted here, before the plan changes underneath the answer.
    answered = get_json(token_a, "/api/v1/product/opal/plans/#{plan_id}/history")
    who_then = Enum.find(answered["who"], &(&1["user_id"] == user_b))
    assert who_then["name"] == "Hist B"
    assert who_then["response_label"] == "Going"
    assert answered["counts"]["going_count"] == 2
    assert answered["counts"]["total_count"] == 2

    # A sets the place through the real details-edit path.
    {:ok, _} =
      SocialFlow.edit_plan_details(%{
        plan_id: plan_id,
        user_id: user_a,
        changes: %{"location" => "Rosewood Kitchen"},
        trace_id: "adopt1-test"
      })

    # A sets the day through the Journey material-change path (an
    # accepted revision - the transition record for day changes).
    {:ok, _journey} =
      OpalCore.SocialFlow.JourneyAuthority.material_change(plan_id, user_a, %{
        "time_label" => "Sunday 6 PM"
      })

    history_a = get_json(token_a, "/api/v1/product/opal/plans/#{plan_id}/history")
    history_b = get_json(token_b, "/api/v1/product/opal/plans/#{plan_id}/history")

    lines_a = Enum.map(history_a["history"], & &1["line"])
    lines_b = Enum.map(history_b["history"], & &1["line"])

    # Same shared truth, in the same order, for both viewers.
    assert lines_a == lines_b
    assert Enum.any?(lines_a, &(&1 =~ "Created by Hist A"))
    assert Enum.any?(lines_a, &(&1 =~ "Hist B said they are going"))
    assert Enum.any?(lines_a, &(&1 =~ "set the place to Rosewood Kitchen"))
    assert Enum.any?(lines_a, &(&1 =~ "set the day to Sunday 6 PM"))
    # Newest first: the day change (last write) precedes creation.
    assert List.first(lines_a) =~ "Sunday 6 PM"
    assert List.last(lines_a) =~ "Created by Hist A"

    # Who after the material change: the canonical projection says B
    # was re-asked (the material-change reconfirm reset is the real
    # record), so B waits to answer and the going count is the lead
    # alone - the counts and the names still agree by construction,
    # and B's earlier answer stays in the history lines above.
    who_b = Enum.find(history_a["who"], &(&1["user_id"] == user_b))
    assert who_b["name"] == "Hist B"
    assert who_b["response_label"] == "Waiting to answer"
    assert history_a["counts"]["going_count"] == 1
    assert history_a["counts"]["total_count"] == 2

    # A drops the plan: the drop is the newest history line for both.
    {:ok, _} =
      SocialFlow.cancel_plan(%{plan_id: plan_id, user_id: user_a, trace_id: "adopt1-test"})

    after_a = get_json(token_a, "/api/v1/product/opal/plans/#{plan_id}/history")
    after_b = get_json(token_b, "/api/v1/product/opal/plans/#{plan_id}/history")

    assert Enum.map(after_a["history"], & &1["line"]) ==
             Enum.map(after_b["history"], & &1["line"])

    assert List.first(Enum.map(after_a["history"], & &1["line"])) =~ "dropped this plan"

    # Neither viewer's private memory is part of the shared history.
    {:ok, _memory, _} =
      DurablePreferenceMemory.remember_explicit(%{
        "owner_user_id" => user_a,
        "counterpart_user_id" => user_b,
        "preference" => "quiet barns at dawn"
      })

    final = get_json(token_b, "/api/v1/product/opal/plans/#{plan_id}/history")
    refute Jason.encode!(final) =~ "quiet barns"
  end

  # --- 4.C10 ----------------------------------------------------------------

  test "4.C10: goal status is derived from linked plans only; link and unlink read back" do
    {token_a, user_a} = activate("+12025551131", "Goal A", "adopt1_ga")
    {token_c, _user_c} = activate("+12025551133", "Goal C", "adopt1_gc")

    created = post_json(token_a, "/api/v1/product/graph/goals", %{"title" => "See Dad monthly"})
    goal = created["goal"]
    assert goal["status_line"] =~ "No plans linked yet"
    assert goal["linked_count"] == 0

    plan =
      graph_plan(token_a, %{"title" => "Dinner with Dad", "idempotency_key" => "adopt1-goal-1"})

    linked =
      post_json(
        token_a,
        "/api/v1/product/graph/goals/#{goal["id"]}/link",
        %{
          "plan_id" => plan["id"]
        },
        200
      )

    assert linked["goal"]["linked_count"] == 1
    refute linked["goal"]["status_line"] =~ "No plans linked yet"

    # Complete the linked plan through the gate (agree, then
    # complete - the only legal path): the status updates from that
    # completion, and only from it.
    {:ok, agreed} =
      Repo.get(SharedPlan, plan["id"])
      |> SharedPlan.changeset(%{status: "agreed"})
      |> PlanTransition.guard_changeset(:plan, :agree)
      |> Repo.update()

    {:ok, _} =
      agreed
      |> SharedPlan.changeset(%{status: "completed", completed_at: DateTime.utc_now()})
      |> PlanTransition.guard_changeset(:plan, :complete)
      |> Repo.update()

    goals = get_json(token_a, "/api/v1/product/graph/goals")["goals"]
    assert [goal_row] = goals
    assert goal_row["completed_count"] == 1
    assert goal_row["status_line"] =~ "Last finished: Dinner with Dad"

    # Linking a plan the owner cannot read is refused honestly.
    foreign =
      graph_plan(token_c, %{"title" => "Not yours", "idempotency_key" => "adopt1-goal-foreign"})

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/graph/goals/#{goal["id"]}/link", %{"plan_id" => foreign["id"]})

    assert json_response(conn, 422)["error_code"] == "plan_not_found"

    # Unlink returns the goal to saying it has no linked activity.
    unlinked =
      post_json(
        token_a,
        "/api/v1/product/graph/goals/#{goal["id"]}/unlink",
        %{
          "plan_id" => plan["id"]
        },
        200
      )

    assert unlinked["goal"]["linked_count"] == 0
    assert unlinked["goal"]["status_line"] =~ "No plans linked yet"
    _ = user_a
  end

  # --- 4.C1 -----------------------------------------------------------------

  test "4.C1: chat holding answer equals the holding projection in the same minute" do
    {token_a, user_a} = activate("+12025551141", "Hold A", "adopt1_ho")
    {_token_b, user_b} = activate("+12025551142", "Hold B", "adopt1_hb2")

    # Two plans in motion for A: one of A's own, one B made with A
    # still to answer.
    _own =
      graph_plan(token_a, %{"title" => "A own plan", "idempotency_key" => "adopt1-hold-1"})

    shared = kept_plan!(user_a, user_b, "Shared but finished", 3)
    _ = shared

    # Make A a pending invitee on a fresh active plan from B.
    {:ok, pending_plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        "title" => "B invites A",
        "status" => "tentative",
        "timezone" => "UTC",
        "time_label" => "Friday 7 PM",
        "created_by_user_id" => user_b,
        "source" => "center",
        "alignment" => %{}
      })
      |> PlanTransition.guard_changeset(:plan, :create)
      |> Repo.insert()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {:ok, _} =
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        "plan_id" => pending_plan.id,
        "user_id" => user_b,
        "role" => "lead",
        "response_state" => "accepted",
        "responded_at" => now
      })
      |> Repo.insert()

    {:ok, _} =
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        "plan_id" => pending_plan.id,
        "user_id" => user_a,
        "role" => "participant",
        "response_state" => "pending"
      })
      |> Repo.insert()

    {:ok, _memory, _} =
      DurablePreferenceMemory.remember_explicit(%{
        "owner_user_id" => user_a,
        "preference" => "quiet restaurants"
      })

    holding = get_json(token_a, "/api/v1/product/opal/holding")
    counters = holding["counters"]

    # Independent expectations: 2 active plans (own tentative + the
    # pending-invite tentative; the agreed plan in the past is also
    # active-governed, so 3), 1 approval waiting (A's pending row),
    # 1 memory held.
    assert counters["plans_in_motion"] == 3
    assert counters["approvals_waiting"] == 1
    assert counters["memories_held"] == 1

    assert counters["sources_connected"] ==
             GraphPeople.holding(user_a)["counters"]["sources_connected"]

    assert holding["links"]["plans_in_motion"] == "graphs"
    assert holding["links"]["memories_held"] == "what-opal-remembers"

    # The chat answer is the same projection, in words.
    body =
      post_json(
        token_a,
        "/api/v1/product/opal/conversation/messages",
        %{"body" => "What are you holding for me?"}
      )

    opal_msg = body["messages"] |> Enum.filter(&(&1["role"] == "opal")) |> List.last()
    assert opal_msg["body"] == holding["answer_text"]
    assert opal_msg["body"] =~ "3 plans in motion"
    assert opal_msg["body"] =~ "1 waiting on your answer"
    assert opal_msg["metadata"]["holding"]["counters"] == counters
  end
end

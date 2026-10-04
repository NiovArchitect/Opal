defmodule OpalCore.SocialFlow.TemporalHabitMinerWorkerTest do
  use OpalCore.DataCase, async: false

  import ExUnit.CaptureLog

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    PlanParticipant,
    SharedPlan,
    TemporalHabitMinerWorker
  }

  setup do
    previous = Application.get_env(:opal_core, :temporal_habit_miner_fun)

    on_exit(fn ->
      if previous do
        Application.put_env(:opal_core, :temporal_habit_miner_fun, previous)
      else
        Application.delete_env(:opal_core, :temporal_habit_miner_fun)
      end
    end)

    :ok
  end

  test "worker is Oban worker on :events with max_attempts 3" do
    opts = TemporalHabitMinerWorker.__opts__()
    assert opts[:queue] == :events
    assert opts[:max_attempts] == 3
  end

  test "cron entry present in config.exs (Sunday 02:00 weekly)" do
    path = Path.expand("../../../config/config.exs", __DIR__)
    contents = File.read!(path)

    assert contents =~ ~s({"0 2 * * 0", OpalCore.SocialFlow.TemporalHabitMinerWorker})
    # TFT tick unchanged
    assert contents =~ ~s({"* * * * *", OpalCore.SocialFlow.TemporalFollowThroughTickWorker})
  end

  test "eligible query returns only users with ≥5 agreed/completed plans" do
    eligible_a = insert_user!("p5d-a")
    eligible_b = insert_user!("p5d-b")
    thin = insert_user!("p5d-thin")

    seed_plans!(eligible_a, 5, "agreed")
    seed_plans!(eligible_b, 6, "completed")
    seed_plans!(thin, 3, "agreed")
    # cancelled do not count toward eligibility
    seed_plans!(thin, 5, "cancelled")

    ids = MapSet.new(TemporalHabitMinerWorker.eligible_user_ids())
    assert MapSet.member?(ids, eligible_a.id)
    assert MapSet.member?(ids, eligible_b.id)
    refute MapSet.member?(ids, thin.id)
  end

  test "perform mines 2 eligible users; thin stays out; no crash" do
    eligible_a = insert_user!("p5d-ok-a")
    eligible_b = insert_user!("p5d-ok-b")
    thin = insert_user!("p5d-thin2")

    seed_plans!(eligible_a, 5, "agreed")
    seed_plans!(eligible_b, 5, "agreed")
    seed_plans!(thin, 2, "agreed")

    tracked = MapSet.new([eligible_a.id, eligible_b.id, thin.id])
    {:ok, agent} = Agent.start_link(fn -> %{} end)

    Application.put_env(:opal_core, :temporal_habit_miner_fun, fn user_id ->
      result =
        cond do
          user_id == eligible_a.id ->
            %{submitted: 1, plan_count: 5, patterns: [], results: []}

          user_id == eligible_b.id ->
            :insufficient_data

          true ->
            # Shared sandbox may include eligible users from sibling tests
            :insufficient_data
        end

      if MapSet.member?(tracked, user_id) do
        Agent.update(agent, &Map.put(&1, user_id, result))
      end

      result
    end)

    assert :ok = TemporalHabitMinerWorker.perform(%Oban.Job{args: %{}})

    called = Agent.get(agent, & &1)
    assert called[eligible_a.id] == %{submitted: 1, plan_count: 5, patterns: [], results: []}
    assert called[eligible_b.id] == :insufficient_data
    refute Map.has_key?(called, thin.id)
  end

  test "one user raising → worker continues others and logs warn" do
    boom = insert_user!("p5d-boom")
    ok = insert_user!("p5d-survive")

    seed_plans!(boom, 5, "agreed")
    seed_plans!(ok, 5, "agreed")

    tracked = MapSet.new([boom.id, ok.id])
    {:ok, agent} = Agent.start_link(fn -> %{called: [], results: %{}} end)

    Application.put_env(:opal_core, :temporal_habit_miner_fun, fn user_id ->
      if MapSet.member?(tracked, user_id) do
        Agent.update(agent, fn st -> %{st | called: [user_id | st.called]} end)
      end

      cond do
        user_id == boom.id ->
          raise "simulated miner failure"

        user_id == ok.id ->
          result = %{submitted: 0, plan_count: 5, patterns: [], results: []}
          Agent.update(agent, fn st -> %{st | results: Map.put(st.results, user_id, result)} end)
          result

        true ->
          :insufficient_data
      end
    end)

    log =
      capture_log(fn ->
        assert :ok = TemporalHabitMinerWorker.perform(%Oban.Job{args: %{}})
      end)

    st = Agent.get(agent, & &1)
    called = MapSet.new(st.called)
    assert MapSet.member?(called, boom.id)
    assert MapSet.member?(called, ok.id)
    assert st.results[ok.id] == %{submitted: 0, plan_count: 5, patterns: [], results: []}
    assert log =~ "user=#{boom.id} error=simulated miner failure"
  end

  # --- helpers ---

  defp seed_plans!(user, n, status) when n > 0 do
    conv = solo_conv(user)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for i <- 1..n do
      plan =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          conversation_id: conv.id,
          title: "p5d-#{status}-#{i}",
          status: status,
          timezone: "UTC",
          start_at: DateTime.add(now, i * 86_400, :second),
          created_by_user_id: user.id,
          cancelled_at:
            if(status == "cancelled", do: now, else: nil)
        })
        |> Repo.insert!()

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
    end

    :ok
  end

  defp insert_user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp solo_conv(user) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "p5d-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
    |> Repo.insert!()

    conv
  end
end

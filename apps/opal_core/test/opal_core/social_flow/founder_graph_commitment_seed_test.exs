defmodule OpalCore.SocialFlow.FounderGraphCommitmentSeedTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{FounderGraphCommitmentSeed, JourneyAuthority, PlanParticipant}

  setup do
    viewer =
      %User{}
      |> User.changeset(%{
        handle: "founder_viewer_#{System.unique_integer([:positive])}",
        display_name: "Founder Viewer"
      })
      |> Repo.insert!()

    %{viewer: viewer}
  end

  test "ensure! provisions SharedPlan backing for lock-in without leaking production", %{
    viewer: viewer
  } do
    assert {:ok, payload} =
             FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    assert payload["card_id"] == "seed-jordan-market"
    assert is_binary(payload["shared_plan_id"])
    assert is_binary(payload["conversation_id"])
    assert payload["commitment_phase"] == true
    assert payload["journey_available"] == true
    assert payload["production_fixture_leak"] == false
    assert payload["parallel_shared_plan"] == false
    assert payload["shared_plan_duplicated"] == false
    # Repair #18: canonical vocabulary - interested is "pending" now.
    assert payload["viewer_response_state"] == "pending"
    assert payload["viewer_state"] == "pending"
    assert payload["total_count"] == 6
    assert payload["going_count"] == 2
    assert payload["interested_count"] == 4
    assert payload["participation_phase"] == "lock_in"

    assert {:ok, going} = JourneyAuthority.accept_going(payload["shared_plan_id"], viewer.id)
    assert going["current_user_accepted"] == true
    assert going["other_participants_unchanged"] == true
    assert going["forced_navigation"] == false
    assert going["going_count"] == 3
    assert going["interested_count"] == 3

    me =
      Repo.get_by(PlanParticipant,
        plan_id: payload["shared_plan_id"],
        user_id: viewer.id
      )

    assert me.response_state == "accepted"
  end

  test "explicit opt-in required", %{viewer: viewer} do
    assert {:error, :explicit_opt_in_required} = FounderGraphCommitmentSeed.ensure!(viewer.id)
  end

  # Repair #18 FALSE-fix F-10: re-seeding a cancelled seed plan restores
  # it ONLY via the logged PlanTransition :seed_restore exception.
  test "cancelled seed plan is restored through the gate exception, with a log line", %{
    viewer: viewer
  } do
    import ExUnit.CaptureLog
    alias OpalCore.SocialFlow.SharedPlan

    assert {:ok, payload} =
             FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)

    plan = Repo.get!(SharedPlan, payload["shared_plan_id"])
    assert plan.status == "agreed"

    plan
    |> SharedPlan.changeset(%{status: "cancelled"})
    |> Repo.update!()

    log =
      capture_log(fn ->
        assert {:ok, _} =
                 FounderGraphCommitmentSeed.ensure!(viewer.id, explicit_opt_in: true)
      end)

    assert log =~ "founder_seed.seed_restore"
    assert log =~ "from_status=cancelled"
    assert Repo.get!(SharedPlan, plan.id).status == "agreed"
  end

  # The gate exception is seed-shaped only: :seed_restore is the ONLY
  # outbound move from terminal plan statuses, and ordinary actions
  # (accept/change/cancel/complete) stay illegal from them.
  test "terminal plans still refuse every product transition" do
    alias OpalCore.SocialFlow.PlanTransition

    for status <- ~w(cancelled completed), action <- [:agree, :change, :cancel, :complete, :edit] do
      assert {:error, :illegal_transition} = PlanTransition.transition(:plan, status, action),
             "expected #{action} from #{status} to stay illegal"
    end

    assert {:ok, "agreed"} = PlanTransition.transition(:plan, "cancelled", :seed_restore)
    assert {:ok, "agreed"} = PlanTransition.transition(:plan, "completed", :seed_restore)
  end
end

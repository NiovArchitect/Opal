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
    assert payload["viewer_response_state"] in ~w(tentative proposed)
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
end

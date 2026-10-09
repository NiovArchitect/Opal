defmodule OpalCore.SocialFlow.CenterPlanTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.{PlanParticipant, SharedPlan}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()

  test "create_tentative_plan_from_center inserts durable solo SharedPlan" do
    assert {:ok, plan, [participant]} =
             SocialFlow.create_tentative_plan_from_center(alex(), %{
               "title" => "Juniper & Ivy",
               "area" => "Silver Lake",
               "time_label" => "Open window",
               "decision_id" => "dec-test-1"
             })

    assert plan.source == "center"
    assert is_nil(plan.conversation_id)
    assert plan.status == "tentative"
    assert plan.title == "Juniper & Ivy"
    assert plan.alignment["center_v2"] == true
    assert plan.alignment["scope"] == "solo"

    assert participant.user_id == alex()
    assert participant.role == "lead"
    assert participant.response_state == "accepted"

    reloaded = Repo.get!(SharedPlan, plan.id)
    assert reloaded.source == "center"
    assert Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: alex())
  end

  test "create_tentative_plan_from_center requires title" do
    assert {:error, :invalid_title} =
             SocialFlow.create_tentative_plan_from_center(alex(), %{"area" => "Nowhere"})
  end
end

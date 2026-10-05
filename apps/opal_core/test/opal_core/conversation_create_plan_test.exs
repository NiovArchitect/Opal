defmodule OpalCore.ConversationCreatePlanTest do
  @moduledoc "Phase 11A — tentative SharedPlan from conversation place option."
  use OpalCore.DataCase, async: false

  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.SharedPlan

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp alex, do: Fixtures.user_alex_id()
  defp jordan, do: Fixtures.user_jordan_id()
  defp conv, do: Fixtures.conv_alex_jordan_id()

  test "create_tentative_plan_from_conversation → tentative, members, creator accepted, peers pending" do
    assert {:ok, plan, participants} =
             SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
               "title" => "Fort Oak",
               "place" => "Fort Oak",
               "location" => "Fort Oak",
               "area" => "North Park"
             })

    assert plan.title == "Fort Oak"
    assert plan.location == "Fort Oak"
    assert plan.status == "tentative"
    assert plan.source == "conversation"
    assert plan.conversation_id == conv()
    assert plan.created_by_user_id == alex()
    assert is_nil(plan.trip_leg_id)
    assert plan.alignment["area"] == "North Park"
    # Never invent taste attrs from place names
    refute Map.has_key?(plan.alignment, "cuisine")
    refute Map.has_key?(plan.alignment, "vibe")
    refute Map.has_key?(plan.alignment, "price")

    assert length(participants) == 2

    by_user = Map.new(participants, &{&1.user_id, &1})
    assert by_user[alex()].role == "lead"
    assert by_user[alex()].response_state == "accepted"
    assert by_user[alex()].authority_source == "plan_this"
    assert by_user[jordan()].role == "participant"
    assert by_user[jordan()].response_state == "pending"
    assert by_user[jordan()].authority_source == "plan_this"

    db = Repo.get!(SharedPlan, plan.id)
    assert db.status == "tentative"
    assert db.source == "conversation"
    assert db.conversation_id == conv()
  end

  test "missing title → :invalid_title" do
    assert {:error, :invalid_title} =
             SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
               "area" => "North Park"
             })
  end

  test "non-member → :not_a_member" do
    stranger = Ecto.UUID.generate()

    assert {:error, :not_a_member} =
             SocialFlow.create_tentative_plan_from_conversation(conv(), stranger, %{
               "title" => "Somewhere"
             })
  end

  test "does not invent cuisine from place name like Juniper & Ivy" do
    assert {:ok, plan, _} =
             SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
               "title" => "Juniper & Ivy",
               "place" => "Juniper & Ivy"
             })

    alignment = plan.alignment || %{}
    refute Map.has_key?(alignment, "cuisine")
    refute Map.has_key?(alignment, "vibe")
    refute Map.has_key?(alignment, "price")
    assert alignment == %{}

    assert Repo.get_by!(PlanParticipant, plan_id: plan.id, user_id: alex()).response_state ==
             "accepted"
  end
end

defmodule OpalCore.Center.PlanningContextTest do
  use OpalCore.DataCase

  alias OpalCore.Center.PlanningContext
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.OpalConversations

  setup do
    FixturesHelper.seed!()
    user_id = Fixtures.user_alex_id()
    {:ok, _} = OpalConversations.get_or_create_conversation(user_id)
    # Reset planning context for isolation
    {:ok, _} = PlanningContext.merge(user_id, %{}, %{})
    %{user_id: user_id}
  end

  test "WHO preserved across destination extraction", %{user_id: user_id} do
    assert {:ok, ctx1} =
             PlanningContext.merge(user_id, %{who: ["Chanelle"]}, %{})

    assert ctx1["primary_person"] == "Chanelle"
    assert who_includes?(ctx1["who"], "Chanelle")

    assert {:ok, ctx2} =
             PlanningContext.merge(user_id, %{}, %{"destination" => "Mexico City"})

    assert ctx2["destination"] == "Mexico City"
    assert ctx2["primary_person"] == "Chanelle"
    assert who_includes?(ctx2["who"], "Chanelle")
  end

  test "place-like who from classifier does not overwrite Chanelle", %{user_id: user_id} do
    assert {:ok, _} = PlanningContext.merge(user_id, %{who: "Chanelle"}, %{})

    assert {:ok, ctx} =
             PlanningContext.merge(
               user_id,
               %{who: ["Mexico", "City"]},
               %{"destination" => "Mexico City"}
             )

    assert ctx["destination"] == "Mexico City"
    assert who_includes?(ctx["who"], "Chanelle")
    refute who_includes?(ctx["who"], "Mexico")
  end

  test "sanitize_who strips destination tokens" do
    assert PlanningContext.sanitize_who(["Mexico", "City"], "Mexico City") == nil
    assert PlanningContext.sanitize_who("Mexico", "Mexico City") == nil
    assert PlanningContext.sanitize_who(["Chanelle"], "Mexico City") == ["Chanelle"]
    assert PlanningContext.sanitize_who("Chanelle", "Mexico City") == "Chanelle"
  end

  test "restaurant readiness requires who + destination + when", %{user_id: user_id} do
    assert {:ok, ctx} =
             PlanningContext.merge(
               user_id,
               %{
                 who: "Chanelle",
                 when: "Saturday",
                 category: "restaurant",
                 wants_restaurant: true
               },
               %{"destination" => "Mexico City"}
             )

    assert PlanningContext.ready_for_restaurant_search?(ctx)
  end

  defp who_includes?(who, name) when is_binary(who), do: who == name
  defp who_includes?(who, name) when is_list(who), do: name in who
  defp who_includes?(_, _), do: false
end

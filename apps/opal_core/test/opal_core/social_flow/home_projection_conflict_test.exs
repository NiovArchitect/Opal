defmodule OpalCore.SocialFlow.HomeProjectionConflictTest do
  @moduledoc """
  Repair #18 (Division A, gap-fill) - F18-03 on the chats-list / thread
  card: plan_payload (SocialFlow) carried "conflict", but the
  HomeProjection card did not, so the overlap was invisible exactly
  where the founder saw the two 7:30 plans. The card now merges the
  SAME conflict object (SocialFlow.plan_conflict/1 - no second
  detector) for cards backed by a real plan, following the
  plan_payload convention: a real plan with no overlap carries
  "conflict" => nil; a card with no plan behind it carries no key.
  """

  use OpalCore.DataCase, async: false

  alias OpalCore.MultiuserHarness
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.HomeProjection
  alias OpalCore.SocialFlow.SharedPlan

  defp rand_name(base), do: base <> "-" <> (:crypto.strong_rand_bytes(2) |> Base.encode16())

  defp eligible_alignment(plan, place) do
    %{
      "commitment" => "aligned",
      "date" => %{"value" => "Saturday"},
      "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
      "place" => %{"state" => "locked", "value" => place},
      "lineage_id" => plan.id
    }
  end

  defp card_for(plan, viewer_id, place) do
    HomeProjection.from_alignment(
      eligible_alignment(plan, place),
      plan.conversation_id,
      2,
      viewer_id: viewer_id
    )
  end

  defp overlapping_pair do
    user = MultiuserHarness.account!(%{display_name: rand_name("CardConf")})
    peer = MultiuserHarness.account!(%{display_name: rand_name("CardConfPeer")})

    start =
      DateTime.utc_now()
      |> DateTime.add(3 * 24 * 3600, :second)
      |> DateTime.truncate(:microsecond)

    start = %{start | hour: 19, minute: 30, second: 0}

    crew =
      MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
        title: "Juniper crew",
        time_label: "7:30 PM",
        status: "agreed"
      })

    crew |> SharedPlan.changeset(%{"start_at" => start}) |> Repo.update!()

    dinner =
      MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
        title: "Dinner with Chanelle",
        time_label: "7:30 PM",
        status: "agreed"
      })

    dinner |> SharedPlan.changeset(%{"start_at" => start}) |> Repo.update!()

    {user, crew, dinner, start}
  end

  test "each overlapping plan's card carries the conflict naming the other" do
    {user, crew, dinner, _start} = overlapping_pair()

    dinner_card = card_for(dinner, user.id, "Juniper")
    assert dinner_card["conflict"]["with_plan_id"] == crew.id
    assert dinner_card["conflict"]["title"] == "Juniper crew"
    assert dinner_card["conflict"]["time_label"] == "7:30 PM"

    crew_card = card_for(crew, user.id, "Juniper")
    assert crew_card["conflict"]["with_plan_id"] == dinner.id
    assert crew_card["conflict"]["title"] == "Dinner with Chanelle"
    assert crew_card["conflict"]["time_label"] == "7:30 PM"

    # Same object the plan_payload path carries for the same plan.
    {:ok, listed} = OpalCore.SocialFlow.list_plans_for_user(user.id)
    payload = Enum.find(listed, &(&1["id"] == dinner.id))
    assert dinner_card["conflict"] == payload["conflict"]
  end

  test "after moving one plan, both cards' conflicts clear" do
    {user, crew, dinner, start} = overlapping_pair()

    assert card_for(dinner, user.id, "Juniper")["conflict"] != nil

    dinner
    |> SharedPlan.changeset(%{"start_at" => DateTime.add(start, 2 * 3600, :second)})
    |> Repo.update!()

    assert card_for(dinner, user.id, "Juniper")["conflict"] == nil
    assert card_for(crew, user.id, "Juniper")["conflict"] == nil
  end

  test "after cancelling one plan, the survivor's card conflict clears" do
    {user, crew, dinner, _start} = overlapping_pair()

    assert card_for(crew, user.id, "Juniper")["conflict"] != nil

    dinner
    |> SharedPlan.changeset(%{"status" => "cancelled"})
    |> Repo.update!()

    assert card_for(crew, user.id, "Juniper")["conflict"] == nil
  end

  test "a solo plan's card carries conflict nil, and a plan-less card carries no key" do
    user = MultiuserHarness.account!(%{display_name: rand_name("CardSolo")})
    peer = MultiuserHarness.account!(%{display_name: rand_name("CardSoloPeer")})

    solo =
      MultiuserHarness.create_shared_plan!(user.id, [peer.id], %{
        title: "Solo window",
        time_label: "Thursday 7:30 PM",
        status: "agreed"
      })

    card = card_for(solo, user.id, "Juniper")
    assert Map.has_key?(card, "conflict")
    assert card["conflict"] == nil

    # An eligible-looking alignment with no plan behind it at all: the
    # card exists but honestly carries no conflict key (same as the
    # attendance counts).
    planless =
      HomeProjection.from_alignment(
        %{
          "commitment" => "aligned",
          "date" => %{"value" => "Saturday"},
          "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
          "place" => %{"state" => "locked", "value" => "Juniper"}
        },
        Ecto.UUID.generate(),
        2,
        viewer_id: user.id
      )

    assert is_map(planless)
    refute Map.has_key?(planless, "conflict")
  end
end

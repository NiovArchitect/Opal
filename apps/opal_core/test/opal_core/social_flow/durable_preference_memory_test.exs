defmodule OpalCore.SocialFlow.DurablePreferenceMemoryTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DurablePreferenceMemory
  alias OpalCore.SocialFlow.RelationshipMemory

  setup do
    uid = System.unique_integer([:positive])

    {:ok, owner} =
      %User{}
      |> User.changeset(%{display_name: "Maya", handle: "dpm-maya-#{uid}"})
      |> Repo.insert()

    %{owner: owner}
  end

  test "remember_explicit persists and survives re-read", %{owner: owner} do
    assert {:ok, mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "quiet restaurants",
               "weight_class" => "old_statement",
               "polarity" => "prefer"
             })

    assert mem.visibility == "private"
    assert mem.deletion_state == "active"
    assert mem.summary =~ ~r/quiet/i

    # Session restart simulation: re-query DB (not Agent / sessionStorage)
    listed = DurablePreferenceMemory.list_for_owners([owner.id])
    assert length(listed) == 1
    assert hd(listed).id == mem.id

    facts = DurablePreferenceMemory.facts_for_participants([owner.id])
    assert length(facts) == 1
    assert hd(facts)["preference"] =~ ~r/quiet/i
    assert hd(facts)["durable"] == true
    assert hd(facts)["permission_class"] == "owner_private"
  end

  test "idempotent — no duplicate for same owner preference", %{owner: owner} do
    assert {:ok, m1, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "quiet restaurants"
             })

    assert {:ok, m2, :idempotent} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "quiet restaurants"
             })

    assert m1.id == m2.id
    assert length(DurablePreferenceMemory.list_for_owners([owner.id])) == 1
  end

  test "episode-only intent is not auto-durable", %{owner: owner} do
    assert {:error, :episode_intent_not_durable} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "somewhere lively tonight"
             })
  end

  test "TEMPORARY_INTENT_NOT_PROMOTED_TO_DURABLE_TRAIT — stay home tonight", %{owner: owner} do
    assert {:error, :episode_intent_not_durable} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "stay home tonight"
             })

    assert {:error, :episode_intent_not_durable} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "just this once stay in"
             })

    # No homebody / tonight durable trait written for owner
    listed = DurablePreferenceMemory.list_for_owners([owner.id])
    refute Enum.any?(listed, &String.match?(&1.summary || "", ~r/homebody|stay home tonight/i))

    all =
      Repo.all(RelationshipMemory)
      |> Enum.filter(&(&1.owner_user_id == owner.id and &1.deletion_state == "active"))

    refute Enum.any?(all, &String.match?(&1.summary || "", ~r/homebody|stay home tonight/i))
  end

  test "current override path does not delete durable quiet memory", %{owner: owner} do
    assert {:ok, mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "quiet restaurants",
               "weight_class" => "old_statement"
             })

    # Episode lively is not written as durable
    assert {:error, :episode_intent_not_durable} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "lively tonight"
             })

    reloaded = Repo.get!(RelationshipMemory, mem.id)
    assert reloaded.deletion_state == "active"
    assert reloaded.summary =~ ~r/quiet/i
  end

  test "forget revokes durable memory", %{owner: owner} do
    assert {:ok, mem, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "italian places"
             })

    assert {:ok, _} = DurablePreferenceMemory.forget(mem.id, owner.id)
    assert DurablePreferenceMemory.list_for_owners([owner.id]) == []
  end

  test "supersede replaces preference with provenance", %{owner: owner} do
    assert {:ok, _old, :created} =
             DurablePreferenceMemory.remember_explicit(%{
               "owner_user_id" => owner.id,
               "preference" => "quiet restaurants"
             })

    assert {:ok, new_m, _} =
             DurablePreferenceMemory.supersede(owner.id, "quiet restaurants", %{
               "preference" => "lively environments",
               "weight_class" => "repeated_behavior"
             })

    facts = DurablePreferenceMemory.facts_for_participants([owner.id])
    assert length(facts) == 1
    assert hd(facts)["preference"] =~ ~r/lively/i
    assert new_m.summary =~ ~r/lively/i
  end
end

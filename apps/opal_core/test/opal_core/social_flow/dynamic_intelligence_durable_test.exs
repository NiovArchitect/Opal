defmodule OpalCore.SocialFlow.DynamicIntelligenceDurableTest do
  use OpalCore.DataCase

  alias OpalCore.{Fixtures, FixturesHelper}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DynamicIntelligence.Durable
  alias OpalCore.SocialFlow.DynamicIntelligence.{ExperienceOpportunity, Fixtures, SocialContext}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp conv, do: Fixtures.conversation_id_for_durable()
  defp a, do: Fixtures.user_a_id()
  defp b, do: Fixtures.user_b_id()
  defp c, do: Fixtures.user_c_id()
  defp d, do: Fixtures.user_d_outsider_id()

  test "context and opportunity persist after evaluate" do
    assert {:ok, payload, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-persist-1"
             })

    refute payload["quiet"]
    assert payload["primary_option"] == "Quiet bistro fixture"
    assert payload["not_a_chat_participant"] == true
    assert payload["opportunity_id"]

    assert Repo.aggregate(SocialContext, :count) == 1
    assert Repo.aggregate(ExperienceOpportunity, :count) == 1

    assert {:ok, again} = Durable.get_for_user(conv(), a())
    assert again["opportunity_id"] == payload["opportunity_id"]
    assert again["headline"] =~ "three of you"
  end

  test "duplicate evaluation is idempotent" do
    attrs = %{
      conversation_id: conv(),
      requester_user_id: a(),
      use_dinner_fixture: true,
      member_ids: Fixtures.member_ids(),
      idempotency_key: "phase2-idem-1"
    }

    assert {:ok, first, :created} = Durable.evaluate_and_persist(attrs)
    assert {:ok, second, :idempotent} = Durable.evaluate_and_persist(attrs)
    assert first["opportunity_id"] == second["opportunity_id"]
    assert Repo.aggregate(ExperienceOpportunity, :count) == 1
  end

  test "private participation persists separately from shared summary" do
    assert {:ok, _, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-part-1"
             })

    assert {:ok, _} = Durable.record_participation(conv(), a(), "interested")
    assert {:ok, _} = Durable.record_participation(conv(), b(), "interested")

    assert {:ok, for_c} =
             Durable.record_participation(conv(), c(), "not_this_time",
               private_reason: "budget too high"
             )

    assert for_c["private_participation"]["state"] == "not_this_time"
    assert for_c["private_participation"]["private_reason"] == "budget too high"
    refute (for_c["participation_summary"] || "") =~ "budget"
    refute Jason.encode!(for_c["shared_projection"] || %{}) =~ "budget"

    assert {:ok, for_a} = Durable.get_for_user(conv(), a())
    refute for_a["private_participation"]["private_reason"] == "budget too high"
    # A does not see C's private reason
    assert for_a["private_participation"]["state"] == "interested"
  end

  test "correction Not with this group suppresses future surface" do
    assert {:ok, _, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-corr-1"
             })

    assert {:ok, correction} =
             Durable.record_correction(conv(), a(), "Not with this group.")

    assert correction["kind"] == "suppress_group_context"
    assert correction["global_label"] == false
    assert correction["friendship_score_change"] == false

    assert {:ok, quiet} = Durable.get_for_user(conv(), a())
    assert quiet["quiet"] == true

    assert {:ok, suppressed, :suppressed} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-corr-2"
             })

    assert suppressed["quiet"] == true
  end

  test "not this time sets cooldown and does not immediately reappear" do
    assert {:ok, _, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-dismiss-1"
             })

    assert {:ok, quiet} = Durable.dismiss(conv(), a(), "not_this_time")
    assert quiet["quiet"] == true

    assert {:ok, still_quiet, :suppressed} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-dismiss-2"
             })

    assert still_quiet["quiet"] == true
  end

  test "weak context remains quiet and persists no opportunity" do
    assert {:ok, payload, :silence} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               member_ids: Fixtures.member_ids(),
               messages: Fixtures.quiet_ordinary_messages(),
               participants: Fixtures.participants(),
               venues: Fixtures.venues(),
               time_window: Fixtures.time_window(),
               idempotency_key: "phase2-quiet-1"
             })

    assert payload["quiet"] == true
    assert Repo.aggregate(ExperienceOpportunity, :count) == 0
  end

  test "expiry removes active moment" do
    assert {:ok, payload, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-exp-1"
             })

    opp = Repo.get!(ExperienceOpportunity, payload["opportunity_id"])
    past = DateTime.add(DateTime.utc_now(), -3600, :second) |> DateTime.truncate(:microsecond)

    opp
    |> ExperienceOpportunity.changeset(%{expires_at: past})
    |> Repo.update!()

    Durable.expire_stale()
    assert {:ok, quiet} = Durable.get_for_user(conv(), a())
    assert quiet["quiet"] == true
  end

  test "user D outsider denied" do
    assert {:error, :not_a_member} = Durable.get_for_user(conv(), d())

    assert {:error, :not_a_member} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: d(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-out-1"
             })
  end

  test "private budget never leaks in shared projection" do
    assert {:ok, payload, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-budget-1"
             })

    blob = Jason.encode!(payload) |> String.downcase()
    refute blob =~ "cannot afford"
    refute blob =~ "max_price"
    # "budget" word must not appear as private reason in shared fields
    shared = Jason.encode!(payload["shared_projection"] || %{}) |> String.downcase()
    refute shared =~ "budget"
  end

  test "web refresh restores one moment" do
    assert {:ok, first, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "phase2-refresh-1"
             })

    assert {:ok, refresh_a} = Durable.get_for_user(conv(), a())
    assert {:ok, refresh_b} = Durable.get_for_user(conv(), b())
    assert refresh_a["opportunity_id"] == first["opportunity_id"]
    assert refresh_b["opportunity_id"] == first["opportunity_id"]
    assert refresh_a["primary_option"] == refresh_b["primary_option"]
  end
end

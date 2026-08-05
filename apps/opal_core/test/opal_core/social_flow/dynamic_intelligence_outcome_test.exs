defmodule OpalCore.SocialFlow.DynamicIntelligenceOutcomeTest do
  use OpalCore.DataCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.DynamicIntelligence.{Durable, Fixtures, Outcome}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp conv, do: Fixtures.conversation_id_for_durable()
  defp a, do: Fixtures.user_a_id()
  defp d, do: Fixtures.user_d_outsider_id()

  defp surface! do
    assert {:ok, payload, :created} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               use_dinner_fixture: true,
               member_ids: Fixtures.member_ids(),
               idempotency_key: "p3-#{System.unique_integer([:positive])}"
             })

    payload
  end

  test "explicit completion and idempotent completion" do
    opp = surface!()
    oid = opp["opportunity_id"]

    assert {:ok, c1, :created} =
             Outcome.complete(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid,
               idempotency_key: "c-1",
               evidence_class: "explicit_confirmation"
             })

    assert c1["continuity_label"] == "Happened"
    assert c1["shared_safe_summary"] =~ "worked well"
    refute String.downcase(c1["shared_safe_summary"] || "") =~ "budget"

    assert {:ok, c2, :idempotent} =
             Outcome.complete(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid,
               idempotency_key: "c-1",
               evidence_class: "explicit_confirmation"
             })

    assert c1["id"] == c2["id"]
  end

  test "time alone cannot complete" do
    assert {:error, :time_alone_cannot_complete} = Outcome.complete_from_time_alone(%{})

    opp = surface!()

    assert {:error, :time_alone_cannot_complete} =
             Outcome.complete(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: opp["opportunity_id"],
               idempotency_key: "time-1",
               evidence_class: "time_elapsed"
             })
  end

  test "reflection surfaces or suppresses; one lightweight response learns" do
    opp = surface!()
    oid = opp["opportunity_id"]

    assert {:ok, _, :created} =
             Outcome.complete(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid,
               idempotency_key: "c-ref-1",
               evidence_class: "explicit_confirmation"
             })

    assert {:ok, quiet, :suppressed} =
             Outcome.maybe_surface_reflection(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid,
               low_learning_value: true
             })

    assert quiet["quiet"] == true

    # New completion path with force surface
    opp2 = surface!()
    oid2 = opp2["opportunity_id"]

    assert {:ok, _, :created} =
             Outcome.complete(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid2,
               idempotency_key: "c-ref-2",
               evidence_class: "explicit_confirmation"
             })

    assert {:ok, refl, :surfaced} =
             Outcome.maybe_surface_reflection(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid2
             })

    assert refl["prompt"] =~ "choose a place like this again"
    assert "yes" in refl["actions"]

    assert {:ok, answered} =
             Outcome.respond_to_reflection(%{
               conversation_id: conv(),
               user_id: a(),
               reflection_id: refl["id"],
               response: "yes"
             })

    assert answered.reflection["status"] == "answered"
    assert answered.learning.accepted > 0
  end

  test "not with this group suppresses group learning without global label" do
    opp = surface!()
    oid = opp["opportunity_id"]

    assert {:ok, _, :created} =
             Outcome.complete(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid,
               idempotency_key: "c-corr-1",
               evidence_class: "explicit_confirmation"
             })

    assert {:ok, refl, :surfaced} =
             Outcome.maybe_surface_reflection(%{
               conversation_id: conv(),
               user_id: a(),
               opportunity_id: oid
             })

    assert {:ok, result} =
             Outcome.respond_to_reflection(%{
               conversation_id: conv(),
               user_id: a(),
               reflection_id: refl["id"],
               response: "not_with_this_group"
             })

    assert result.learning[:suppressed] == true or result.learning["suppressed"] == true
    assert result.learning[:global_label] == false or result.learning["global_label"] == false
  end

  test "learning modestly boosts ranking but hard constraints still win" do
    # Seed positive learning for the three-person dinner set
    set_key =
      Fixtures.member_ids()
      |> Enum.map(&to_string/1)
      |> Enum.sort()
      |> Enum.join(",")

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %OpalCore.SocialFlow.DynamicIntelligence.ScopedLearning{}
    |> OpalCore.SocialFlow.DynamicIntelligence.ScopedLearning.changeset(%{
      conversation_id: conv(),
      experience_type: "dinner",
      participant_set_key: set_key,
      dimension: "quiet_venue",
      value: "true",
      confidence: 0.9,
      active: true,
      source: "explicit_reflection",
      expires_at: DateTime.add(now, 86_400 * 30, :second),
      idempotency_key: "seed-learn-quiet"
    })
    |> OpalCore.Repo.insert!()

    {opts, pref} =
      Outcome.rank_with_learning(
        Fixtures.venues(),
        Fixtures.participants(),
        Fixtures.time_window()
      )

    assert pref["id"] == "venue_1"
    refute Enum.any?(opts, &(&1["id"] == "venue_2"))
    refute Enum.any?(opts, &(&1["id"] == "venue_3"))
  end

  test "outsider denied completion" do
    opp = surface!()

    assert {:error, :not_a_member} =
             Outcome.complete(%{
               conversation_id: conv(),
               user_id: d(),
               opportunity_id: opp["opportunity_id"],
               idempotency_key: "out-1",
               evidence_class: "explicit_confirmation"
             })
  end

  test "ordinary quiet path still silence from phase2" do
    assert {:ok, payload, :silence} =
             Durable.evaluate_and_persist(%{
               conversation_id: conv(),
               requester_user_id: a(),
               member_ids: Fixtures.member_ids(),
               messages: Fixtures.quiet_ordinary_messages(),
               participants: Fixtures.participants(),
               venues: Fixtures.venues(),
               time_window: Fixtures.time_window(),
               idempotency_key: "p3-quiet"
             })

    assert payload["quiet"] == true
  end
end

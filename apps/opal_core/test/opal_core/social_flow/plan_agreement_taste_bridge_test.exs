defmodule OpalCore.SocialFlow.PlanAgreementTasteBridgeTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    MemoryCandidate,
    PlanAgreementTasteBridge,
    PlanParticipant,
    RecommendationIntelligence,
    SharedPlan
  }

  setup do
    a = user("p5a-a")
    b = user("p5a-b")
    conv = dyad(a, b)
    {:ok, a: a, b: b, conv: conv}
  end

  test "agreed plan with taste attrs submits candidates per participant × dimension", %{
    a: a,
    b: b,
    conv: conv
  } do
    plan =
      agreed_plan!(conv, a, [a, b], %{
        location: "Juniper & Ivy",
        time_label: "Saturday · 7:30 PM",
        alignment: %{"vibe" => "quiet", "cuisine" => "italian"}
      })

    tastes = PlanAgreementTasteBridge.extract_taste_attrs(plan)
    assert tastes["cuisine"] == "italian"
    assert tastes["vibe"] == "quiet"
    assert tastes["area"] == "little italy"
    assert tastes["price"] in ["$$$", "$$"]
    assert tastes["time_of_day"] == "evening"

    summary = PlanAgreementTasteBridge.after_agreed(plan)
    assert summary.skipped == nil
    assert summary.submitted >= 2 * map_size(tastes)

    for owner <- [a.id, b.id] do
      cands =
        from(c in MemoryCandidate,
          where: c.owner_user_id == ^owner,
          where: like(c.idempotency_key, ^"plan-agreed:#{plan.id}:#{owner}:%")
        )
        |> Repo.all()

      assert length(cands) == map_size(tastes)

      for c <- cands do
        assert c.memory_class == "preference"
        assert c.evidence_kind == "accepted_plan_pattern"
        assert c.source_type == "plan_agreed"
        assert c.candidate_summary =~ "taste:"
        assert c.provenance["inferred"] == true
        assert c.context_dims["plan_id"] == plan.id
        assert c.context_dims["source"] == "plan_agreed"
        assert is_binary(c.context_dims["taste_dimension"])
      end
    end
  end

  test "agreed plan without taste attrs submits zero candidates", %{a: a, b: b, conv: conv} do
    plan =
      agreed_plan!(conv, a, [a, b], %{
        location: nil,
        time_label: "sometime soon",
        alignment: %{}
      })

    assert PlanAgreementTasteBridge.extract_taste_attrs(plan) == %{}

    summary = PlanAgreementTasteBridge.after_agreed(plan)
    assert summary.submitted == 0
    assert summary.skipped == :no_taste_attrs

    assert candidate_count_for_plan(plan.id) == 0
  end

  test "agreed → changed → agreed is idempotent (no duplicate candidates)", %{
    a: a,
    b: b,
    conv: conv
  } do
    plan =
      agreed_plan!(conv, a, [a, b], %{
        location: "Campfire",
        time_label: "Friday · 6:00 PM",
        alignment: %{"vibe" => "lively"}
      })

    first = PlanAgreementTasteBridge.after_agreed(plan)
    assert first.submitted > 0
    count_after_first = candidate_count_for_plan(plan.id)
    assert count_after_first > 0

    plan =
      plan
      |> SharedPlan.changeset(%{status: "changed"})
      |> Repo.update!()

    # Re-agree (simulate second transition into agreed)
    plan =
      plan
      |> SharedPlan.changeset(%{status: "agreed"})
      |> Repo.update!()

    second = PlanAgreementTasteBridge.after_agreed(plan)
    assert second.submitted == 0
    assert Enum.all?(second.results, &(&1.status == :skipped and &1.reason == :idempotent))

    assert candidate_count_for_plan(plan.id) == count_after_first
  end

  test "cancelled plan submits nothing", %{a: a, b: b, conv: conv} do
    plan =
      agreed_plan!(conv, a, [a, b], %{
        location: "Juniper & Ivy",
        time_label: "Saturday · 7:30 PM",
        alignment: %{"vibe" => "quiet"}
      })

    plan =
      plan
      |> SharedPlan.changeset(%{
        status: "cancelled",
        cancelled_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.update!()

    summary = PlanAgreementTasteBridge.after_agreed(plan)
    assert summary.submitted == 0
    assert summary.skipped == :cancelled
    assert candidate_count_for_plan(plan.id) == 0
  end

  test "tentative plan submits nothing", %{a: a, b: b, conv: conv} do
    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Maybe dinner",
        status: "tentative",
        timezone: "UTC",
        location: "Juniper & Ivy",
        time_label: "Saturday · 7:30 PM",
        created_by_user_id: a.id,
        alignment: %{"vibe" => "quiet"}
      })
      |> Repo.insert!()

    add_participants!(plan, [a, b])

    summary = PlanAgreementTasteBridge.after_agreed(plan)
    assert summary.submitted == 0
    assert summary.skipped == :not_agreed
    assert candidate_count_for_plan(plan.id) == 0
  end

  test "record_acceptance still never writes durable memory (law regression)" do
    receipt =
      RecommendationIntelligence.record_acceptance(
        %{"id" => "rec-1", "name" => "Juniper & Ivy"},
        %{"user_id" => "walk-a"}
      )

    assert receipt["durable_memory_written"] == false
    assert receipt["self_reinforcing_bias"] == false
    refute RecommendationIntelligence.recommendation_self_confirmation_to_durable_memory?()
  end

  test "never invents vibe from catalog quiet flag", %{a: a, conv: conv} do
    # Juniper & Ivy is quiet:true in catalog — must not become vibe without alignment
    plan =
      agreed_plan!(conv, a, [a], %{
        location: "Juniper & Ivy",
        time_label: "Saturday · 7:30 PM",
        alignment: %{}
      })

    tastes = PlanAgreementTasteBridge.extract_taste_attrs(plan)
    refute Map.has_key?(tastes, "vibe")
    assert tastes["cuisine"] == "italian"
  end

  test "extract from alignment alone when place unknown", %{a: a, conv: conv} do
    plan =
      agreed_plan!(conv, a, [a], %{
        location: "Some Unknown Spot",
        time_label: "brunch",
        alignment: %{
          "cuisine" => "Thai",
          "vibe" => "Casual",
          "price" => "$$",
          "area" => "North Park",
          "time_of_day" => "morning"
        }
      })

    tastes = PlanAgreementTasteBridge.extract_taste_attrs(plan)
    assert tastes["cuisine"] == "thai"
    assert tastes["vibe"] == "casual"
    assert tastes["price"] == "$$"
    assert tastes["area"] == "north park"
    assert tastes["time_of_day"] == "morning"
  end

  # --- helpers ---

  defp agreed_plan!(conv, creator, people, attrs) do
    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: attrs[:title] || "Dinner",
        status: "agreed",
        timezone: "America/Los_Angeles",
        location: attrs[:location],
        time_label: attrs[:time_label],
        created_by_user_id: creator.id,
        alignment: attrs[:alignment] || %{}
      })
      |> Repo.insert!()

    add_participants!(plan, people)
    Repo.preload(plan, :participants)
  end

  defp add_participants!(plan, people) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for {person, idx} <- Enum.with_index(people) do
      %PlanParticipant{}
      |> PlanParticipant.changeset(%{
        plan_id: plan.id,
        user_id: person.id,
        role: if(idx == 0, do: "lead", else: "participant"),
        response_state: "accepted",
        responded_at: now,
        authority_source: "user_action"
      })
      |> Repo.insert!()
    end
  end

  defp candidate_count_for_plan(plan_id) do
    from(c in MemoryCandidate,
      where: like(c.idempotency_key, ^"plan-agreed:#{plan_id}:%")
    )
    |> Repo.aggregate(:count)
  end

  defp user(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp dyad(a, b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "p5a-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for person <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: person.id})
      |> Repo.insert!()
    end

    conv
  end
end

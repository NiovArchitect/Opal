defmodule OpalCore.SocialFlow.MemoryIntelligenceTest do
  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls.CallOutcome
  alias OpalCore.Calls.Outcomes
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    MemoryCandidate,
    MemoryIntelligence
  }

  setup do
    a = user("mem-a")
    b = user("mem-b")
    conv = dyad(a, b)
    {:ok, a: a, b: b, conv: conv}
  end

  test "EXPLICIT_PREFERENCE creates high-confidence candidate with provenance", %{a: a, b: b, conv: conv} do
    assert {:ok, %{candidate: cand, action: :created}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => b.id,
               "subject_user_id" => b.id,
               "counterpart_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I prefer quieter restaurants.",
               "source_type" => "chat",
               "source_message_ids" => [Ecto.UUID.generate()],
               "idempotency_suffix" => "pref-1"
             })

    assert cand.memory_class == "preference"
    assert cand.candidate_summary =~ "quiet"
    assert cand.subject_user_id == b.id
    assert cand.evidence_kind == "explicit_statement"
    assert cand.confidence >= 0.8
    assert cand.provenance["explicit"] == true
    assert is_map(cand.confidence_components)
    assert cand.confidence_components["explicitness"] > 0
    assert cand.status in ~w(visible approved)
    refute Outcomes.outcome_auto_promotes_to_memory?()
  end

  test "ONE_OFF_SELECTION_AUTO_MEMORY is zero", %{a: a, conv: conv} do
    assert {:reject, :one_off_selection} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "Let's do Italian tonight.",
               "one_off_selection" => true,
               "source_type" => "chat"
             })

    assert {:reject, :one_off_selection} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "Italian restaurant",
               "memory_class" => "preference",
               "evidence_kind" => "accepted_plan_pattern",
               "observation_count" => 1,
               "source_type" => "chat"
             })

    assert Repo.aggregate(MemoryCandidate, :count) == 0
  end

  test "REPEATED_PATTERN strengthens outdoor seating candidate", %{a: a, conv: conv} do
    assert {:ok, %{candidate: c1}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "outdoor seating",
               "evidence_kind" => "repeated_behavior",
               "observation_count" => 2,
               "source_type" => "chat",
               "idempotency_suffix" => "out-1",
               "auto_promote" => false
             })

    assert c1.candidate_summary == "outdoor seating"
    assert c1.observation_count >= 2

    assert {:ok, %{candidate: c2, action: :strengthened}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "outdoor seating again",
               "evidence_kind" => "repeated_behavior",
               "observation_count" => 1,
               "source_type" => "chat",
               "idempotency_suffix" => "out-2",
               "auto_promote" => false
             })

    assert c2.id == c1.id
    assert c2.observation_count > c1.observation_count
    assert c2.candidate_summary =~ "outdoor"
  end

  test "BOUNDARY candidate keeps scoped work-night context", %{a: a, conv: conv} do
    assert {:ok, %{candidate: cand}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I can't stay out late on work nights.",
               "source_type" => "voice",
               "idempotency_suffix" => "bound-1"
             })

    assert cand.memory_class == "boundary"
    assert cand.candidate_summary =~ "work nights"
    assert cand.context_dims["context"] == "work_nights"
    refute cand.candidate_summary =~ "never goes out late"
  end

  test "CONTRADICTION does not create false certainty", %{a: a, conv: conv} do
    assert {:ok, _} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I prefer quiet restaurants.",
               "source_type" => "chat",
               "idempotency_suffix" => "quiet-1",
               "auto_promote" => false
             })

    assert {:ok, %{candidate: loud, action: :contradiction, false_certainty: false}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I actually love loud places when I'm out with friends.",
               "source_type" => "chat",
               "idempotency_suffix" => "loud-1",
               "auto_promote" => false
             })

    assert loud.status == "conflicted"
    assert is_binary(loud.contradiction_group_id)
    assert "contradiction_unresolved" in loud.uncertainty or "scoped_by_context" in loud.uncertainty or
             "needs_clarification" in loud.uncertainty

    conflicted =
      Repo.all(from c in MemoryCandidate, where: c.owner_user_id == ^a.id and c.status == "conflicted")

    assert length(conflicted) >= 1
  end

  test "SUPERSESSION keeps history and clears stale current truth", %{a: a, conv: conv} do
    assert {:ok, %{candidate: old}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I don't drink alcohol.",
               "source_type" => "chat",
               "idempotency_suffix" => "alc-1"
             })

    assert {:ok, %{candidate: neu, action: action}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I drink wine occasionally now.",
               "source_type" => "chat",
               "idempotency_suffix" => "alc-2"
             })

    assert action in [:contradiction, :superseded, :created, :strengthened]
    old2 = Repo.get!(MemoryCandidate, old.id)

    # Stale unconditional "doesn't drink" must not remain the sole current truth.
    {:ok, current_old_key} = MemoryIntelligence.current_for(a.id, old.value_key)

    if old2.status == "superseded" do
      assert current_old_key == nil
      assert neu.candidate_summary =~ "wine"
    else
      # Contradiction path — both conflicted; neither presented as unconditional certainty
      assert old2.status in ~w(conflicted superseded)
      assert neu.status in ~w(conflicted visible approved)
    end
  end

  test "TEMPORARY_LOCATION_TO_DURABLE_MEMORY is zero", %{a: a, conv: conv} do
    assert {:reject, :temporary_location} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I'm in San Diego today.",
               "source_type" => "chat"
             })
  end

  test "PLAN_STATE_DUPLICATED_IN_LONG_TERM_MEMORY is zero", %{a: a, conv: conv} do
    assert {:reject, :plan_state} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "Fort Oak Tuesday 8 PM",
               "plan_state" => true,
               "source_type" => "chat"
             })

    assert {:reject, :operational_not_memory} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "outcome_type" => "plan_time_changed",
               "text" => "8:00 PM"
             })
  end

  test "COMMITMENT_AUTO_MEMORY is zero", %{a: a, conv: conv} do
    assert {:reject, :commitment_not_memory} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I'll bring the tickets.",
               "source_type" => "call_transcript"
             })
  end

  test "RELATIONSHIP_FACT is directional", %{a: a, b: b, conv: conv} do
    assert {:ok, %{candidate: from_a}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "subject_user_id" => b.id,
               "counterpart_user_id" => b.id,
               "conversation_id" => conv.id,
               "text" => "This is my daughter.",
               "source_type" => "chat",
               "idempotency_suffix" => "rel-a"
             })

    assert {:ok, %{candidate: from_b}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => b.id,
               "subject_user_id" => a.id,
               "counterpart_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "This is my dad.",
               "source_type" => "chat",
               "idempotency_suffix" => "rel-b"
             })

    assert from_a.memory_class == "relationship_fact"
    assert from_a.owner_user_id == a.id
    assert from_a.candidate_summary =~ "daughter"
    assert from_b.owner_user_id == b.id
    assert from_b.candidate_summary =~ "dad"
    assert from_a.value_key != from_b.value_key
  end

  test "PRIVATE_MEMORY_CROSS_USER_LEAK is zero", %{a: a, b: b, conv: conv} do
    assert {:ok, _} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I prefer quieter restaurants.",
               "source_type" => "chat",
               "idempotency_suffix" => "priv-1",
               "auto_promote" => false
             })

    a_view = MemoryIntelligence.candidates_for_context(a.id)
    b_view = MemoryIntelligence.candidates_for_context(b.id)
    assert Enum.any?(a_view, &(&1["candidate_summary"] =~ "quiet"))
    refute Enum.any?(b_view, &(&1["owner_user_id"] == a.id))
  end

  test "GROUP_CHOICE_TO_INDIVIDUAL_PREFERENCE is zero", %{a: a, conv: conv} do
    assert {:reject, :group_choice_to_individual} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "sushi",
               "group_choice" => true,
               "attribute_to_individual" => true,
               "memory_class" => "preference",
               "value" => "sushi",
               "evidence_kind" => "accepted_plan_pattern"
             })
  end

  test "VOICE_MEMORY_RULES_DIFFER_FROM_CHAT is zero — same semantics", %{a: a, conv: conv} do
    assert {:ok, %{candidate: chat}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I prefer quieter restaurants.",
               "source_type" => "chat",
               "idempotency_suffix" => "vchat",
               "auto_promote" => false
             })

    b = user("mem-voice")

    assert {:ok, %{candidate: voice}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => b.id,
               "conversation_id" => conv.id,
               "text" => "I prefer quieter restaurants.",
               "source_type" => "call_transcript",
               "idempotency_suffix" => "vvoice",
               "auto_promote" => false
             })

    assert chat.memory_class == voice.memory_class
    assert chat.evidence_kind == voice.evidence_kind
    assert chat.candidate_summary == voice.candidate_summary
    assert chat.source_type == "chat"
    assert voice.source_type == "call_transcript"
  end

  test "OUTCOME_AUTO_PROMOTES_TO_MEMORY is zero", %{conv: conv} do
    outcome =
      %CallOutcome{}
      |> CallOutcome.changeset(%{
        conversation_id: conv.id,
        source_type: "execution",
        outcome_type: "plan_time_changed",
        entity_type: "shared_plan",
        after_value: "8:00 PM",
        provenance: %{}
      })
      |> Repo.insert!()

    assert {:reject, _} = Outcomes.memory_candidate_eligibility(outcome)
    assert {:reject, _} = MemoryIntelligence.from_outcome(outcome)
    assert Outcomes.outcome_auto_promotes_to_memory?() == false
    assert Outcomes.write_long_term_memory?(outcome) == false
  end

  test "user correction supersedes and forgets promoted preference", %{a: a, conv: conv} do
    assert {:ok, %{candidate: cand}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I prefer outdoor seating.",
               "source_type" => "chat",
               "idempotency_suffix" => "corr-1"
             })

    assert {:ok, %{candidate: corrected, action: action}} =
             MemoryIntelligence.apply_correction(a.id, %{
               "conversation_id" => conv.id,
               "text" => "No, I don't prefer outdoor seating.",
               "value" => "outdoor seating",
               "polarity" => "reject",
               "memory_class" => "preference",
               "idempotency_suffix" => "corr-2"
             })

    old = Repo.get!(MemoryCandidate, cand.id)
    assert old.status == "superseded"
    assert action in [:created, :superseded, :idempotent]
    assert corrected.evidence_kind == "user_correction"

    {:ok, current} = MemoryIntelligence.current_for(a.id, cand.value_key)

    if current do
      assert current["evidence_kind"] == "user_correction"
    end
  end

  test "explain returns provenance components", %{a: a, conv: conv} do
    assert {:ok, %{candidate: cand}} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "I prefer quieter restaurants.",
               "source_type" => "chat",
               "idempotency_suffix" => "why-1",
               "auto_promote" => false
             })

    assert {:ok, expl} = MemoryIntelligence.explain(cand.id)
    assert expl["why"] =~ "Explicit"
    assert is_map(expl["components"])
  end

  test "sensitive inference is blocked; explicit sensitive stays guarded", %{a: a, conv: conv} do
    assert {:reject, :sensitive_inference_blocked} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "text" => "probably has diabetes",
               "evidence_kind" => "inference",
               "memory_class" => "stable_constraint",
               "value" => "diabetes",
               "source_type" => "chat"
             })
  end

  test "broad structured classes admit with catch systems intact", %{a: a, conv: conv} do
    for {class, value} <- [
           {"interest", "live jazz"},
           {"communication_preference", "prefers text over call"},
           {"decision_preference", "likes two clear options"},
           {"shared_pattern", "Sunday morning walks"},
           {"important_place", "Balboa Park"},
           {"recurring_routine", "coffee before church"},
           {"stable_constraint", "vegetarian"}
         ] do
      assert {:ok, %{candidate: cand}} =
               MemoryIntelligence.consider(%{
                 "owner_user_id" => a.id,
                 "conversation_id" => conv.id,
                 "memory_class" => class,
                 "value" => value,
                 "evidence_kind" => "explicit_statement",
                 "source_type" => "chat",
                 "idempotency_suffix" => "broad-#{class}",
                 "auto_promote" => false
               })

      assert cand.memory_class == class
      assert cand.candidate_summary == value
      assert cand.evidence_kind == "explicit_statement"
      assert is_map(cand.provenance)
    end

    # Catch still blocks weak inference for the same surface.
    assert {:reject, :one_off_selection} =
             MemoryIntelligence.consider(%{
               "owner_user_id" => a.id,
               "conversation_id" => conv.id,
               "memory_class" => "interest",
               "value" => "karaoke once",
               "evidence_kind" => "inference",
               "observation_count" => 1,
               "source_type" => "chat"
             })
  end

  # --- fixtures ---

  defp user(prefix) do
    %User{}
    |> User.changeset(%{handle: "#{prefix}-#{System.unique_integer([:positive])}", display_name: prefix})
    |> Repo.insert!()
  end

  defp dyad(a, b) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "mem-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for person <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: person.id})
      |> Repo.insert!()
    end

    conv
  end
end

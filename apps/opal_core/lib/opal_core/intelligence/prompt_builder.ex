defmodule OpalCore.Intelligence.PromptBuilder do
  @moduledoc """
  Assembles LLM prompts with structurally scoped social memory.

  Every memory record injected must belong to `scoped.account_id` — mismatch raises.
  Shared plan facts (time/place/status) may appear; private user_commitments of other
  accounts never appear.

  Paste A2 adds a "How to be" section from `relationship_behavior_profiles` merged with
  `person_memories.behavior_override`. System guidance: adapt warmth/directness/initiative
  per relationship; conversation history takes precedence over the profile.
  """

  require Logger

  alias OpalCore.Intelligence.{
    ColdStart,
    EnvironmentContext,
    GroupDecision,
    MemoryHygiene,
    OutcomeLearning,
    Provenance
  }
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{GroupDecisionState, RelationshipBehaviorProfile, Scoped}

  @simple_messages ~w(ok okay kk yes yep yeah no nope lol haha hi hey hello thanks thank\ you 👍 😂 ❤️ 🔥)

  def simple_messages, do: @simple_messages

  def simple_message?(text) when is_binary(text) do
    t = text |> String.trim() |> String.downcase()
    t in @simple_messages or Regex.match?(~r/^(ok+|kk|yes|no|lol+|haha+|👍|😂|❤️|🔥)\.?$/iu, t)
  end

  def simple_message?(_), do: false

  @doc """
  Build prompt parts for an account + conversation.

  Returns:
  %{
    system_extra: binary,
    what_you_know: binary | nil,
    recall: map,
    tier: :simple | :standard | :expanded,
    memory_record_ids: map,
    shared_plans: [map]
  }
  """
  def build(scoped, conversation_id, current_message, history_window \\ [])

  def build(%Scoped{} = scoped, conversation_id, current_message, history_window)
      when is_binary(conversation_id) do
    tier = tier_for(current_message, %{})

    if tier == :simple or not SocialMemory.enabled?() do
      %{
        system_extra: "",
        what_you_know: nil,
        recall: empty_recall(scoped.account_id, conversation_id),
        tier: if(SocialMemory.enabled?(), do: :simple, else: :simple),
        memory_record_ids: %{},
        shared_plans: [],
        audit: %{account_id: scoped.account_id, conversation_id: conversation_id, injected: []}
      }
    else
      recall = SocialMemory.recall_for_conversation(scoped, conversation_id)
      assert_scope!(scoped.account_id, recall)

      recall =
        if tier == :expanded do
          expand_recall(scoped, recall)
        else
          recall
        end

      # Shared facts only — strip private user_commitments before prompt injection
      shared =
        (recall.active_plans || [])
        |> Enum.map(fn p ->
          %{
            plan_id: p[:plan_id] || p["plan_id"],
            plan_label: p[:plan_label] || p["plan_label"],
            time_label: p[:time_label] || p["time_label"],
            place_label: p[:place_label] || p["place_label"],
            status: p[:status] || p["status"]
          }
        end)

      what = format_what_you_know(recall, shared)
      ids = recall[:memory_record_ids] || %{}

      Logger.info(
        "prompt_builder.audit account=#{scoped.account_id} conversation=#{conversation_id} " <>
          "tier=#{tier} records=#{inspect(ids)}"
      )

      %{
        system_extra: what,
        what_you_know: what,
        recall: recall,
        tier: tier,
        memory_record_ids: ids,
        shared_plans: shared,
        history_window: history_window,
        audit: %{
          account_id: scoped.account_id,
          conversation_id: conversation_id,
          injected: ids,
          at: DateTime.utc_now() |> DateTime.to_iso8601()
        }
      }
    end
  end

  def build(_, _, _, _), do: raise(ArgumentError, "scoped account required")

  def tier_for(text, extraction) when is_map(extraction) do
    cond do
      simple_message?(text) -> :simple
      extraction[:potential_conflict] == true or extraction["potential_conflict"] == true -> :expanded
      true -> :standard
    end
  end

  def tier_for(text, _), do: if(simple_message?(text), do: :simple, else: :standard)

  @doc "Paste E2 — maturity instruction fragment (curious vs established)."
  def maturity_instruction(account_id) when is_binary(account_id) do
    ColdStart.maturity_prompt_instruction(account_id)
  rescue
    _ -> nil
  end

  def maturity_instruction(_), do: nil

  @doc "Raise if any injected memory row account_id mismatches."
  def assert_scope!(account_id, recall) when is_binary(account_id) and is_map(recall) do
    people = recall[:people] || recall["people"] || []
    plans = recall[:active_plans] || recall["active_plans"] || []

    Enum.each(people, fn p ->
      aid = p[:account_id] || p["account_id"]

      if is_binary(aid) and aid != account_id do
        Logger.error("prompt_builder.scope_violation type=person_memory id=#{inspect(p[:id])}")
        raise "social_memory scope violation: person_memory account mismatch"
      end
    end)

    Enum.each(plans, fn p ->
      aid = p[:account_id] || p["account_id"]

      if is_binary(aid) and aid != account_id do
        Logger.error("prompt_builder.scope_violation type=plan_memory id=#{inspect(p[:id])}")
        raise "social_memory scope violation: plan_memory account mismatch"
      end
    end)

    :ok
  end

  defp expand_recall(scoped, recall) do
    conflicts = SocialMemory.detect_conflicts(scoped)
    all_plans = recall.active_plans || []

    Map.merge(recall, %{
      conflicts: conflicts,
      active_plans: all_plans,
      open_loops_expanded:
        Enum.flat_map(recall.people || [], fn p -> p[:open_loops] || p["open_loops"] || [] end)
    })
  end

  @how_to_be_system """
  Adapt your warmth, directness, and initiative to each relationship. Never use the same
  voice for a partner and a business contact. The relationship profile is guidance, not a
  script — the actual conversation history takes precedence.
  """

  defp format_what_you_know(recall, shared_plans) do
    people_rows = recall.people || []

    people =
      Enum.map(people_rows, fn p ->
        facts = p[:known_facts] || p["known_facts"] || %{}
        loops = p[:open_loops] || p["open_loops"] || []

        fact_bits =
          facts
          |> Enum.map(fn {k, v} -> Provenance.format_fact(k, v) end)
          |> Enum.join("; ")

        "- person=#{p[:person_id] || p["person_id"]} rel=#{p[:relationship_type]} cadence=#{p[:cadence_status]} facts=#{fact_bits} loops=#{length(loops)}"
      end)

    how_to_be =
      people_rows
      |> Enum.map(&format_how_to_be/1)
      |> Enum.reject(&is_nil/1)

    commits =
      Enum.map(recall.my_open_commitments || [], fn c ->
        "- #{c[:description] || c["description"]} (#{c[:status]})"
      end)

    plans =
      Enum.map(shared_plans, fn p ->
        "- #{p[:plan_label] || p.plan_label} @ #{p[:time_label] || p.time_label} #{p[:place_label] || p.place_label}"
      end)

    patterns =
      Enum.map(recall.relevant_patterns || [], fn p ->
        "- #{p[:description] || p["description"]} (#{p[:confidence]})"
      end)

    routine_notes = recall[:routine_overlap_notes] || recall["routine_overlap_notes"] || []

    summary = recall.conversation_summary

    account_id = recall[:account_id] || recall["account_id"]
    conversation_id = recall[:conversation_id] || recall["conversation_id"]

    group_section = format_group_decision(account_id, conversation_id)
    learned = format_learned_preferences(account_id)

    env =
      if is_binary(account_id) and account_id != "" do
        EnvironmentContext.format_section(EnvironmentContext.get_environment_context(account_id))
      else
        nil
      end

    maturity =
      if is_binary(account_id) and account_id != "" do
        case maturity_instruction(account_id) do
          s when is_binary(s) and s != "" -> "Maturity: #{s}"
          _ -> nil
        end
      else
        nil
      end

    revalidate =
      if is_binary(account_id) and account_id != "" do
        MemoryHygiene.revalidation_prompt_instruction(account_id)
      else
        nil
      end

    sections =
      [
        if(summary, do: "Summary: #{summary}"),
        if(people != [], do: "People:\n" <> Enum.join(people, "\n")),
        if(how_to_be != [], do: "How to be:\n" <> Enum.join(how_to_be, "\n")),
        if(commits != [], do: "My open commitments:\n" <> Enum.join(commits, "\n")),
        if(plans != [], do: "Active plans (shared facts):\n" <> Enum.join(plans, "\n")),
        if(patterns != [], do: "Patterns:\n" <> Enum.join(patterns, "\n")),
        if(routine_notes != [], do: "Routine protection:\n" <> Enum.join(routine_notes, "\n")),
        group_section,
        learned,
        env,
        maturity,
        revalidate,
        Provenance.system_instruction(),
        @how_to_be_system
      ]
      |> Enum.reject(&is_nil/1)

    if sections == [] do
      nil
    else
      "What you know (account-scoped; never reveal other accounts' private context):\n" <>
        Enum.join(sections, "\n")
    end
  end

  defp format_how_to_be(p) do
    rel = p[:relationship_type] || p["relationship_type"]
    person = p[:person_id] || p["person_id"] || "them"
    override = p[:behavior_override] || p["behavior_override"] || %{}

    profile =
      if is_binary(rel) do
        Repo.get(RelationshipBehaviorProfile, rel)
      else
        nil
      end

    if is_nil(profile) and override == %{} do
      nil
    else
      tone = override["tone_adjustment"] || override[:tone_adjustment] || (profile && profile.tone) || "warm_casual"
      proactivity = override["proactivity"] || override[:proactivity] || (profile && profile.proactivity) || "medium"
      notes = (profile && profile.boundary_notes) || ""
      learned = override["note"] || override[:note]
      gloss = proactivity_gloss(proactivity)

      base =
        "You're talking about #{person}, who is #{rel || "a contact"}. Be #{tone}. Proactivity: #{proactivity} — #{gloss}."

      base =
        if is_binary(notes) and notes != "", do: base <> " #{notes}", else: base

      if is_binary(learned) and learned != "" do
        base <> " Learned: #{learned}."
      else
        base
      end
    end
  end

  defp proactivity_gloss("high"), do: "volunteer plans unprompted when helpful"
  defp proactivity_gloss("low"), do: "wait to be asked before suggesting plans"
  defp proactivity_gloss(_), do: "suggest plans when the moment is natural"

  defp format_group_decision(account_id, conversation_id)
       when is_binary(account_id) and is_binary(conversation_id) do
    case Repo.get_by(GroupDecisionState,
           account_id: account_id,
           conversation_id: conversation_id
         ) do
      %GroupDecisionState{} = s ->
        "Group decision:\n" <> GroupDecision.summarize(s)

      _ ->
        nil
    end
  rescue
    _ -> nil
  end

  defp format_group_decision(_, _), do: nil

  defp format_learned_preferences(account_id) when is_binary(account_id) do
    prefs = OutcomeLearning.learned_preferences(account_id)

    if prefs == [] do
      nil
    else
      "Learned preferences:\n" <> Enum.map_join(prefs, "\n", &("- " <> &1))
    end
  rescue
    _ -> nil
  end

  defp format_learned_preferences(_), do: nil

  defp empty_recall(account_id, conversation_id) do
    %{
      account_id: account_id,
      conversation_id: conversation_id,
      conversation_summary: nil,
      people: [],
      my_open_commitments: [],
      active_plans: [],
      relevant_patterns: [],
      memory_record_ids: %{}
    }
  end
end

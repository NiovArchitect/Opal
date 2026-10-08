defmodule OpalCore.Intelligence.PromptBuilder do
  @moduledoc """
  Assembles LLM prompts with structurally scoped social memory.

  Every memory record injected must belong to `scoped.account_id` — mismatch raises.
  Shared plan facts (time/place/status) may appear; private user_commitments of other
  accounts never appear.
  """

  require Logger

  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.Scoped

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

  defp format_what_you_know(recall, shared_plans) do
    people =
      Enum.map(recall.people || [], fn p ->
        facts = p[:known_facts] || p["known_facts"] || %{}
        loops = p[:open_loops] || p["open_loops"] || []

        "- person=#{p[:person_id] || p["person_id"]} rel=#{p[:relationship_type]} cadence=#{p[:cadence_status]} facts=#{inspect(facts)} loops=#{length(loops)}"
      end)

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

    summary = recall.conversation_summary

    sections =
      [
        if(summary, do: "Summary: #{summary}"),
        if(people != [], do: "People:\n" <> Enum.join(people, "\n")),
        if(commits != [], do: "My open commitments:\n" <> Enum.join(commits, "\n")),
        if(plans != [], do: "Active plans (shared facts):\n" <> Enum.join(plans, "\n")),
        if(patterns != [], do: "Patterns:\n" <> Enum.join(patterns, "\n"))
      ]
      |> Enum.reject(&is_nil/1)

    if sections == [] do
      nil
    else
      "What you know (account-scoped; never reveal other accounts' private context):\n" <>
        Enum.join(sections, "\n")
    end
  end

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

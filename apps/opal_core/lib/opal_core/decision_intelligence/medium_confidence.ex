defmodule OpalCore.DecisionIntelligence.MediumConfidence do
  @moduledoc """
  P4.3 — classify gaps; ask at most one HUMAN_ONLY question with decision value.

  Machine-resolvable gaps are resolved first (no user interrupt).
  Model uncertainty alone never invents a user question.
  """

  @policy_version "p4.3.question.v1"

  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.DecisionIntelligence.HighConfidence
  alias OpalCore.SocialFlow.Physical.CandidateSource
  alias OpalCore.SocialFlow.Physical.HardCandidateFilter

  @doc """
  Returns:
  - `{:high, assessment}` if High already earned (caller should use High path)
  - `{:medium, question_assessment}` one human question
  - `{:not_medium, assessment}` no useful human question (and not High)
  """
  def evaluate(%DecisionContext{} = ctx, opts \\ []) do
    case HighConfidence.evaluate(ctx, opts) do
      {:high, assessment} ->
        {:high, assessment}

      {:not_high, high_assessment} ->
        {ctx2, machine_notes} = resolve_machine_gaps(ctx)
        # Re-check High after machine resolution (in-memory only for classification;
        # durable machine writes happen in DecisionIntelligence when applicable)
        case HighConfidence.evaluate(ctx2, opts) do
          {:high, assessment} ->
            {:high, Map.put(assessment, "machine_resolved", machine_notes)}

          {:not_high, _} ->
            gaps = classify_gaps(ctx2)
            human = Enum.filter(gaps, &(&1["class"] == "HUMAN_ONLY"))

            case select_question(ctx2, human) do
              nil ->
                {:not_medium,
                 %{
                   "decision_id" => ctx.id,
                   "based_on_context_revision" => ctx.revision,
                   "reason_codes" => high_assessment["reason_codes"] || ["no_human_question"],
                   "gaps" => gaps,
                   "machine_resolved" => machine_notes,
                   "policy_version" => @policy_version
                 }}

              question ->
                {:medium,
                 %{
                   "decision_id" => ctx.id,
                   "based_on_context_revision" => ctx.revision,
                   "question" => question,
                   "gaps" => gaps,
                   "machine_resolved" => machine_notes,
                   "policy_version" => @policy_version,
                   "candidate_source" => "fixture_catalog"
                 }}
            end
        end
    end
  end

  defp resolve_machine_gaps(%DecisionContext{} = ctx) do
    notes = []
    # Fixture catalog: open_now is known — nothing to ask the user.
    notes = ["provider_hours_from_catalog_fixture" | notes]
    {ctx, Enum.reverse(notes)}
  end

  defp classify_gaps(%DecisionContext{} = ctx) do
    {:ok, raw} = CandidateSource.fetch(source: :catalog)
    filtered = HardCandidateFilter.filter(raw, %{"party_size" => max(length(ctx.participant_ids || []), 1)})
    kept = filtered["candidates"] || []

    budget = ctx.budget_context || %{}
    time = ctx.time_context || %{}
    pref = ctx.preference_context || %{}
    vibe = pref["vibe"] || pref[:vibe]

    quiet_split = Enum.split_with(kept, &(&1["quiet"] == true))
    {quiet, lively} = quiet_split
    price_bands =
      kept
      |> Enum.map(& &1["price_level"])
      |> Enum.uniq()
      |> length()

    [
      %{
        "dimension" => "PROVIDER_HOURS",
        "class" => "MACHINE_RESOLVABLE",
        "material" => false,
        "note" => "catalog open_now available"
      },
      %{
        "dimension" => "TIME_PRECISION",
        "class" => "HUMAN_ONLY",
        "material" => map_size(time) == 0 and ctx.intent in ~w(date_ideas weekend_getaway nearby_now),
        "utility" => 0.8
      },
      %{
        "dimension" => "VIBE",
        "class" => "HUMAN_ONLY",
        "material" => is_nil(vibe) and length(quiet) > 0 and length(lively) > 0,
        "utility" => if(length(quiet) > 0 and length(lively) > 0, do: 0.9, else: 0.2)
      },
      %{
        "dimension" => "BUDGET",
        "class" => "HUMAN_ONLY",
        "material" => map_size(budget) == 0 and price_bands >= 2,
        "utility" => if(price_bands >= 2, do: 0.7, else: 0.1)
      },
      %{
        "dimension" => "MODEL_UNCERTAINTY",
        "class" => "NOT_CLARIFIABLE",
        "material" => false,
        "note" => "never ask user to compensate for model weakness"
      }
    ]
  end

  defp select_question(%DecisionContext{} = ctx, human_gaps) do
    human_gaps
    |> Enum.filter(&(&1["material"] == true))
    |> Enum.sort_by(&(-(&1["utility"] || 0)))
    |> List.first()
    |> case do
      nil ->
        nil

      gap ->
        build_question(ctx, gap["dimension"])
    end
  end

  defp build_question(ctx, "TIME_PRECISION") do
    %{
      "question_id" => "q_time_" <> String.slice(ctx.id, 0, 8),
      "dimension" => "TIME_PRECISION",
      "prompt" => "Earlier or later?",
      "choices" => [
        %{"id" => "earlier", "label" => "Earlier"},
        %{"id" => "later", "label" => "Later"},
        %{"id" => "flexible", "label" => "Flexible"}
      ],
      "target_user_id" => ctx.initiator_user_id,
      "figma_authority" => "988:2"
    }
  end

  defp build_question(ctx, "VIBE") do
    %{
      "question_id" => "q_vibe_" <> String.slice(ctx.id, 0, 8),
      "dimension" => "VIBE",
      "prompt" => "Quiet or lively?",
      "choices" => [
        %{"id" => "quiet", "label" => "Quiet"},
        %{"id" => "lively", "label" => "Lively"}
      ],
      "target_user_id" => ctx.initiator_user_id,
      "figma_authority" => "988:2"
    }
  end

  defp build_question(ctx, "BUDGET") do
    %{
      "question_id" => "q_budget_" <> String.slice(ctx.id, 0, 8),
      "dimension" => "BUDGET",
      "prompt" => "Keep it light, or fine to spend a bit?",
      "choices" => [
        %{"id" => "light", "label" => "Keep it light"},
        %{"id" => "spend", "label" => "Fine to spend"}
      ],
      "target_user_id" => ctx.initiator_user_id,
      "figma_authority" => "988:2"
    }
  end

  defp build_question(_, _), do: nil

  def map_answer_to_correction("TIME_PRECISION", choice_id) do
    %{"operation" => "set_time", "time_context" => %{"preference" => choice_id}}
  end

  def map_answer_to_correction("VIBE", choice_id) do
    %{"operation" => "set_vibe", "vibe" => choice_id}
  end

  def map_answer_to_correction("BUDGET", "light") do
    %{"operation" => "set_budget", "budget_max" => 40}
  end

  def map_answer_to_correction("BUDGET", "spend") do
    %{"operation" => "set_budget", "budget_max" => 120}
  end

  def map_answer_to_correction(_, _), do: nil

  def policy_version, do: @policy_version
end

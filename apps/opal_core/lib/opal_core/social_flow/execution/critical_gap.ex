defmodule OpalCore.SocialFlow.Execution.CriticalGap do
  @moduledoc """
  What still prevents one good human decision?

  Gap count is not enough — rank by decision impact.
  Critical gaps block readiness; non-critical never block.

  Uses MinimumQuestion / QuestionValue patterns for leverage topics.
  """

  alias OpalCore.SocialFlow.Ambient.QuestionValue

  @critical_types ~w(
    willingness
    required_participant
    time_ambiguity
    hard_constraint
    capacity
    provider_live_availability
    authorization
    safety
    privacy
  )

  @non_critical_types ~w(
    minor_rating
    secondary_amenity
    small_eta_variance
    extra_mediocre_candidate
    decorative_metadata
  )

  def critical_types, do: @critical_types
  def non_critical_types, do: @non_critical_types

  @doc """
  Detect and rank gaps. Returns critical list + primary gap + may_ask minimum question.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)
    gaps = detect(a)
    critical = Enum.filter(gaps, & &1["critical"])
    non_critical = Enum.reject(gaps, & &1["critical"])

    ranked =
      critical
      |> Enum.sort_by(& &1["impact"], :desc)

    primary = List.first(ranked)
    question = maybe_question(primary, a)

    %{
      "gaps" => gaps,
      "critical_gaps" => ranked,
      "non_critical_gaps" => non_critical,
      "critical_count" => length(ranked),
      "primary_gap" => primary && primary["type"],
      "primary_impact" => primary && primary["impact"],
      "blocks_decision_ready" => ranked != [],
      "blocks_execution_ready" => Enum.any?(ranked, &execution_blocking?/1),
      "minimum_question" => question,
      "gap_count_not_enough" => true,
      "authorizes_set" => false,
      "private" => true
    }
  end

  def assess(_),
    do: %{
      "critical_gaps" => [],
      "blocks_decision_ready" => false,
      "authorizes_set" => false
    }

  defp detect(a) do
    [
      gap(
        "willingness",
        a["willingness_ok"] == false or a["required_willingness_maybe"] == true or
          a["willingness_unresolved"] == true,
        0.95,
        true,
        "willingness_required"
      ),
      gap(
        "required_participant",
        a["required_participant_unresolved"] == true,
        0.92,
        true,
        "required_participant"
      ),
      gap(
        "time_ambiguity",
        a["time_known"] == false or a["time_ambiguous"] == true or
          (a["when"] == nil and a["slot_label"] in [nil, ""] and a["time_compatible"] != true),
        0.8,
        true,
        "confirm_time"
      ),
      gap(
        "hard_constraint",
        a["hard_constraint_block"] == true or a["accessibility_block"] == true,
        0.98,
        true,
        nil
      ),
      gap(
        "capacity",
        a["capacity_overflow"] == true or a["capacity_ok"] == false,
        0.88,
        true,
        nil
      ),
      gap(
        "provider_live_availability",
        a["need_live_inventory"] == true and a["provider_checked"] != true and
          a["ask_book"] == true,
        0.75,
        true,
        nil
      ),
      gap(
        "authorization",
        a["needs_user_authorization"] == true and a["user_authorized"] != true,
        0.7,
        true,
        "book_authorization"
      ),
      gap(
        "location_uncertainty",
        a["zone_unknown"] == true or a["location_stale"] == true,
        0.55,
        a["location_critical"] == true,
        "zone_tradeoff"
      ),
      gap(
        "minor_rating",
        a["rating_uncertain"] == true,
        0.1,
        false,
        nil
      ),
      gap(
        "secondary_amenity",
        a["amenity_unknown"] == true,
        0.08,
        false,
        nil
      ),
      gap(
        "small_eta_variance",
        a["eta_uncertain"] == true,
        0.12,
        false,
        nil
      ),
      gap(
        "extra_mediocre_candidate",
        is_number(a["candidate_count"]) and a["candidate_count"] > 3,
        0.05,
        false,
        nil
      )
    ]
    |> Enum.reject(&is_nil/1)
  end

  defp gap(_type, false, _impact, _critical, _topic), do: nil

  defp gap(type, true, impact, critical, topic) do
    %{
      "type" => type,
      "impact" => impact,
      "critical" => critical,
      "question_topic" => topic,
      "decision_impact" => impact
    }
  end

  defp execution_blocking?(g) do
    g["type"] in ~w(
      hard_constraint
      capacity
      provider_live_availability
      authorization
      safety
      privacy
    )
  end

  defp maybe_question(nil, _), do: nil

  defp maybe_question(primary, a) do
    topic = primary["question_topic"]

    if is_binary(topic) do
      q =
        QuestionValue.evaluate(%{
          "topic" => topic,
          "required_participant_unresolved" => a["required_participant_unresolved"],
          "willingness_ok" => a["willingness_ok"],
          "aligned_when" => a["when"] || a["slot_label"],
          "wizard_chain" => false
        })

      if q["ask"] do
        Map.merge(q, %{
          "private" => primary["type"] in ~w(willingness required_participant),
          "audience" =>
            if(primary["type"] == "required_participant",
              do: "required_person_only",
              else: "relevant_actor"
            ),
          "public_callout" => false
        })
      end
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

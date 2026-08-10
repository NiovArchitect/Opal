defmodule OpalCore.SocialFlow.Execution.OutcomeLearning do
  @moduledoc """
  Learn from outcomes without overfitting.

  Choice ≠ love.
  Attendance ≠ enjoyment.
  Non-action is weak evidence.
  Repeat behavior needs repeat evidence.
  No post-event surveys by default.
  """

  alias OpalCore.SocialFlow.Execution.{MemoryAdmission, MemoryScope}

  @doc """
  Convert an execution/outcome event into an admission candidate (or reject).
  """
  def from_outcome(attrs) when is_map(attrs) do
    a = stringify(attrs)

    case evidence_class(a) do
      :weak -> weak_reject(a)
      class -> MemoryAdmission.evaluate(attrs_for(class, a))
    end
  end

  def from_outcome(_), do: %{"admit" => false, "reason" => "invalid"}

  @doc "Whether repeated behavior threshold is met."
  def repeated_enough?(count, opts \\ []) do
    min = Keyword.get(opts, :min, 3)
    is_number(count) and count >= min
  end

  defp attrs_for(:explicit_correction, a) do
    base_ids(a, %{
      kind: "explicit_correction",
      text: a["text"] || a["correction"],
      value: a["value"] || a["text"],
      dimension: a["dimension"],
      scope: a["scope"] || scope_for_correction(a),
      source: "natural_language_correction",
      source_event: a["source_event"] || "user_correction",
      work_eliminated: ["preserve_correction", "prevent_bad_option"]
    })
  end

  defp attrs_for(:explicit_statement, a) do
    base_ids(a, %{
      kind: "explicit_fact",
      text: a["text"],
      value: a["value"] || a["text"],
      dimension: a["dimension"] || MemoryScope.narrow_dimension(a["text"] || ""),
      scope: a["scope"] || "relationship",
      source: "explicit_statement",
      work_eliminated: a["work_eliminated"] || ["eliminate_question", "improve_fit"]
    })
  end

  defp attrs_for(:repeated_choice, a) do
    base_ids(a, %{
      kind: "repeated_behavior",
      value: a["place"] || a["value"],
      dimension: a["dimension"] || "familiar_place",
      group_id: a["group_id"] || a["participant_set_key"],
      scope: a["scope"] || if(a["group_id"], do: "group", else: "relationship"),
      repeat_count: a["repeat_count"] || 3,
      source: "repeated_choice",
      work_eliminated: ["eliminate_comparison", "improve_fit"]
    })
  end

  defp attrs_for(:provider_outcome, a) do
    base_ids(a, %{
      kind: "provider_execution_outcome",
      value: a["outcome"] || a["provider_outcome"],
      dimension: "execution_outcome",
      plan_id: a["plan_id"],
      scope: "plan",
      source: "provider",
      work_eliminated: ["improve_recovery"]
    })
  end

  defp attrs_for(:native_commitment, a) do
    base_ids(a, %{
      kind: "native_commitment_history",
      value: a["commitment"] || a["place"],
      dimension: "commitment",
      plan_id: a["plan_id"],
      scope: "user",
      source: "native_commitment",
      work_eliminated: ["reduce_coordination_labor"]
    })
  end

  defp base_ids(a, extra) do
    Map.merge(
      %{
        owner_user_id: a["owner_user_id"] || a["user_id"],
        relationship_id: a["relationship_id"],
        counterpart_user_id: a["counterpart_user_id"],
        conversation_id: a["conversation_id"],
        plan_id: a["plan_id"],
        plan_type: a["plan_type"]
      },
      extra
    )
  end

  defp weak_reject(a) do
    %{
      "admit" => false,
      "reason" => weak_reason(a),
      "observation_ne_cause" => true,
      "choice_ne_love" => a["chose_place"] == true,
      "attendance_ne_enjoyment" => attendance?(a),
      "omission_ne_dislike" => a["not_selected"] == true
    }
  end

  defp attendance?(a) do
    a["attended_or_completed"] == true or a["plan_completed"] == true or
      a["directions_started"] == true or a["reservation_confirmed"] == true
  end

  defp evidence_class(a) do
    cond do
      a["explicit_correction"] == true or a["correction"] not in [nil, ""] ->
        :explicit_correction

      a["explicit"] == true or a["user_stated"] == true ->
        :explicit_statement

      is_number(a["repeat_count"]) and a["repeat_count"] >= 3 ->
        :repeated_choice

      a["provider_confirmed"] == true or a["provider_outcome"] not in [nil, ""] ->
        :provider_outcome

      a["set"] == true or a["native_commitment"] == true ->
        :native_commitment

      true ->
        :weak
    end
  end

  defp weak_reason(a) do
    cond do
      a["not_selected"] == true -> "omission_is_weak_evidence"
      a["chose_place"] == true -> "choice_ne_love"
      a["plan_completed"] == true -> "attendance_ne_enjoyment"
      a["directions_started"] == true -> "navigation_ne_enjoyment"
      a["reservation_confirmed"] == true -> "booked_ne_enjoyment"
      true -> "insufficient_outcome_evidence"
    end
  end

  defp scope_for_correction(a) do
    cond do
      a["relationship_specific"] == true -> "relationship"
      a["this_week"] == true or a["tonight"] == true or a["plan_scoped"] == true -> "plan"
      a["group_specific"] == true -> "group"
      true -> "relationship"
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

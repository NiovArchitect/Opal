defmodule OpalCore.SocialFlow.Execution.MemoryAdmission do
  @moduledoc """
  Alignment-value admission (founder doctrine correction).

  NOT: “know as little as possible.”
  YES: know as much *useful*, permissioned, trustworthy context as needed
  to help each person align faster and more accurately.

  Optimization target: ALIGNMENT ADVANTAGE CREATED BY KNOWLEDGE.

  A fact is admitted when it can reduce uncertainty / questions / comparison /
  labor / latency — not merely because it exists, and not when sensitive
  inference or weak causal evidence would make Opal wrong.

  Rich intelligence below. Minimal disclosure above.
  Python may propose; Elixir authorizes.
  """

  alias OpalCore.SocialFlow.Execution.{MemoryKind, MemoryScope}
  alias OpalCore.SocialFlow.RealWorld.Memory.Layers

  @work_values ~w(
    eliminate_question
    eliminate_comparison
    improve_fit
    prevent_bad_option
    improve_recovery
    reduce_coordination_labor
    preserve_correction
    improve_privacy_safe_execution
  )

  @sensitive_inference_block ~w(
    religion medical financial sexual_orientation political relationship_status
  )

  def work_values, do: @work_values

  @doc """
  Admit or reject a candidate memory observation.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    kind = MemoryKind.normalize(a["kind"] || a["memory_kind"] || "derived_context")
    scope = MemoryScope.identity(a)
    dimension = a["dimension"] || MemoryScope.narrow_dimension(a["text"] || a["summary"] || "")
    value = a["value"] || a["summary"] || a["text"]
    works = List.wrap(a["work_eliminated"] || a["earns_by"] || default_work(kind, dimension))

    cond do
      a["python_direct_write"] == true ->
        reject("python_cannot_write_durable_truth")

      sensitive_inference?(kind, dimension, a) ->
        reject("sensitive_inference_blocked")

      weak_evidence?(kind, a) ->
        reject("weak_evidence_choice_or_omission")

      works == [] or not Enum.any?(works, &(&1 in @work_values)) ->
        reject("does_not_earn_retention")

      a["retention_disproportionate"] == true ->
        reject("disproportionate_retention")

      unclear?(a, value) ->
        ephemeral_or_discard(a, kind, scope, dimension)

      true ->
        admit(a, kind, scope, dimension, value, works)
    end
  end

  def evaluate(_), do: reject("invalid")

  @doc "Python proposal path — never durable without Elixir admit."
  def from_python_proposal(proposal) when is_map(proposal) do
    p = stringify(proposal)

    evaluate(
      Map.merge(p, %{
        "kind" => p["kind"] || "inferred_preference",
        "source" => "python_proposal",
        "python_direct_write" => false,
        "requires_elixir_authorize" => true,
        "inferred" => true
      })
    )
  end

  def from_python_proposal(_), do: reject("invalid")

  defp admit(a, kind, scope, dimension, value, works) do
    layer = layer_for(scope["scope"], kind)

    {:ok, layer_entry} =
      Layers.put(layer, Map.merge(scope, %{"key" => dimension, "payload" => %{}}))

    fact = %{
      "admitted" => true,
      "kind" => kind,
      "dimension" => dimension,
      "value" => sanitize_value(value),
      "scope" => scope["scope"],
      "scope_id" => scope["scope_id"],
      "owner_user_id" => scope["owner_user_id"],
      "relationship_id" => scope["relationship_id"],
      "conversation_id" => scope["conversation_id"],
      "plan_id" => scope["plan_id"],
      "group_id" => scope["group_id"],
      "activity_type" => scope["activity_type"],
      "work_eliminated" => works,
      "confidence_band" => MemoryKind.confidence_band(kind),
      "authority_rank" => MemoryKind.authority_rank(kind),
      "provenance" => %{
        "explicit" => kind in ~w(explicit_fact explicit_correction),
        "inferred" => kind in ~w(inferred_preference derived_context),
        "source" => a["source"] || kind,
        "source_event" => a["source_event"],
        "observed_at" => a["observed_at"] || DateTime.utc_now(),
        "python_proposed" => a["source"] == "python_proposal"
      },
      "freshness_class" => MemoryKind.freshness_class(kind),
      "durable" => durable?(kind, a, scope),
      "layer" => layer_entry["layer"],
      "narrow_interpretation" => true,
      "overgeneralized" => false,
      "authorizes_set" => false,
      "profile_machine" => false,
      "public_score" => false,
      "visibility" => "private",
      "shared_explanation_safe" => false
    }

    %{
      "admit" => true,
      "fact" => fact,
      "ephemeral" => false,
      "reason" => "earns_#{List.first(works)}"
    }
  end

  defp ephemeral_or_discard(a, kind, scope, dimension) do
    if a["keep_ephemeral"] == true or kind == "derived_context" do
      %{
        "admit" => true,
        "ephemeral" => true,
        "fact" => %{
          "kind" => kind,
          "dimension" => dimension,
          "value" => a["value"] || a["text"],
          "scope" => "plan",
          "scope_id" => scope["plan_id"],
          "durable" => false,
          "expires_with_plan" => true,
          "authorizes_set" => false
        },
        "reason" => "ephemeral_unclear"
      }
    else
      reject("unclear_discard")
    end
  end

  defp reject(reason) do
    %{
      "admit" => false,
      "reason" => reason,
      "fact" => nil,
      "authorizes_set" => false
    }
  end

  defp default_work("explicit_correction", _), do: ["preserve_correction", "prevent_bad_option"]
  defp default_work("explicit_fact", "noise_level"), do: ["eliminate_question", "improve_fit"]
  defp default_work("explicit_fact", "cost"), do: ["eliminate_question", "improve_fit"]

  defp default_work("explicit_fact", "travel_burden"),
    do: ["eliminate_question", "prevent_bad_option"]

  defp default_work("explicit_fact", "formality"), do: ["eliminate_question", "improve_fit"]

  defp default_work("explicit_fact", "timing"),
    do: ["eliminate_question", "reduce_coordination_labor"]

  defp default_work("explicit_fact", "cuisine"), do: ["eliminate_question", "improve_fit"]

  defp default_work("explicit_fact", "generic_preference"),
    do: ["eliminate_question", "improve_fit"]

  defp default_work("explicit_fact", _), do: ["eliminate_question", "improve_fit"]
  defp default_work("repeated_behavior", _), do: ["eliminate_comparison", "improve_fit"]
  defp default_work("native_commitment_history", _), do: ["reduce_coordination_labor"]
  defp default_work("provider_execution_outcome", _), do: ["improve_recovery"]
  defp default_work("inferred_preference", _), do: []
  defp default_work("derived_context", _), do: []
  defp default_work(_, _), do: []

  defp sensitive_inference?(kind, dimension, a) do
    kind in ~w(inferred_preference derived_context) and
      (dimension in @sensitive_inference_block or a["sensitive_trait"] == true or
         sensitive_text?(a["text"] || a["value"] || ""))
  end

  defp sensitive_text?(t) when is_binary(t) do
    d = String.downcase(t)

    Enum.any?(
      ~w(religion medical diagnosis therapy income broke debt gay straight republican democrat pregnant),
      &String.contains?(d, &1)
    )
  end

  defp sensitive_text?(_), do: false

  defp weak_evidence?(kind, a) do
    cond do
      # Non-action is weak
      a["evidence"] == "omission" or a["not_selected"] == true ->
        kind != "explicit_correction"

      # Single choice ≠ love
      a["evidence"] == "single_choice" and kind == "inferred_preference" and
          a["repeat_count"] in [nil, 0, 1] ->
        true

      # Attendance ≠ enjoyment
      a["evidence"] in ~w(reservation_confirmed directions_started plan_completed) and
          kind == "inferred_preference" ->
        true

      true ->
        false
    end
  end

  defp unclear?(a, value) do
    (is_nil(value) or value == "") and a["force_admit"] != true
  end

  defp durable?(kind, a, scope) do
    cond do
      scope["scope"] == "plan" -> false
      a["plan_scoped"] == true -> false
      kind == "derived_context" -> false
      kind == "inferred_preference" and (a["repeat_count"] || 0) < 3 -> false
      MemoryKind.may_be_durable?(kind) -> true
      true -> false
    end
  end

  defp layer_for("relationship", _), do: "relationship"
  defp layer_for("conversation", _), do: "conversation"
  defp layer_for("plan", _), do: "plan"
  defp layer_for("user", _), do: "personal_private"
  defp layer_for(_, "provider_execution_outcome"), do: "provider_outcomes"
  defp layer_for(_, _), do: "personal_private"

  defp sanitize_value(v) when is_binary(v), do: String.slice(String.trim(v), 0, 240)
  defp sanitize_value(v) when is_number(v) or is_boolean(v), do: v
  defp sanitize_value(v) when is_map(v), do: Map.drop(v, ~w(raw_transcript access_token))
  defp sanitize_value(v), do: v

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

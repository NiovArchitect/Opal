defmodule OpalCore.SocialFlow.AlignmentContext do
  @moduledoc """
  Temporary conversation-scoped alignment context composition.

  Composes existing social state — does **not** create a parallel source of truth.
  Temporary / revisable / expirable.

  Potential contents:
  - intent
  - participants
  - current gap
  - time evidence
  - place evidence
  - participation
  - permissions
  - private constraints (owner-only views)
  - freshness
  - candidate shared-safe result
  - current intervention class

  Set remains a separate authority.
  """

  alias OpalCore.SocialFlow.Availability
  alias OpalCore.SocialFlow.AvailabilityAlignmentEvidence

  @schema "0.1.0"
  @default_ttl_sec 3_600

  @doc """
  Compose a temporary context map for an actor in a conversation.

  `extras` may include already-gathered pieces (participation, place, intent)
  so this stays additive over existing modules.
  """
  def compose(conversation_id, actor_user_id, extras \\ %{})
      when is_binary(conversation_id) and is_binary(actor_user_id) do
    extras = stringify(extras)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    ttl =
      to_int(extras["ttl_sec"])
      |> then(fn
        0 -> @default_ttl_sec
        n -> n
      end)

    with {:ok, intervention} <- Availability.resolve_intervention(conversation_id, actor_user_id),
         {:ok, overlap} <- Availability.compute_overlap(conversation_id, actor_user_id) do
      gap = AvailabilityAlignmentEvidence.from_overlap(overlap)
      mq = AvailabilityAlignmentEvidence.minimum_question_for_decision(intervention["decision"])

      ctx = %{
        "schema_version" => @schema,
        "conversation_id" => conversation_id,
        "actor_user_id" => actor_user_id,
        "intent" => extras["intent"] || "coordinate_time",
        "participants" => List.wrap(extras["participants"] || []),
        "current_gap" => gap_to_map(gap),
        "time_evidence" => extras["time_evidence"] || %{},
        "place_evidence" => extras["place_evidence"] || %{},
        "participation" => extras["participation"] || %{},
        "permissions" => extras["permissions"] || %{},
        "private_constraints" => extras["private_constraints"] || %{},
        "freshness" => %{
          "composed_at" => DateTime.to_iso8601(now),
          "expires_at" => DateTime.to_iso8601(DateTime.add(now, ttl, :second))
        },
        "candidate_shared_safe_result" => intervention["overlap"] || overlap,
        "current_intervention_class" => intervention["decision"],
        "minimum_question_topic" => mq && Atom.to_string(mq),
        "authorizes_set" => false,
        "temporary" => true,
        "revisable" => true,
        "expirable" => true
      }

      {:ok, ctx}
    end
  end

  @doc "Whether a composed context is still live."
  def live?(ctx, now \\ DateTime.utc_now())

  def live?(ctx, now) when is_map(ctx) do
    exp =
      get_in(stringify(ctx), ["freshness", "expires_at"]) ||
        stringify(ctx)["expires_at"]

    case parse_dt(exp) do
      {:ok, e} -> DateTime.compare(e, now) == :gt
      _ -> false
    end
  end

  def live?(_, _), do: false

  @doc "Revise context with new intervention class without rebuilding everything."
  def revise(ctx, patch) when is_map(ctx) and is_map(patch) do
    c = stringify(ctx)
    p = stringify(patch)

    {:ok,
     c
     |> Map.merge(
       Map.take(p, [
         "intent",
         "time_evidence",
         "place_evidence",
         "participation",
         "permissions",
         "private_constraints",
         "current_intervention_class",
         "candidate_shared_safe_result",
         "minimum_question_topic"
       ])
     )
     |> put_in(["freshness", "revised_at"], DateTime.utc_now() |> DateTime.to_iso8601())}
  end

  def revise(_, _), do: {:error, :invalid_context}

  defp gap_to_map({:gap, domain, action}),
    do: %{"status" => "gap", "domain" => to_string(domain), "action" => to_string(action)}

  defp gap_to_map({:resolved, domain}),
    do: %{"status" => "resolved", "domain" => to_string(domain)}

  defp gap_to_map(:none), do: %{"status" => "none"}
  defp gap_to_map(_), do: %{"status" => "unknown"}

  defp parse_dt(%DateTime{} = dt), do: {:ok, dt}

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, dt}
      _ -> :error
    end
  end

  defp parse_dt(_), do: :error

  defp to_int(nil), do: 0
  defp to_int(n) when is_integer(n), do: n
  defp to_int(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_value(v)}
      {k, v} -> {to_string(k), stringify_value(v)}
    end)
  end

  defp stringify_value(v) when is_map(v), do: stringify(v)
  defp stringify_value(v) when is_list(v), do: Enum.map(v, &stringify_value/1)
  defp stringify_value(v), do: v
end

defmodule OpalCore.SocialFlow.Ambient.ContextBridge do
  @moduledoc """
  Additive bridge: Ambient Opportunity → AlignmentContext extras.

  Does not own Set, membership, or permissions.
  Only enriches temporary context when an active alignment is forming.
  """

  alias OpalCore.SocialFlow.AlignmentContext
  alias OpalCore.SocialFlow.Ambient.AmbientOpportunity

  @doc """
  Compose AlignmentContext and optionally attach ambient evaluation.
  """
  def compose_with_ambient(conversation_id, actor_user_id, extras \\ %{})
      when is_binary(conversation_id) and is_binary(actor_user_id) do
    extras = stringify(extras)

    with {:ok, ctx} <- AlignmentContext.compose(conversation_id, actor_user_id, extras) do
      ambient =
        if extras["evaluate_ambient"] == true do
          case AmbientOpportunity.evaluate(ambient_attrs(extras, conversation_id, actor_user_id)) do
            {:ok, a} -> a
            _ -> %{"surface" => %{"surface" => :silence, "reason" => "ambient_failed"}}
          end
        else
          nil
        end

      enriched =
        ctx
        |> Map.put("ambient", ambient)
        |> Map.put("ambient_attached", not is_nil(ambient))
        |> Map.put("authorizes_set", false)

      {:ok, enriched}
    end
  end

  @doc """
  Whether ambient surface should materialize into conversation from context.
  """
  def should_materialize?(ctx) when is_map(ctx) do
    c = stringify(ctx)
    surface = get_in(c, ["ambient", "surface", "surface"])
    surface == :opportunity and AlignmentContext.live?(c)
  end

  def should_materialize?(_), do: false

  defp ambient_attrs(extras, conv, actor) do
    Map.merge(
      %{
        "participant_ids" => List.wrap(extras["participants"] || extras["participant_ids"]),
        "in_ids" => List.wrap(extras["in_ids"]),
        "out_ids" => List.wrap(extras["out_ids"]),
        "maybe_ids" => List.wrap(extras["maybe_ids"]),
        "required_ids" => List.wrap(extras["required_ids"]),
        "conversation_id" => conv,
        "actor_user_id" => actor,
        "time_compatible" => extras["time_compatible"] == true,
        "proximity_ok" => extras["proximity_ok"] == true,
        "willingness_ok" => extras["willingness_ok"] != false,
        "relationship_context" => extras["relationship_context"] || "friends",
        "forming?" => true,
        "confidence" => extras["confidence"] || 0.75,
        "option_count" => extras["option_count"] || 0,
        "options" => List.wrap(extras["options"]),
        "opening_hours" => extras["opening_hours"] || 2.0,
        "place_resolved" => extras["place_resolved"] == true,
        "travel_ok" => extras["travel_ok"] == true or extras["proximity_ok"] == true
      },
      Map.take(extras, [
        "purpose",
        "min_viable",
        "topic_changed",
        "blocked",
        "fetch_places",
        "category",
        "max_price_band",
        "area_label"
      ])
    )
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

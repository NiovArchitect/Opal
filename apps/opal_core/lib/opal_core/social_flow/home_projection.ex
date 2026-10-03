defmodule OpalCore.SocialFlow.HomeProjection do
  @moduledoc """
  Participant-scoped continuity card for one committed SharedPlan.

  Home reads this projection. It is not a second database and it is not a
  public post. A message, a time proposal, or a locked time without a place
  does not qualify. Broader sharing stays explicit.
  """

  alias OpalCore.SocialFlow.DateTimeChange
  alias OpalCore.SocialFlow.PlaceIdentity
  alias OpalCore.SocialFlow.PlanStateArbitration

  @spec from_alignment(map() | nil, String.t(), non_neg_integer()) :: map() | nil
  def from_alignment(alignment, conversation_id, member_count)
      when is_map(alignment) and is_binary(conversation_id) and is_integer(member_count) do
    exact = alignment["exact_time"] || %{}
    place = alignment["place"] || %{}
    commitment = alignment["commitment"]

    eligible =
      exact["state"] == "locked" and is_binary(exact["value"]) and
        place["state"] == "locked" and is_binary(place["value"]) and
        commitment in ["aligned", "execution_ready"]

    if eligible do
      date = alignment["date"] || %{}
      change_proposal = alignment["change_proposal"]
      arb = PlanStateArbitration.evaluate(alignment)
      past_shared? = arb["past_shared_reality"] == true
      past? = arb["temporal_state"] == "past"

      when_label =
        [date["value"], exact["value"]]
        |> Enum.filter(&is_binary/1)
        |> Enum.join(" · ")

      %{
        "lineage_id" => alignment["lineage_id"],
        "conversation_id" => conversation_id,
        "plan_version" => alignment["plan_version"],
        "visibility" => "participants",
        "participant_mode" => participant_mode(member_count),
        # Earlier together = Past Shared Reality — not Durable/Published Memory
        "kicker" => if(past_shared? or past?, do: "Earlier together", else: "Plan set ✓"),
        "when_label" => when_label,
        "place" => place["value"],
        "place_identity" => place_identity_for(alignment, place),
        "activity" => get_in(alignment, ["activity", "value"]),
        "timezone" => get_in(alignment, ["date", "timezone"]) || DateTimeChange.timezone(),
        "execution_label" => if(past?, do: nil, else: execution_label(commitment)),
        "execution_detail" => if(past?, do: nil, else: execution_detail(commitment)),
        "pending_change" => is_map(change_proposal),
        "public" => false,
        "share" => "explicit_only",
        "temporal_state" => arb["temporal_state"],
        "canonical_start_at" => arb["canonical_start_at"],
        "next_together_eligible" => arb["next_together_eligible"],
        "upcoming_ready" => arb["upcoming_ready"],
        "future_execution_actionable" => arb["future_execution_actionable"],
        "past_shared_reality" => past_shared?,
        "occurrence_state" => arb["occurrence_state"],
        "memory_label" => false
      }
      |> maybe_put_pending_proposal(change_proposal)
    else
      nil
    end
  end

  def from_alignment(_, _, _), do: nil

  defp participant_mode(1), do: "solo"
  defp participant_mode(2), do: "dyad"
  defp participant_mode(count) when is_integer(count) and count >= 3, do: "group"
  defp participant_mode(_), do: "solo"

  defp execution_label("execution_ready"), do: "Reservation approved"
  defp execution_label(_), do: nil

  defp execution_detail("execution_ready"), do: "Booking hasn't been placed yet."
  defp execution_detail(_), do: nil

  defp maybe_put_pending_proposal(card, change_proposal) when is_map(change_proposal) do
    card
    |> maybe_put_binary("pending_proposal_value", change_proposal["value"])
    |> maybe_put_binary("pending_proposal_field", change_proposal["field"])
  end

  defp maybe_put_pending_proposal(card, _), do: card

  defp maybe_put_binary(card, key, value) when is_binary(value), do: Map.put(card, key, value)
  defp maybe_put_binary(card, _, _), do: card

  # Prefer persisted PlaceIdentity over weak CandidateProvider catalog labels.
  defp place_identity_for(alignment, place) when is_map(place) do
    persisted = place["identity"] || alignment["place_identity"]

    cond do
      PlaceIdentity.high_confidence?(persisted) ->
        PlaceIdentity.for_surface(persisted)

      is_binary(place["value"]) ->
        PlaceIdentity.for_surface(PlaceIdentity.resolve(place["value"]))

      true ->
        nil
    end
  end

  defp place_identity_for(_, _), do: nil
end

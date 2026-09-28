defmodule OpalCore.SocialFlow.HomeProjection do
  @moduledoc """
  Participant-scoped continuity card for one committed SharedPlan.

  Home reads this projection. It is not a second database and it is not a
  public post. A message, a time proposal, or a locked time without a place
  does not qualify. Broader sharing stays explicit.
  """

  alias OpalCore.SocialFlow.CandidateProvider
  alias OpalCore.SocialFlow.DateTimeChange

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
        "kicker" => "Plan set ✓",
        "when_label" => when_label,
        "place" => place["value"],
        "place_identity" => CandidateProvider.identity(place["value"]),
        "activity" => get_in(alignment, ["activity", "value"]),
        "timezone" => get_in(alignment, ["date", "timezone"]) || DateTimeChange.timezone(),
        "execution_label" => execution_label(commitment),
        "execution_detail" => execution_detail(commitment),
        "pending_change" => is_map(alignment["change_proposal"]),
        "public" => false,
        "share" => "explicit_only"
      }
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
end

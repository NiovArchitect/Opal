defmodule OpalCore.SocialFlow.OpalCalendar.Reminders do
  @moduledoc """
  Reminder intent against native Opal commitments.

  Opal owns reminder intent/state. Device/notification executes delivery.
  Does not require Google Calendar.
  """

  @kinds ~w(plan_upcoming leave_by significant_change)

  def kinds, do: @kinds

  def prepare_for_commitment(commitment, opts \\ [])

  @doc "Prepare private reminder intents for a commitment (not delivered yet)."
  def prepare_for_commitment(commitment, opts) when is_map(commitment) do
    c = stringify(commitment)
    start_at = parse_dt(c["start_at"])
    travel = Keyword.get(opts, :travel_minutes)

    base =
      if match?(%DateTime{}, start_at) do
        [
          %{
            "kind" => "plan_upcoming",
            "owner_user_id" => c["owner_user_id"],
            "commitment_id" => c["id"],
            "scheduled_for" => DateTime.add(start_at, -3600, :second),
            "content_class" => "plan_reminder",
            "visibility" => "private",
            "delivery" => "pending_device",
            "spam" => false
          }
        ]
      else
        []
      end

    leave =
      if match?(%DateTime{}, start_at) and is_number(travel) do
        [
          %{
            "kind" => "leave_by",
            "owner_user_id" => c["owner_user_id"],
            "commitment_id" => c["id"],
            "scheduled_for" => DateTime.add(start_at, -round((travel + 10) * 60), :second),
            "content_class" => "leave_by",
            "visibility" => "private",
            "delivery" => "pending_device",
            "spam" => false
          }
        ]
      else
        []
      end

    base ++ leave
  end

  def prepare_for_commitment(_, _), do: []

  @doc "Cancel reminder intents when plan cancelled/rescheduled."
  def cancel_for_commitment(commitment_id, intents) when is_list(intents) do
    Enum.map(intents, fn i ->
      if i["commitment_id"] == commitment_id do
        Map.put(i, "status", "cancelled")
      else
        i
      end
    end)
  end

  def cancel_for_commitment(_, intents), do: intents

  defp parse_dt(%DateTime{} = dt), do: dt

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

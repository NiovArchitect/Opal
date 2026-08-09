defmodule OpalCore.SocialFlow.Feasibility.LeaveBy do
  @moduledoc """
  Leave-by intelligence for native commitments.

  Higher value than generic reminders.
  Never exposes origin coordinates to peers.
  """

  alias OpalCore.SocialFlow.Feasibility.Buffer

  @doc """
  Compute private leave-by for a commitment + optional travel context.
  """
  def for_commitment(commitment, opts \\ []) when is_map(commitment) do
    c = stringify(commitment)
    start_at = parse_dt(c["start_at"])

    case start_at do
      %DateTime{} ->
        travel = Keyword.get(opts, :travel_minutes) || c["travel_minutes"] || 20
        mode = Keyword.get(opts, :mode, :driving)

        leave =
          Buffer.leave_by(start_at, travel, mode: mode, context: Keyword.get(opts, :context))

        {:ok,
         %{
           "commitment_id" => c["id"],
           "leave_by" => leave,
           "plan_start" => start_at,
           "travel_minutes" => travel,
           "private" => true,
           "private_copy" => leave_copy(leave),
           "origin_exposed" => false,
           "shared_eta" => nil,
           "authorizes_set" => false
         }}

      _ ->
        {:error, :no_start}
    end
  end

  @doc "Attach leave-by as a reminder intent (delivery separate)."
  def as_reminder_intent(leave_result) when is_map(leave_result) do
    r = stringify(leave_result)

    %{
      "kind" => "leave_by",
      "commitment_id" => r["commitment_id"],
      "owner_user_id" => r["owner_user_id"],
      "scheduled_for" => r["leave_by"],
      "content_class" => "leave_by",
      "content_summary" => r["private_copy"],
      "visibility" => "private",
      "spam" => false
    }
  end

  def as_reminder_intent(_), do: nil

  @doc """
  Explicit user share of ETA — never automatic from device permission.
  """
  def share_eta(leave_result, opts \\ []) when is_map(leave_result) do
    if Keyword.get(opts, :user_authorized) == true do
      minutes = Keyword.get(opts, :eta_minutes)

      {:ok,
       %{
         "shared_safe" => true,
         "summary" =>
           if(is_number(minutes),
             do: "I'm about #{round(minutes)} minutes away.",
             else: "On the way"
           ),
         "origin_exposed" => false,
         "leave_by_exposed" => false
       }}
    else
      {:error, :user_authorization_required}
    end
  end

  defp leave_copy(%DateTime{} = dt) do
    # Keep natural and non-mechanical; frontend may refine locale
    h =
      dt.hour
      |> rem(12)
      |> then(fn
        0 -> 12
        n -> n
      end)

    ampm = if dt.hour >= 12, do: "PM", else: "AM"
    min = dt.minute |> Integer.to_string() |> String.pad_leading(2, "0")
    "Leave around #{h}:#{min} #{ampm}."
  end

  defp leave_copy(_), do: "Leave with a little buffer."

  defp parse_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

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

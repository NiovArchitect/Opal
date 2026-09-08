defmodule OpalCore.SocialFlow.Feasibility.LeaveByMateriality do
  @moduledoc """
  Opal-novel time: leave-by interrupts only when material — not a ticking clock.

  Emits Outbox `action.leave_by_due` when within the notify window and not yet emitted.
  Never exposes origin coordinates.
  """

  alias OpalCore.Events.Publisher

  @default_notify_before_sec 15 * 60

  @doc """
  Decide whether to surface a leave-by moment.

  Returns:
  - `{:silence, meta}` — too early / already notified / missing data
  - `{:material, payload}` — human should see one calm moment
  """
  def evaluate(leave_result, opts \\ []) when is_map(leave_result) do
    r = stringify(leave_result)
    now = Keyword.get(opts, :now) || DateTime.utc_now()
    window = Keyword.get(opts, :notify_before_sec, @default_notify_before_sec)
    already? = Keyword.get(opts, :already_notified, false) == true

    leave_by = parse_dt(r["leave_by"] || r[:leave_by])

    cond do
      already? ->
        {:silence, %{"reason" => "already_notified"}}

      is_nil(leave_by) ->
        {:silence, %{"reason" => "no_leave_by"}}

      DateTime.compare(now, leave_by) == :gt ->
        # Past leave-by — still material once (overdue), unless already notified
        {:material, moment_payload(r, leave_by, "overdue")}

      DateTime.diff(leave_by, now, :second) > window ->
        {:silence, %{"reason" => "too_early", "seconds_until" => DateTime.diff(leave_by, now, :second)}}

      true ->
        {:material, moment_payload(r, leave_by, "due_soon")}
    end
  end

  @doc "Persist material leave-by as Outbox event (IDs + copy only)."
  def emit_if_material(leave_result, opts \\ []) do
    case evaluate(leave_result, opts) do
      {:silence, meta} ->
        {:ok, {:silence, meta}}

      {:material, payload} ->
        owner = payload["owner_user_id"]
        commitment_id = payload["commitment_id"] || "unknown"

        case Publisher.record(%{
               event_type: "action.leave_by_due",
               aggregate_type: "commitment",
               aggregate_id: to_string(commitment_id),
               partition_key: to_string(owner || commitment_id),
               privacy_class: "private_authorized",
               purpose: "leave_by_moment",
               payload: payload
             }) do
          {:ok, row} -> {:ok, {:material, payload, row}}
          err -> err
        end
    end
  end

  defp moment_payload(r, leave_by, urgency) do
    %{
      "kind" => "leave_by",
      "urgency" => urgency,
      "commitment_id" => r["commitment_id"],
      "owner_user_id" => r["owner_user_id"],
      "leave_by" => DateTime.to_iso8601(leave_by),
      "content_summary" => r["private_copy"] || "Time to leave",
      "origin_exposed" => false,
      "spam" => false,
      "materiality" => "LEAVE_BY_WINDOW"
    }
  end

  defp parse_dt(%DateTime{} = dt), do: dt
  defp parse_dt(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> dt
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

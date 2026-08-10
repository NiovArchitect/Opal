defmodule OpalCore.SocialFlow.OpalCalendar.ReminderDelivery do
  @moduledoc """
  Delivery transport for reminder intents.

  Opal domain owns intent truth; this module only schedules/delivers.
  No engagement spam — only actionable reminders.
  """

  alias OpalCore.SocialFlow.OpalCalendar.Reminders

  @actionable_kinds ~w(plan_upcoming leave_by significant_change)

  @doc "Filter intents to those worth notifying."
  def actionable?(intent) when is_map(intent) do
    kind = intent["kind"] || intent[:kind]
    status = intent["status"] || intent[:status]

    kind in @actionable_kinds and status not in ~w(cancelled dismissed completed) and
      intent["spam"] != true
  end

  def actionable?(_), do: false

  @doc """
  Queue delivery for actionable intents.

  Returns delivery records with transport state pending|delivered|suppressed.
  Does not send spam.
  """
  def queue(intents, opts \\ []) when is_list(intents) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()
    transport = Keyword.get(opts, :transport, "in_app")

    intents
    |> Enum.filter(&actionable?/1)
    |> Enum.map(fn intent ->
      scheduled = intent["scheduled_for"] || intent[:scheduled_for]

      cond do
        not match?(%DateTime{}, parse_dt(scheduled)) ->
          Map.merge(stringify(intent), %{
            "delivery_status" => "suppressed",
            "delivery_reason" => "invalid_schedule",
            "transport" => transport
          })

        DateTime.compare(parse_dt(scheduled), now) == :lt ->
          # Past due — deliver immediately if still relevant
          Map.merge(stringify(intent), %{
            "delivery_status" => "pending",
            "delivery_reason" => "due",
            "transport" => transport,
            "notify" => true
          })

        true ->
          Map.merge(stringify(intent), %{
            "delivery_status" => "scheduled",
            "delivery_reason" => "future",
            "transport" => transport,
            "notify" => false
          })
      end
    end)
  end

  @doc "Prepare + queue for a commitment (domain → transport boundary)."
  def prepare_and_queue(commitment, opts \\ []) do
    commitment
    |> Reminders.prepare_for_commitment(opts)
    |> queue(opts)
  end

  @doc """
  Lock-screen safe copy — action timing only, no relationship/private place dump.
  """
  def lock_screen_copy(intent) when is_map(intent) do
    i = stringify(intent)
    minutes = i["minutes_until_leave"] || i["leave_in_minutes"]

    line =
      cond do
        is_number(minutes) and minutes > 0 ->
          "Leave in #{trunc(minutes)} minutes."

        i["kind"] == "significant_change" ->
          "Your plan changed."

        true ->
          "Leave soon for your plan."
      end

    %{
      "lock_screen" => line,
      "relationship_exposed" => false,
      "private_place_exposed" => false,
      "engagement_spam" => false,
      "delivered" => false
    }
  end

  def lock_screen_copy(_), do: %{"lock_screen" => "Leave soon for your plan."}

  @doc "Cancel all deliveries for a commitment id."
  def cancel_for_commitment(commitment_id, deliveries) when is_list(deliveries) do
    Enum.map(deliveries, fn d ->
      if d["commitment_id"] == commitment_id do
        Map.merge(d, %{"delivery_status" => "cancelled", "notify" => false})
      else
        d
      end
    end)
  end

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

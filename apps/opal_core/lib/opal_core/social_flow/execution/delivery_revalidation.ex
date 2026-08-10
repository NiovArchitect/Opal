defmodule OpalCore.SocialFlow.Execution.DeliveryRevalidation do
  @moduledoc """
  Delivery-time validation before presenting notification/action.

  A perfect JustInTimeAction decision is useless if:
  - plan version changed
  - plan cancelled
  - action no longer relevant
  - notification arrives late
  - destination/time changed after schedule

  Suppress stale advice. Never overclaim delivery.
  """

  alias OpalCore.SocialFlow.Ambient.PlanVersion
  alias OpalCore.SocialFlow.Execution.PlanLifecycle

  @doc """
  Revalidate a scheduled/pending delivery against current plan truth.

  Returns {:ok, decision} where decision includes present? and reason.
  """
  def revalidate(delivery, plan_now, opts \\ [])

  def revalidate(delivery, plan_now, opts) when is_map(delivery) and is_map(plan_now) do
    d = stringify(delivery)
    p = stringify(plan_now)
    now = Keyword.get(opts, :now) || p["now"] || DateTime.utc_now()

    with :ok <- check_cancelled(p),
         :ok <- check_plan_version(d, p),
         :ok <- check_superseded(p),
         :ok <- check_already_handled(d, p),
         :ok <- check_destination(d, p),
         :ok <- check_time_change(d, p),
         :ok <- check_late_arrival(d, p, now),
         :ok <- check_still_useful(d, p, now) do
      {:ok,
       %{
         "present" => true,
         "suppressed" => false,
         "reason" => "valid",
         "plan_version" => p["plan_version"] || d["plan_version"],
         "delivery_id" => d["delivery_id"],
         "revalidated_at" => now
       }}
    else
      {:suppress, reason} ->
        {:ok,
         %{
           "present" => false,
           "suppressed" => true,
           "reason" => reason,
           "plan_version" => p["plan_version"],
           "delivery_id" => d["delivery_id"],
           "revalidated_at" => now,
           "stale_notification_suppressed" => true
         }}
    end
  end

  def revalidate(_, _, _), do: {:error, :invalid}

  @doc """
  Late notification usefulness.

  Leave reminder intended 6:20 but device wakes at 6:45:
  - if still before plan start and leave window not hopeless → maybe present
  - if past leave-by + grace, or past plan start → suppress
  """
  def late_still_useful?(delivery, plan, now \\ nil)

  def late_still_useful?(delivery, plan, now) when is_map(delivery) and is_map(plan) do
    d = stringify(delivery)
    p = stringify(plan)
    now = now || DateTime.utc_now()
    scheduled = parse_dt(d["scheduled_for"] || d["intended_at"])
    kind = d["kind"] || d["capability"] || ""

    cond do
      is_nil(scheduled) ->
        true

      DateTime.compare(now, scheduled) != :gt ->
        # On time or early
        true

      true ->
        late_mins = DateTime.diff(now, scheduled, :second) / 60.0
        grace = grace_minutes(kind, d, p)
        not past_hopeless?(p, now) and late_mins <= grace
    end
  end

  def late_still_useful?(_, _, _), do: false

  @doc "Grace window in minutes by kind."
  def grace_minutes(kind, delivery \\ %{}, plan \\ %{})

  def grace_minutes(kind, delivery, plan) when is_binary(kind) do
    d = stringify(delivery)
    p = stringify(plan)

    cond do
      is_number(d["late_grace_minutes"]) ->
        d["late_grace_minutes"]

      kind in ~w(leave_by leave_reminder reminder) ->
        # Leave reminders go stale quickly
        15

      kind in ~w(directions navigation) ->
        # Directions useful until shortly after start
        start = plan_start(p)
        if match?(%DateTime{}, start), do: 45, else: 30

      kind in ~w(booking_handoff ticket_handoff) ->
        24 * 60

      kind in ~w(plan_upcoming significant_change) ->
        60

      true ->
        20
    end
  end

  def grace_minutes(_, _, _), do: 20

  defp check_cancelled(p) do
    if p["cancelled"] == true or p["status"] == "cancelled" do
      {:suppress, "plan_cancelled"}
    else
      :ok
    end
  end

  defp check_superseded(p) do
    if p["superseded"] == true do
      {:suppress, "plan_superseded"}
    else
      :ok
    end
  end

  defp check_plan_version(d, p) do
    d_v = d["plan_version"]
    p_v = p["plan_version"] || p["active_plan_version"]

    cond do
      is_nil(d_v) or is_nil(p_v) ->
        :ok

      PlanVersion.accept_response?(
        %{"plan_version" => p_v},
        %{"plan_version" => d_v}
      ) ->
        :ok

      true ->
        {:suppress, "plan_version_mismatch"}
    end
  end

  defp check_already_handled(d, p) do
    cap = d["capability"] || d["kind"] || ""

    cond do
      cap in ~w(leave_by leave_reminder reminder) and
          (p["directions_started"] == true or p["navigation_started"] == true or
             p["human_reports_left"] == true) ->
        {:suppress, "user_already_departed"}

      cap in ~w(directions navigation) and
          (p["directions_started"] == true or p["navigation_started"] == true) ->
        {:suppress, "navigation_already_started"}

      cap in ~w(booking_handoff) and
          (p["provider_confirmed"] == true or p["human_reports_booked"] == true) ->
        {:suppress, "booking_already_handled"}

      p["human_reports_completed"] == true ->
        {:suppress, "plan_completed"}

      true ->
        :ok
    end
  end

  defp check_destination(d, p) do
    d_dest = d["destination"] || d["place"] || d["venue_id"]
    p_dest = p["destination"] || p["place"] || p["venue_id"]

    cond do
      is_nil(d_dest) or is_nil(p_dest) ->
        :ok

      normalize_dest(d_dest) == normalize_dest(p_dest) ->
        :ok

      p["destination_changed"] == true or p["navigation_stale"] == true ->
        {:suppress, "destination_changed"}

      true ->
        # Strict when both present and differ
        if to_string(d_dest) != to_string(p_dest) and
             d["venue_id"] != nil and p["venue_id"] != nil and
             d["venue_id"] != p["venue_id"] do
          {:suppress, "destination_changed"}
        else
          :ok
        end
    end
  end

  defp check_time_change(d, p) do
    d_when = parse_dt(d["when"] || d["plan_start"] || d["intended_plan_start"])
    p_when = parse_dt(p["when"] || p["plan_start"])

    cond do
      is_nil(d_when) or is_nil(p_when) ->
        :ok

      DateTime.diff(d_when, p_when, :second) |> abs() > 60 ->
        {:suppress, "plan_time_changed"}

      true ->
        :ok
    end
  end

  defp check_late_arrival(d, p, now) do
    if late_still_useful?(d, p, now) do
      :ok
    else
      {:suppress, "late_arrival_no_longer_useful"}
    end
  end

  defp check_still_useful(d, p, now) do
    kind = d["kind"] || d["capability"] || ""

    case PlanLifecycle.phase(Map.put(p, "now", now)) do
      {:ok, %{"phase" => phase}} ->
        cond do
          phase in ~w(cancelled superseded completed) ->
            {:suppress, "lifecycle_#{phase}"}

          kind in ~w(leave_by leave_reminder) and phase in ~w(occurring completed) ->
            {:suppress, "too_late_for_leave_reminder"}

          kind in ~w(directions navigation) and phase == "completed" ->
            {:suppress, "plan_over"}

          true ->
            :ok
        end

      _ ->
        :ok
    end
  end

  defp past_hopeless?(p, now) do
    case plan_start(p) do
      %DateTime{} = start ->
        # More than 30m after start
        DateTime.diff(now, start, :second) > 30 * 60

      _ ->
        false
    end
  end

  defp plan_start(p) do
    parse_dt(p["when"] || p["plan_start"] || p["start_at"])
  end

  defp normalize_dest(d) when is_binary(d), do: String.downcase(String.trim(d))
  defp normalize_dest(d), do: to_string(d)

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

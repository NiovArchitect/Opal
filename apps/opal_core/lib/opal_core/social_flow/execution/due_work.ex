defmodule OpalCore.SocialFlow.Execution.DueWork do
  @moduledoc """
  Smallest bounded mechanism: this plan deserves re-evaluation around time X.

  Not a global periodic plan scan. Not a generic cron/workflow platform.

  Properties:
  - plan_version scoped
  - idempotent (repeated fire → no duplicate prompts)
  - suppress if superseded / cancelled / version mismatch
  - event + lifecycle-moment driven schedule hints
  """

  use Agent

  alias OpalCore.SocialFlow.Ambient.PlanVersion

  @kinds ~w(
    watch_re_eval
    prepare_booking_context
    prepare_leave_by
    leave_reminder
    departure_check
    ticket_deadline
    provider_hold_check
  )

  def kinds, do: @kinds

  def start_link(_ \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          _ -> :ok
        end

      pid ->
        if Process.alive?(pid), do: :ok, else: start_link([]) |> then(fn _ -> :ok end)
    end
  end

  def reset do
    ensure_started()

    try do
      Agent.update(__MODULE__, fn _ -> %{} end)
    catch
      :exit, _ ->
        ensure_started()
        :ok
    end

    :ok
  end

  @doc """
  Schedule due work. Idempotent by fingerprint (plan_id + kind + due_at + plan_version).
  """
  def schedule(attrs) when is_map(attrs), do: schedule(attrs, [])
  def schedule(_), do: {:error, :invalid}

  def schedule(attrs, _opts) when is_map(attrs) do
    ensure_started()
    a = stringify(attrs)
    kind = to_string(a["kind"] || "watch_re_eval")

    if kind in @kinds do
      due_at = a["due_at"] || a["scheduled_for"]
      plan_id = a["plan_id"] || a["commitment_id"] || a["conversation_id"]
      plan_version = a["plan_version"] || 0
      do_schedule(a, kind, plan_id, plan_version, due_at)
    else
      {:error, :unknown_kind}
    end
  end

  def schedule(_, _), do: {:error, :invalid}

  defp do_schedule(_a, _kind, nil, _pv, _due_at), do: {:error, :invalid}

  defp do_schedule(_a, _kind, _plan_id, _pv, due_at) when not is_struct(due_at, DateTime),
    do: {:error, :invalid}

  defp do_schedule(a, kind, plan_id, plan_version, due_at) do
    fp = fingerprint(plan_id, kind, due_at, plan_version)
    id = a["work_id"] || "dw_" <> binary_part(fp, 0, 12)

    rec = %{
      "work_id" => id,
      "fingerprint" => fp,
      "kind" => kind,
      "plan_id" => plan_id,
      "conversation_id" => a["conversation_id"],
      "plan_version" => plan_version,
      "due_at" => due_at,
      "state" => "scheduled",
      "idempotent" => true,
      "global_periodic_scan" => false,
      "workflow_platform" => false
    }

    Agent.get_and_update(__MODULE__, fn state ->
      existing =
        Enum.find(Map.values(state), fn r ->
          r["fingerprint"] == fp and r["state"] not in ~w(cancelled suppressed)
        end)

      if existing do
        {Map.put(existing, "idempotent_hit", true), state}
      else
        {rec, Map.put(state, id, rec)}
      end
    end)
    |> then(&{:ok, &1})
  end

  @doc """
  Fire due work at `now`. Returns list of fire results (run | suppress).
  Idempotent: already fired fingerprint stays fired.
  """
  def fire_due(plan_ctx, opts \\ [])

  def fire_due(plan_ctx, opts) when is_map(plan_ctx) do
    ensure_started()
    p = stringify(plan_ctx)
    now = Keyword.get(opts, :now) || p["now"] || DateTime.utc_now()
    plan_id = p["plan_id"] || p["commitment_id"] || p["conversation_id"]
    active_v = p["plan_version"] || p["active_plan_version"]

    ensure_started()

    results =
      Agent.get_and_update(__MODULE__, fn state ->
        {state2, outs} =
          Enum.reduce(state, {state, []}, fn {id, rec}, {acc, list} ->
            if rec["plan_id"] == plan_id and rec["state"] == "scheduled" and
                 due?(rec["due_at"], now) do
              {outcome, updated} = evaluate_fire(rec, p, active_v, now)
              {Map.put(acc, id, updated), [outcome | list]}
            else
              {acc, list}
            end
          end)

        {Enum.reverse(outs), state2}
      end)

    {:ok,
     %{
       "fires" => results,
       "visible_count" => 0,
       "idempotent" => true,
       "plan_version_gated" => true
     }}
  end

  def fire_due(_, _), do: {:error, :invalid}

  @doc "Cancel all due work for a plan (cancel / supersede)."
  def cancel_for_plan(plan_id) when is_binary(plan_id) do
    ensure_started()

    Agent.get_and_update(__MODULE__, fn state ->
      {state2, cancelled} =
        Enum.reduce(state, {%{}, []}, fn {id, rec}, {acc, list} ->
          if rec["plan_id"] == plan_id and rec["state"] not in ~w(fired cancelled) do
            c = Map.merge(rec, %{"state" => "cancelled", "notify" => false})
            {Map.put(acc, id, c), [c | list]}
          else
            {Map.put(acc, id, rec), list}
          end
        end)

      {{:ok, cancelled}, state2}
    end)
  end

  def cancel_for_plan(_), do: {:error, :invalid}

  @doc """
  Suggest due-work schedule from plan awareness — lifecycle moments, not polling.
  """
  def suggest_schedule(awareness, plan_attrs) when is_map(awareness) and is_map(plan_attrs) do
    aw = stringify(awareness)
    a = stringify(plan_attrs)
    start = a["when"] || a["plan_start"]
    plan_id = a["plan_id"] || a["commitment_id"] || a["conversation_id"] || "plan"
    pv = a["plan_version"] || 0
    req = aw["requirements"] || %{}

    hints =
      []
      |> maybe_hint(
        start,
        -2 * 24 * 60,
        "prepare_booking_context",
        req["reservation_needed"] == true
      )
      |> maybe_hint(start, -6 * 60, "prepare_leave_by", req["reminder_useful"] != false)
      |> maybe_hint(start, -45, "leave_reminder", req["reminder_useful"] != false)
      |> maybe_hint(start, -30, "departure_check", req["navigation_useful"] != false)
      |> maybe_deadline_hint(a, pv)

    Enum.map(hints, fn h ->
      Map.merge(h, %{
        "plan_id" => plan_id,
        "conversation_id" => a["conversation_id"],
        "plan_version" => pv
      })
    end)
  end

  def suggest_schedule(_, _), do: []

  def snapshot do
    ensure_started()
    Agent.get(__MODULE__, &Map.values/1)
  end

  defp evaluate_fire(rec, plan, active_v, now) do
    cond do
      plan["cancelled"] == true or plan["superseded"] == true ->
        u =
          Map.merge(rec, %{
            "state" => "suppressed",
            "reason" => "plan_terminal",
            "fired_at" => now
          })

        {fire_out(u, "suppress", "plan_terminal"), u}

      not PlanVersion.accept_response?(
        %{"plan_version" => active_v},
        %{"plan_version" => rec["plan_version"]}
      ) ->
        u =
          Map.merge(rec, %{
            "state" => "suppressed",
            "reason" => "plan_version_mismatch",
            "fired_at" => now
          })

        {fire_out(u, "suppress", "plan_version_mismatch"), u}

      rec["state"] == "fired" ->
        {fire_out(rec, "suppress", "already_fired"), rec}

      true ->
        u =
          Map.merge(rec, %{
            "state" => "fired",
            "fired_at" => now,
            "private_re_eval" => true,
            "auto_surface" => false
          })

        {fire_out(u, "run", "due"), u}
    end
  end

  defp fire_out(rec, outcome, reason) do
    %{
      "work_id" => rec["work_id"],
      "kind" => rec["kind"],
      "outcome" => outcome,
      "reason" => reason,
      "surface" => false,
      "notify" => false,
      "plan_version" => rec["plan_version"]
    }
  end

  defp due?(%DateTime{} = due, %DateTime{} = now), do: DateTime.compare(due, now) != :gt
  defp due?(_, _), do: false

  defp maybe_hint(list, %DateTime{} = start, offset_min, kind, true) do
    [
      %{
        "kind" => kind,
        "due_at" => DateTime.add(start, trunc(offset_min * 60), :second)
      }
      | list
    ]
  end

  defp maybe_hint(list, _, _, _, _), do: list

  defp maybe_deadline_hint(hints, a, _pv) do
    case a["booking_deadline_at"] || a["ticket_expiry_at"] do
      %DateTime{} = dt ->
        [
          %{
            "kind" => "ticket_deadline",
            "due_at" => DateTime.add(dt, -60 * 60, :second)
          }
          | hints
        ]

      _ ->
        hints
    end
  end

  defp fingerprint(plan_id, kind, %DateTime{} = due, pv) do
    material = [plan_id, kind, DateTime.to_iso8601(due), to_string(pv)]

    :crypto.hash(:sha256, Enum.join(material, "|"))
    |> Base.encode16(case: :lower)
  end

  defp fingerprint(_, _, _, _), do: "invalid"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

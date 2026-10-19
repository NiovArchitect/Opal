defmodule OpalCore.SocialFlow.CheckinSuggestion do
  @moduledoc """
  Repair #18 B3, Act 2 - Opal PROACTIVELY SUGGESTS a circle check-in
  sweep to an organizer. This is proactive contact by Opal and takes
  the FULL existing gate stack (design section 3.3). NO gate is
  weakened, reimplemented, or bypassed here: if any gate blocks, the
  suggestion simply does not fire, and the suppression reason is the
  gate's own reason.

  Gate stack, in code order:
  1. `ProactiveConversation.threads_enabled?/1` - the organizer's
     explicit opt-in (default FALSE for every account).
  2. Opt-out wins: `ProactiveConversation.opted_out?/1`, and again
     inside `maybe_initiate/5`.
  3. Trigger lawfully registered: "checkin_sweep" is in
     ProactiveConversation's closed @allowed_triggers list.
  4. Dismissal permanence (ProfileGap skip law): a circle whose
     suggestion was dismissed never suggests again, ever.
  5. Once per circle per 7 days (ProactiveThreadLog), and no sweep
     for the same circle inside the sweep quiet window (an open
     sweep, or one closed < 24h ago).
  6. Minor-majority suppression for family-shaped circles (5.4).
  7. `ProactiveConversation.maybe_initiate/5` UNMODIFIED: opt-out,
     7-day activity, quiet hours 08:00-22:00 organizer-local, the
     1-per-day proactive cap across ALL triggers, and
     AttentionBudget.request_slot with provenance "observed" (a real
     plan event - never inferred, which the budget denies by design).

  Lawful producers in v1 (design 3.3): S1 - a SharedPlan matching a
  circle changed to virtual or was cancelled, fired from the
  persisted plan path (PlanCompletion.drive step h). S2 - the
  organizer opens the circle surface: an in-context suggestion from
  `surface_suggestion/2`, which runs gates 1, 2, 4, 5, 6 plus the
  quiet-hours window, but opens no thread, writes no log, and takes
  no AttentionBudget slot (nothing was pushed at the user).
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.ProactiveConversation
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{Checkin, CheckinSweep, Clock, SharedPlan}
  alias OpalCore.SocialMemory.ProactiveThreadLog

  @trigger "checkin_sweep"
  @once_per_circle_days 7

  def trigger, do: @trigger

  # =====================================================================
  # S1 - outbound suggestion through the full gate stack
  # =====================================================================

  @doc """
  Attempt the outbound suggestion for `source` (same source map shape
  as Checkin.create_sweep/3). `signal` is the observed event that
  justifies reaching out; v1 accepts only `:plan_virtual` and
  `:plan_cancelled`. Extra opts pass through to maybe_initiate/5
  (e.g. the `local_hour` test seam).

  Returns `{:ok, result}` from maybe_initiate/5, or
  `{:suppressed, reason}` naming the exact gate that stopped it.
  """
  def maybe_suggest(organizer_id, source, signal, opts \\ [])

  def maybe_suggest(organizer_id, source, signal, opts)
      when is_binary(organizer_id) and is_map(source) and
             signal in [:plan_virtual, :plan_cancelled] do
    with {:ok, circle_key} <- Checkin.circle_key_for(organizer_id, source),
         :ok <- gate_opt_in(organizer_id),
         :ok <- gate_not_dismissed(organizer_id, circle_key),
         :ok <- gate_no_recent_sweep(organizer_id, circle_key),
         :ok <- gate_once_per_circle(organizer_id, circle_key),
         :ok <- gate_minor_majority(organizer_id, source) do
      change_copy =
        if signal == :plan_cancelled,
          do: "the plan was cancelled.",
          else: "the gathering moved online."

      reason =
        "A plan with this circle just changed - " <>
          change_copy <>
          " Want me to check in with everyone? One tap: Check in with everyone."

      ProactiveConversation.maybe_initiate(
        organizer_id,
        @trigger,
        ref_uuid(circle_key),
        reason,
        Keyword.merge(opts, provenance: "observed")
      )
    else
      {:error, reason} -> {:suppressed, reason}
      {:suppressed, reason} -> {:suppressed, reason}
    end
  end

  def maybe_suggest(_, _, _, _), do: {:suppressed, :invalid_signal}

  @doc """
  S1 entry from a persisted plan change: the plan's own participant
  circle is the sweep circle. Fired beside PlanCompletion's proactive
  anchor step; a plan with no participants resolves to the plan's
  conversation via the same source the sweep itself would use.
  """
  def maybe_suggest_for_plan(%SharedPlan{} = plan, signal) do
    organizer_id = plan.created_by_user_id

    if is_binary(organizer_id) do
      source = %{"kind" => "plan", "ref_id" => plan.id}
      maybe_suggest(organizer_id, source, signal)
    else
      {:suppressed, :no_organizer}
    end
  rescue
    e ->
      Logger.warning("checkin_suggestion.plan_failed plan=#{plan.id}: #{Exception.message(e)}")
      {:suppressed, :error}
  end

  def maybe_suggest_for_plan(_, _), do: {:suppressed, :invalid}

  # =====================================================================
  # S2 - in-context suggestion on the circle surface
  # =====================================================================

  @doc """
  The in-context suggestion for the circle surface, or nil. Runs the
  consent and quiet gates (see the moduledoc); opens nothing, writes
  nothing. Dismissal is recorded through dismiss/2 and is permanent
  for the circle (ProfileGap skip law).
  """
  def surface_suggestion(organizer_id, source) when is_binary(organizer_id) and is_map(source) do
    with {:ok, circle_key} <- Checkin.circle_key_for(organizer_id, source),
         :ok <- gate_opt_in(organizer_id),
         :ok <- gate_not_opted_out(organizer_id),
         :ok <- gate_not_dismissed(organizer_id, circle_key),
         :ok <- gate_no_recent_sweep(organizer_id, circle_key),
         :ok <- gate_once_per_circle(organizer_id, circle_key),
         :ok <- gate_minor_majority(organizer_id, source),
         :ok <- gate_quiet_hours_now(organizer_id) do
      %{
        "kind" => "checkin_sweep",
        "circle_key" => circle_key,
        "copy" =>
          "Plans changed for this circle recently. You can ask Opal to check in with everyone - answers come back to you privately.",
        "action_label" => "Check in with everyone",
        "dismissible" => true
      }
    else
      _ -> nil
    end
  end

  def surface_suggestion(_, _), do: nil

  @doc """
  Record a dismissal: a ProactiveThreadLog row with owner_response
  "dismissed" (design 3.3 - no new table for dismissals). Permanent:
  gate_not_dismissed reads this ledger and never suggests again for
  the circle.
  """
  def dismiss(organizer_id, source) when is_binary(organizer_id) and is_map(source) do
    with {:ok, circle_key} <- Checkin.circle_key_for(organizer_id, source) do
      if dismissed?(organizer_id, circle_key) do
        {:ok, :already_dismissed}
      else
        %ProactiveThreadLog{}
        |> ProactiveThreadLog.changeset(%{
          account_id: organizer_id,
          trigger_type: @trigger,
          trigger_ref_id: ref_uuid(circle_key),
          opened_at: Clock.utc_now(),
          owner_response: "dismissed",
          conversation_id: nil
        })
        |> Repo.insert()
        |> case do
          {:ok, _} -> {:ok, :dismissed}
          {:error, cs} -> {:error, cs}
        end
      end
    end
  end

  def dismiss(_, _), do: {:error, :invalid}

  # =====================================================================
  # Gates (each returns :ok or {:suppressed, reason})
  # =====================================================================

  defp gate_opt_in(organizer_id) do
    if ProactiveConversation.threads_enabled?(organizer_id) do
      :ok
    else
      {:suppressed, :proactive_threads_not_enabled}
    end
  end

  defp gate_not_opted_out(organizer_id) do
    if ProactiveConversation.opted_out?(organizer_id) do
      {:suppressed, :opt_out}
    else
      :ok
    end
  end

  defp gate_not_dismissed(organizer_id, circle_key) do
    if dismissed?(organizer_id, circle_key) do
      {:suppressed, :dismissed}
    else
      :ok
    end
  end

  defp dismissed?(organizer_id, circle_key) do
    ref = ref_uuid(circle_key)

    from(l in ProactiveThreadLog,
      where:
        l.account_id == ^organizer_id and l.trigger_type == @trigger and
          l.trigger_ref_id == ^ref and l.owner_response == "dismissed",
      limit: 1
    )
    |> Repo.exists?()
  end

  defp gate_once_per_circle(organizer_id, circle_key) do
    ref = ref_uuid(circle_key)
    since = DateTime.add(Clock.utc_now(), -@once_per_circle_days * 86_400, :second)

    recent =
      from(l in ProactiveThreadLog,
        where:
          l.account_id == ^organizer_id and l.trigger_type == @trigger and
            l.trigger_ref_id == ^ref and is_nil(l.owner_response) and l.opened_at >= ^since,
        limit: 1
      )
      |> Repo.exists?()

    if recent, do: {:suppressed, :already_suggested_recently}, else: :ok
  end

  defp gate_no_recent_sweep(organizer_id, circle_key) do
    cond do
      Checkin.open_sweep_for(organizer_id, circle_key) != nil ->
        {:suppressed, :sweep_already_open}

      Checkin.next_sweep_allowed_at(organizer_id, circle_key) != nil ->
        {:suppressed, :sweep_quiet_window}

      true ->
        :ok
    end
  end

  # Section 5.4: a family-shaped circle that is majority-minor is
  # never suggested - a sweep is neither time_critical nor mediation,
  # the only categories Behavior allows toward minors.
  defp gate_minor_majority(organizer_id, source) do
    case Checkin.resolved_member_ids(organizer_id, source) do
      {:ok, askable, minors} ->
        total = length(askable) + length(minors)
        if total > 0 and length(minors) * 2 > total, do: {:suppressed, :minor_majority}, else: :ok

      _ ->
        :ok
    end
  end

  # Repair #19 FIX-A (BS-04) — the surface gate asks the ONE
  # quiet-hours resolver for the organizer's stored Soul window.
  # The old local copy hardcoded an 8–22 awake window in
  # America/Los_Angeles and is retired.
  defp gate_quiet_hours_now(organizer_id) do
    if OpalCore.SocialFlow.QuietHours.quiet_now?(organizer_id) do
      {:suppressed, :quiet_hours}
    else
      :ok
    end
  end

  # ProactiveThreadLog.trigger_ref_id is a binary_id; the circle key
  # is a string. Derive a deterministic UUID from the key so the same
  # circle always maps to the same ref (dedupe depends on it).
  defp ref_uuid(circle_key) do
    <<a::binary-size(4), b::binary-size(2), c::binary-size(2), d::binary-size(2),
      e::binary-size(6), _::binary>> = :crypto.hash(:sha256, "checkin:" <> circle_key)

    hex = Base.encode16(a <> b <> c <> d <> e, case: :lower)

    <<p1::binary-size(8), p2::binary-size(4), p3::binary-size(4), p4::binary-size(4),
      p5::binary-size(12)>> = hex

    "#{p1}-#{p2}-4#{String.slice(p3, 1, 3)}-a#{String.slice(p4, 1, 3)}-#{p5}"
  end

  # Sweep rows exist for the once-per-circle read in tests/debugging.
  @doc false
  def recent_sweep?(organizer_id, circle_key) do
    Repo.exists?(
      from(s in CheckinSweep,
        where: s.organizer_user_id == ^organizer_id and s.circle_key == ^circle_key
      )
    )
  end
end

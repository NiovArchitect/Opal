defmodule OpalCore.SocialFlow.RealWorld.CalendarSufficiency do
  @moduledoc """
  Fuse schedule facts into AvailabilitySufficiency.

  Core path (always): native Opal Calendar commitments.
  Optional: external free/busy when connected — never required.
  Free ≠ willing.
  """

  alias OpalCore.SocialFlow.AvailabilitySufficiency
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.OpalCalendar.ScheduleKnowledge
  alias OpalCore.SocialFlow.RealWorld.Calendar.Connector
  alias OpalCore.SocialFlow.RealWorld.Cognition.Willingness
  alias OpalCore.SocialFlow.RealWorld.Cognition.ZeroRedundancy

  @doc "Enrich intervention facts with native + optional external schedule."
  def enrich_facts(user_id, base_facts, opts \\ [])
      when is_binary(user_id) and is_map(base_facts) do
    candidate_start = Keyword.get(opts, :candidate_start)
    candidate_end = Keyword.get(opts, :candidate_end)
    willingness = Keyword.get(opts, :willingness)
    exclude_conversation_id = Keyword.get(opts, :exclude_conversation_id)

    {opal_busy?, opal_blocks} =
      opal_busy_state(user_id, candidate_start, candidate_end, exclude_conversation_id)

    external = optional_external(user_id, candidate_start, candidate_end)

    free_for_candidate =
      free_for_candidate?(opal_busy?, external, base_facts)

    has_fresh = has_fresh_capacity?(free_for_candidate, base_facts, opal_busy?, external)

    will = willingness_readiness(willingness, free_for_candidate, base_facts)

    facts =
      base_facts
      |> Map.merge(%{has_fresh_windows: has_fresh})
      |> Map.put(:calendar_free_for_candidate, free_for_candidate)
      |> Map.put(:opal_calendar_busy, opal_busy?)
      |> Map.put(:calendar_status, schedule_status(opal_busy?, external))
      |> maybe_block_unwilling(will)

    decision =
      facts
      |> AvailabilitySufficiency.resolve()
      |> adjust_decision(opal_busy?, free_for_candidate, opts)

    ask_time? = should_ask_time?(opal_busy?, free_for_candidate, facts)

    conflict =
      conflict_guidance(
        opal_busy?,
        user_id,
        candidate_start,
        candidate_end,
        exclude_conversation_id
      )

    %{
      facts: facts,
      decision: decision,
      calendar: %{
        calendar_granted: external[:calendar_granted] == true or opal_busy? or free_for_candidate,
        calendar_free_for_candidate: free_for_candidate,
        calendar_status: schedule_status(opal_busy?, external),
        opal_busy: opal_busy?,
        external_status: external[:calendar_status],
        has_fresh_windows: has_fresh
      },
      willingness: will,
      should_ask_time: ask_time?,
      step_eliminated: step_eliminated(opal_busy?, free_for_candidate),
      conflict: conflict,
      busy_blocks: ScheduleKnowledge.merge_busy(opal_blocks ++ List.wrap(external[:busy_blocks])),
      google_required: false
    }
  end

  defp opal_busy_state(user_id, %DateTime{} = s, %DateTime{} = e, exclude) do
    blocks =
      user_id
      |> OpalCalendar.busy_blocks_for_user(%{start_at: s, end_at: e})
      |> Enum.reject(fn b -> exclude && b["conversation_id"] == exclude end)

    busy? =
      Enum.any?(blocks, fn b -> overlaps?(b["start_at"], b["end_at"], s, e) end)

    {busy?, blocks}
  end

  defp opal_busy_state(_, _, _, _), do: {false, []}

  defp free_for_candidate?(true, _external, _base), do: false

  defp free_for_candidate?(false, external, base_facts) do
    case external[:calendar_status] do
      :free ->
        true

      :busy ->
        false

      _ ->
        truthy?(base_facts[:has_fresh_windows]) or truthy?(base_facts[:shared_overlap_found])
    end
  end

  defp has_fresh_capacity?(free_for_candidate, base_facts, opal_busy?, external) do
    free_for_candidate or truthy?(base_facts[:has_fresh_windows]) or
      (not opal_busy? and external[:calendar_free_for_candidate] == true)
  end

  defp willingness_readiness(nil, _, _), do: nil

  defp willingness_readiness(willingness, free_for_candidate, base_facts) do
    Willingness.readiness(%{
      free: free_for_candidate or truthy?(base_facts[:has_fresh_windows]),
      willingness: willingness
    })
  end

  defp maybe_block_unwilling(facts, %{"reason" => "free_but_unwilling"}),
    do: Map.put(facts, :blocked, true)

  defp maybe_block_unwilling(facts, _), do: facts

  defp adjust_decision(decision, true, _free, opts) do
    if decision == :enough_to_compute and not Keyword.get(opts, :allow_despite_opal_busy, false) do
      :no_useful_intervention
    else
      decision
    end
  end

  defp adjust_decision(:needs_input, _opal_busy, true, _opts), do: :needs_permission
  defp adjust_decision(decision, _, _, _), do: decision

  defp should_ask_time?(true, _, _), do: false

  defp should_ask_time?(false, free_for_candidate, facts) do
    ZeroRedundancy.should_ask?(:time_availability, %{
      calendar_free_for_candidate: free_for_candidate,
      has_fresh_windows: facts[:has_fresh_windows],
      shared_overlap_found: facts[:shared_overlap_found]
    })
  end

  defp conflict_guidance(true, user_id, %DateTime{} = s, e, exclude) do
    OpalCalendar.private_conflict_guidance(user_id, s, e, exclude_conversation_id: exclude)
  end

  defp conflict_guidance(_, _, _, _, _), do: nil

  defp step_eliminated(true, _), do: "calendar_comparison_across_opal_plans"
  defp step_eliminated(false, true), do: "manual_calendar_check"
  defp step_eliminated(_, _), do: nil

  defp optional_external(user_id, candidate_start, candidate_end) do
    if external_calendar_enabled?() do
      fetch_external(user_id, candidate_start, candidate_end)
    else
      %{calendar_granted: false, calendar_status: :not_connected}
    end
  end

  defp fetch_external(user_id, candidate_start, candidate_end) do
    case Connector.calendar_permission(user_id) do
      {:ok, %{"granted" => true}} ->
        external_freebusy(user_id, candidate_start, candidate_end)

      {:ok, _} ->
        %{calendar_granted: false, calendar_status: :not_connected}

      {:error, _} ->
        %{calendar_granted: false, calendar_status: :unavailable}
    end
  end

  defp external_freebusy(user_id, %DateTime{} = s, %DateTime{} = e) do
    case Connector.free_busy(user_id, %{start_at: s, end_at: e}) do
      {:ok, busy} ->
        free? = Connector.free_during?(busy, s, e)

        %{
          calendar_granted: true,
          calendar_free_for_candidate: free?,
          calendar_status: if(free?, do: :free, else: :busy),
          busy_blocks: Enum.map(busy, &Map.put(&1, "source", "calendar_free_busy"))
        }

      {:error, :permission_denied} ->
        %{calendar_granted: false, calendar_status: :denied}

      {:error, _} ->
        %{calendar_granted: true, calendar_status: :unavailable}
    end
  end

  defp external_freebusy(_, _, _), do: %{calendar_granted: true, calendar_status: :no_candidate}

  defp external_calendar_enabled? do
    Application.get_env(:opal_core, :external_calendar_enabled, true)
  end

  defp schedule_status(true, _), do: :opal_busy
  defp schedule_status(false, ext), do: ext[:calendar_status] || :no_external

  defp overlaps?(s1, e1, s2, e2) do
    DateTime.compare(e1, s2) == :gt and DateTime.compare(e2, s1) == :gt
  end

  defp truthy?(true), do: true
  defp truthy?(_), do: false
end

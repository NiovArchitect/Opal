defmodule OpalCore.SocialFlow.RealWorld.CalendarSufficiency do
  @moduledoc """
  Fuse schedule facts into AvailabilitySufficiency.

  Core path (always):
  - Native Opal Calendar commitments as high-confidence busy

  Optional (never required):
  - External free/busy (Google/etc.) when connected

  Free ≠ willing. Opal commitment = busy for that owner, not social willingness.
  """

  alias OpalCore.SocialFlow.AvailabilitySufficiency
  alias OpalCore.SocialFlow.OpalCalendar
  alias OpalCore.SocialFlow.OpalCalendar.ScheduleKnowledge
  alias OpalCore.SocialFlow.RealWorld.Calendar.Connector
  alias OpalCore.SocialFlow.RealWorld.Cognition.Willingness
  alias OpalCore.SocialFlow.RealWorld.Cognition.ZeroRedundancy

  @doc """
  Enrich intervention facts with native + optional external schedule.

  Google is never required. Native Opal busy is always consulted.
  """
  def enrich_facts(user_id, base_facts, opts \\ [])
      when is_binary(user_id) and is_map(base_facts) do
    candidate_start = Keyword.get(opts, :candidate_start)
    candidate_end = Keyword.get(opts, :candidate_end)
    willingness = Keyword.get(opts, :willingness)
    exclude_conversation_id = Keyword.get(opts, :exclude_conversation_id)

    {opal_busy?, opal_blocks} =
      case {candidate_start, candidate_end} do
        {%DateTime{} = s, %DateTime{} = e} ->
          blocks =
            OpalCalendar.busy_blocks_for_user(user_id, %{start_at: s, end_at: e})
            |> Enum.reject(fn b ->
              exclude_conversation_id && b["conversation_id"] == exclude_conversation_id
            end)

          busy? =
            Enum.any?(blocks, fn b ->
              overlaps?(b["start_at"], b["end_at"], s, e)
            end)

          {busy?, blocks}

        _ ->
          {false, []}
      end

    external = optional_external(user_id, candidate_start, candidate_end)

    # Combined free: not busy on Opal AND (external free if available, else ignore external)
    free_for_candidate =
      cond do
        opal_busy? ->
          false

        external[:calendar_status] == :free ->
          true

        external[:calendar_status] == :busy ->
          false

        # No external calendar: do not invent free from empty Opal calendar alone
        # Empty Opal = no known Opal commitment, not "free/willing"
        truthy?(base_facts[:has_fresh_windows]) or truthy?(base_facts[:shared_overlap_found]) ->
          true

        external[:calendar_status] in [:not_connected, :denied, :unavailable, :no_candidate, nil] ->
          # Without manual windows, empty Opal calendar does not grant free capacity
          false

        true ->
          false
      end

    # has_fresh_windows: treat known free capacity for intervention cascade
    has_fresh =
      free_for_candidate or truthy?(base_facts[:has_fresh_windows]) or
        (not opal_busy? and external[:calendar_free_for_candidate] == true)

    will =
      if willingness do
        Willingness.readiness(%{
          free: free_for_candidate or truthy?(base_facts[:has_fresh_windows]),
          willingness: willingness
        })
      else
        nil
      end

    facts =
      base_facts
      |> Map.merge(%{has_fresh_windows: has_fresh})
      |> Map.put(:calendar_free_for_candidate, free_for_candidate)
      |> Map.put(:opal_calendar_busy, opal_busy?)
      |> Map.put(:calendar_status, schedule_status(opal_busy?, external))

    # Unwilling even if free → no useful social proposal
    facts =
      if will && will["reason"] == "free_but_unwilling" do
        Map.put(facts, :blocked, true)
      else
        facts
      end

    decision = AvailabilitySufficiency.resolve(facts)

    decision =
      cond do
        opal_busy? and not Keyword.get(opts, :allow_despite_opal_busy, false) ->
          # Conflicting Opal commitment — do not pretend enough_to_compute for new plan
          if decision == :enough_to_compute, do: :no_useful_intervention, else: decision

        free_for_candidate and decision == :needs_input ->
          :needs_permission

        true ->
          decision
      end

    ask_time? =
      ZeroRedundancy.should_ask?(:time_availability, %{
        calendar_free_for_candidate: free_for_candidate,
        has_fresh_windows: facts[:has_fresh_windows],
        shared_overlap_found: facts[:shared_overlap_found]
      })

    # Opal busy eliminates "when free?" with conflict guidance instead
    ask_time? = if opal_busy?, do: false, else: ask_time?

    conflict =
      if opal_busy? and match?(%DateTime{}, candidate_start) do
        OpalCalendar.private_conflict_guidance(
          user_id,
          candidate_start,
          candidate_end,
          exclude_conversation_id: exclude_conversation_id
        )
      else
        nil
      end

    merged_busy =
      ScheduleKnowledge.merge_busy(opal_blocks ++ List.wrap(external[:busy_blocks]))

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
      step_eliminated:
        cond do
          opal_busy? -> "calendar_comparison_across_opal_plans"
          free_for_candidate -> "manual_calendar_check"
          true -> nil
        end,
      conflict: conflict,
      busy_blocks: merged_busy,
      google_required: false
    }
  end

  defp optional_external(user_id, candidate_start, candidate_end) do
    # External provider is optional — never block core path
    unless external_calendar_enabled?() do
      %{calendar_granted: false, calendar_status: :not_connected}
    else
      case Connector.calendar_permission(user_id) do
        {:ok, %{"granted" => true}} ->
          case {candidate_start, candidate_end} do
            {%DateTime{} = s, %DateTime{} = e} ->
              case Connector.free_busy(user_id, %{start_at: s, end_at: e}) do
                {:ok, busy} ->
                  free? = Connector.free_during?(busy, s, e)

                  %{
                    calendar_granted: true,
                    calendar_free_for_candidate: free?,
                    calendar_status: if(free?, do: :free, else: :busy),
                    busy_blocks:
                      Enum.map(busy, fn b ->
                        Map.put(b, "source", "calendar_free_busy")
                      end)
                  }

                {:error, :permission_denied} ->
                  %{calendar_granted: false, calendar_status: :denied}

                {:error, _} ->
                  %{calendar_granted: true, calendar_status: :unavailable}
              end

            _ ->
              %{calendar_granted: true, calendar_status: :no_candidate}
          end

        {:ok, _} ->
          %{calendar_granted: false, calendar_status: :not_connected}

        {:error, _} ->
          %{calendar_granted: false, calendar_status: :unavailable}
      end
    end
  end

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

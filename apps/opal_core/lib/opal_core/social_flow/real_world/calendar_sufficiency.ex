defmodule OpalCore.SocialFlow.RealWorld.CalendarSufficiency do
  @moduledoc """
  Fuse calendar free/busy into the existing sufficiency cascade.

  Step eliminated: manual calendar checking / "When are you free?"

  Fallbacks:
  - calendar unavailable → manual windows
  - stale → needs_confirmation
  - access denied → manual Availability still works
  """

  alias OpalCore.SocialFlow.AvailabilitySufficiency
  alias OpalCore.SocialFlow.RealWorld.Calendar.Connector
  alias OpalCore.SocialFlow.RealWorld.Cognition.Willingness
  alias OpalCore.SocialFlow.RealWorld.Cognition.ZeroRedundancy

  @doc """
  Enrich intervention facts with calendar free/busy for a candidate window.

  `base_facts` are the same keys AvailabilitySufficiency expects.
  """
  def enrich_facts(user_id, base_facts, opts \\ [])
      when is_binary(user_id) and is_map(base_facts) do
    candidate_start = Keyword.get(opts, :candidate_start)
    candidate_end = Keyword.get(opts, :candidate_end)
    willingness = Keyword.get(opts, :willingness)

    cal =
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
                    # Treat free calendar as fresh private capacity without manual windows
                    has_fresh_windows: free? or truthy?(base_facts[:has_fresh_windows])
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

    will =
      if willingness do
        Willingness.readiness(%{
          free: cal[:calendar_free_for_candidate] || base_facts[:has_fresh_windows],
          willingness: willingness
        })
      else
        nil
      end

    facts =
      base_facts
      |> Map.merge(%{
        has_fresh_windows:
          Map.get(cal, :has_fresh_windows, base_facts[:has_fresh_windows] || false)
      })
      |> Map.put(:calendar_free_for_candidate, cal[:calendar_free_for_candidate] == true)
      |> Map.put(:calendar_status, cal[:calendar_status])

    # Unwilling even if free → no useful social proposal
    facts =
      if will && will["reason"] == "free_but_unwilling" do
        Map.put(facts, :blocked, true)
      else
        facts
      end

    decision = AvailabilitySufficiency.resolve(facts)

    # Zero redundancy: if calendar says free for candidate, prefer permission over input
    decision =
      if cal[:calendar_free_for_candidate] == true and decision == :needs_input do
        :needs_permission
      else
        decision
      end

    ask_time? =
      ZeroRedundancy.should_ask?(:time_availability, %{
        calendar_free_for_candidate: cal[:calendar_free_for_candidate],
        has_fresh_windows: facts[:has_fresh_windows],
        shared_overlap_found: facts[:shared_overlap_found]
      })

    %{
      facts: facts,
      decision: decision,
      calendar: cal,
      willingness: will,
      should_ask_time: ask_time?,
      step_eliminated:
        if(cal[:calendar_free_for_candidate] == true,
          do: "manual_calendar_check",
          else: nil
        )
    }
  end

  defp truthy?(true), do: true
  defp truthy?(_), do: false
end

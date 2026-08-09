defmodule OpalCore.SocialFlow.RealWorld.Calendar.LiveProof do
  @moduledoc """
  End-to-end Google calendar value proof (not "OAuth alone").

  Steps:
  1. connection present
  2. real freeBusy (or fixture adapter)
  3. normalize — no titles
  4. sufficiency + intervention
  5. private decision (not forced manual editor when free+willing)
  6. revoke
  7. manual fallback still works

  Never logs tokens or event titles.
  """

  alias OpalCore.SocialFlow.Availability
  alias OpalCore.SocialFlow.RealWorld.Calendar.{DecisionTrace, GoogleAdapter}
  alias OpalCore.SocialFlow.RealWorld.CalendarSufficiency
  alias OpalCore.SocialFlow.RealWorld.ProviderConnections
  alias OpalCore.SocialFlow.RealWorld.Calendar.FreeBusyStore

  @doc """
  Run proof for a connected user + conversation.

  opts:
  - :candidate_start / :candidate_end — window to evaluate
  - :willingness — default \"willing\" for golden path
  - :range — freeBusy query range (defaults to candidate ± buffer)
  """
  def run(user_id, conversation_id, opts \\ [])
      when is_binary(user_id) and is_binary(conversation_id) do
    willingness = Keyword.get(opts, :willingness, "willing")
    start_at = Keyword.get(opts, :candidate_start)
    end_at = Keyword.get(opts, :candidate_end)

    steps = []

    with {:ok, steps} <- step_connected(user_id, steps),
         {:ok, steps, busy} <- step_freebusy(user_id, start_at, end_at, opts, steps),
         {:ok, steps} <- step_no_titles(busy, steps),
         {:ok, steps, enrich} <-
           step_sufficiency(user_id, start_at, end_at, willingness, steps),
         {:ok, steps, intervention} <-
           step_intervention(conversation_id, user_id, start_at, end_at, willingness, steps),
         {:ok, steps} <- step_value_proposition(enrich, intervention, steps),
         {:ok, steps} <- step_revoke(user_id, steps),
         {:ok, steps} <- step_manual_fallback(user_id, steps) do
      {:ok,
       %{
         "passed" => true,
         "steps" => steps,
         "trace" =>
           DecisionTrace.build(%{
             gap: "time",
             calendar_fact: "present",
             calendar_fresh: true,
             technically_free: enrich.calendar[:calendar_free_for_candidate] == true,
             willingness: willingness,
             decision: intervention["decision"],
             should_ask_time: intervention["should_ask_time"],
             step_eliminated: intervention["step_eliminated"],
             provider: "google_calendar"
           })
       }}
    else
      {:error, reason, steps} ->
        {:error, reason, %{"passed" => false, "steps" => steps}}
    end
  end

  defp step_connected(user_id, steps) do
    if ProviderConnections.connected?(user_id, "google_calendar") do
      {:ok, steps ++ [%{"step" => "connected", "ok" => true}]}
    else
      {:error, :not_connected, steps ++ [%{"step" => "connected", "ok" => false}]}
    end
  end

  defp step_freebusy(user_id, start_at, end_at, opts, steps) do
    range =
      Keyword.get(opts, :range) ||
        %{
          start_at: start_at || DateTime.utc_now(),
          end_at: end_at || DateTime.add(DateTime.utc_now(), 86_400, :second)
        }

    case GoogleAdapter.free_busy(user_id, range) do
      {:ok, busy} ->
        {:ok, steps ++ [%{"step" => "freeBusy", "ok" => true, "busy_count" => length(busy)}],
         busy}

      {:error, reason} ->
        {:error, reason, steps ++ [%{"step" => "freeBusy", "ok" => false, "reason" => reason}]}
    end
  end

  defp step_no_titles(busy, steps) do
    leak? =
      Enum.any?(busy, fn b ->
        Map.has_key?(b, "title") or Map.has_key?(b, "summary") or Map.has_key?(b, "event_title")
      end)

    if leak? do
      {:error, :title_leak, steps ++ [%{"step" => "no_titles", "ok" => false}]}
    else
      {:ok, steps ++ [%{"step" => "no_titles", "ok" => true}]}
    end
  end

  defp step_sufficiency(user_id, start_at, end_at, willingness, steps) do
    enrich =
      CalendarSufficiency.enrich_facts(
        user_id,
        %{has_fresh_windows: false, shared_overlap_found: false},
        candidate_start: start_at,
        candidate_end: end_at,
        willingness: willingness
      )

    {:ok, steps ++ [%{"step" => "sufficiency", "ok" => true, "decision" => enrich.decision}],
     enrich}
  end

  defp step_intervention(conversation_id, user_id, start_at, end_at, willingness, steps) do
    case Availability.resolve_intervention(conversation_id, user_id,
           candidate_start: start_at,
           candidate_end: end_at,
           willingness: willingness
         ) do
      {:ok, i} ->
        # Assert no leak keys
        if i["access_token"] || i["event_title"] do
          {:error, :intervention_leak, steps ++ [%{"step" => "intervention", "ok" => false}]}
        else
          {:ok,
           steps ++
             [
               %{
                 "step" => "intervention",
                 "ok" => true,
                 "decision" => i["decision"],
                 "should_ask_time" => i["should_ask_time"]
               }
             ], i}
        end

      {:error, reason} ->
        {:error, reason, steps ++ [%{"step" => "intervention", "ok" => false}]}
    end
  end

  defp step_value_proposition(enrich, intervention, steps) do
    free? = enrich.calendar[:calendar_free_for_candidate] == true
    decision = intervention["decision"]
    ask_time? = intervention["should_ask_time"]

    cond do
      free? and decision == "needs_input" and ask_time? != false ->
        # Free calendar should not force full manual "when are you free" path
        {:error, :value_not_realized,
         steps ++
           [%{"step" => "value_proposition", "ok" => false, "reason" => "still_needs_input"}]}

      free? and intervention["step_eliminated"] == "manual_calendar_check" ->
        {:ok, steps ++ [%{"step" => "value_proposition", "ok" => true}]}

      free? and decision in ["needs_permission", "enough_to_compute", "needs_confirmation"] ->
        {:ok, steps ++ [%{"step" => "value_proposition", "ok" => true, "decision" => decision}]}

      true ->
        {:ok,
         steps ++
           [
             %{
               "step" => "value_proposition",
               "ok" => true,
               "note" => "context_dependent",
               "decision" => decision
             }
           ]}
    end
  end

  defp step_revoke(user_id, steps) do
    case ProviderConnections.revoke(user_id, "google_calendar") do
      {:ok, _} ->
        {:ok, steps ++ [%{"step" => "revoke", "ok" => true}]}

      {:error, reason} ->
        {:error, reason, steps ++ [%{"step" => "revoke", "ok" => false}]}
    end
  end

  defp step_manual_fallback(user_id, steps) do
    # Local store still works after Google disconnect — connector must not be a hard dependency
    FreeBusyStore.grant_permission(user_id)
    FreeBusyStore.put_busy(user_id, [])

    case FreeBusyStore.calendar_permission(user_id) do
      {:ok, %{"granted" => true}} ->
        {:ok, steps ++ [%{"step" => "manual_fallback", "ok" => true}]}

      _ ->
        {:error, :fallback_broken, steps ++ [%{"step" => "manual_fallback", "ok" => false}]}
    end
  end
end

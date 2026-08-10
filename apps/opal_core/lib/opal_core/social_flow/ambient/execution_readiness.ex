defmodule OpalCore.SocialFlow.Ambient.ExecutionReadiness do
  @moduledoc """
  Social agreement ≠ provider readiness ≠ payment readiness.

  Set may exist socially while restaurant availability is unchecked.
  Surfaces "7:30 is open" / "Book it?" only when execution-ready.
  Stale slots suppress CTA without destroying social Set.
  """

  @states ~w(socially_aligned provider_checking execution_ready authorized_to_execute confirmed failed)

  def states, do: @states

  @doc """
  Assess execution readiness from social + provider facts.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)
    flags = flags(a)
    state = state_for(flags)
    may_book? = state == "execution_ready" and flags.slot_fresh? and flags.plan_ok?

    {:ok,
     %{
       "state" => state,
       "execution_ready" => state in ~w(execution_ready authorized_to_execute confirmed),
       "may_prompt_book" => may_book?,
       "stale_book_cta_suppressed" => a["slot_expired"] == true or not flags.plan_ok?,
       "social_truth_intact" => social_survives?(flags),
       "provider_is_not_authority" => true,
       "prerequisites" => %{
         "place" => flags.place?,
         "time" => flags.time?,
         "party" => flags.party?,
         "plan_version" => flags.plan_ok?,
         "slot_fresh" => flags.slot_fresh?
       },
       "authorizes_set" => false,
       "shared_safe_copy" => shared_copy(state, a)
     }}
  end

  def assess(_), do: {:ok, %{"state" => "socially_aligned", "execution_ready" => false}}

  defp flags(a) do
    %{
      set?: a["set"] == true or a["socially_aligned"] == true,
      provider_checked?: a["provider_checked"] == true,
      provider_open?: a["provider_available"] == true,
      provider_fail?: a["provider_failed"] == true,
      user_auth?: a["user_authorized"] == true,
      booked?: a["booked"] == true,
      slot_expired?: a["slot_expired"] == true,
      slot_fresh?: a["slot_expired"] != true and a["fresh_enough"] != false,
      plan_ok?: a["plan_version_ok"] != false,
      place?: a["place_selected"] != false,
      time?: a["time_known"] != false,
      party?: a["party_size"] != nil or a["party_known"] != false
    }
  end

  defp prereqs?(f), do: f.place? and f.time? and f.party? and f.plan_ok? and f.slot_fresh?

  defp state_for(f) do
    cond do
      f.booked? -> "confirmed"
      f.set? and (f.provider_fail? or f.slot_expired?) -> "failed"
      f.user_auth? and f.provider_open? and f.set? and prereqs?(f) -> "authorized_to_execute"
      f.provider_checked? and f.provider_open? and f.set? and prereqs?(f) -> "execution_ready"
      f.set? and not f.provider_checked? -> "provider_checking"
      true -> "socially_aligned"
    end
  end

  defp social_survives?(f) do
    f.set? and
      (f.provider_fail? or not f.provider_checked? or f.provider_open? or f.slot_expired?)
  end

  defp shared_copy("execution_ready", a) do
    slot = a["slot_label"] || "That time"
    "#{slot} is open."
  end

  defp shared_copy("authorized_to_execute", _), do: "Ready when you are."
  defp shared_copy("confirmed", _), do: "You're set."
  defp shared_copy("failed", _), do: nil
  defp shared_copy(_, _), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

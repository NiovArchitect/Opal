defmodule OpalCore.SocialFlow.Ambient.ExecutionReadiness do
  @moduledoc """
  Social agreement ≠ provider readiness ≠ payment readiness.

  Set may exist socially while restaurant availability is unchecked.
  Surfaces "7:30 is open" / "Book it?" only when execution-ready.
  """

  @states ~w(socially_aligned provider_checking execution_ready authorized_to_execute confirmed failed)

  def states, do: @states

  @doc """
  Assess execution readiness from social + provider facts.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)

    set? = a["set"] == true or a["socially_aligned"] == true
    provider_checked? = a["provider_checked"] == true
    provider_open? = a["provider_available"] == true
    provider_fail? = a["provider_failed"] == true
    user_auth? = a["user_authorized"] == true
    booked? = a["booked"] == true

    state =
      cond do
        booked? -> "confirmed"
        provider_fail? and set? -> "failed"
        user_auth? and provider_open? and set? -> "authorized_to_execute"
        provider_checked? and provider_open? and set? -> "execution_ready"
        set? and not provider_checked? -> "provider_checking"
        set? -> "socially_aligned"
        true -> "socially_aligned"
      end

    # Social truth survives provider failure
    social_survives? = set? and (provider_fail? or not provider_checked? or provider_open?)

    {:ok,
     %{
       "state" => state,
       "execution_ready" => state in ~w(execution_ready authorized_to_execute confirmed),
       "may_prompt_book" => state == "execution_ready",
       "social_truth_intact" => social_survives?,
       "provider_is_not_authority" => true,
       "authorizes_set" => false,
       "shared_safe_copy" => shared_copy(state, a)
     }}
  end

  def assess(_), do: {:ok, %{"state" => "socially_aligned", "execution_ready" => false}}

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

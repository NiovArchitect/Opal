defmodule OpalCore.SocialFlow.Ambient.PlanVersion do
  @moduledoc """
  Plan/proposal version is a hard boundary for derived ambient work.

  Old opportunity, ranking, provider inventory, booking prep, leave-by, ETA,
  MinimumQuestion must not attach to a newer plan version.
  """

  @doc """
  Build a versioned context tag for derived results.
  """
  def tag(attrs) when is_map(attrs) do
    a = stringify(attrs)

    %{
      "plan_version" => a["plan_version"] || a["proposal_version"] || 0,
      "conversation_id" => a["conversation_id"],
      "request_id" => a["request_id"] || a["action_id"],
      "dependency_fingerprint" => a["dependency_fingerprint"]
    }
  end

  @doc """
  Accept only responses matching active plan version (and optional request_id).
  """
  def accept_response?(active, response) when is_map(active) and is_map(response) do
    a = stringify(active)
    r = stringify(response)

    ver_ok =
      to_int(a["plan_version"]) == to_int(r["plan_version"] || r["for_plan_version"])

    req_ok =
      is_nil(a["request_id"]) or is_nil(r["request_id"]) or
        a["request_id"] == r["request_id"]

    ver_ok and req_ok
  end

  def accept_response?(_, _), do: false

  @doc """
  What to invalidate when plan version advances.
  """
  def invalidate_on_version_bump do
    ~w(
      opportunity
      location_fit
      place_ranking
      provider_inventory
      booking_preparation
      leave_by
      eta
      minimum_question
      ambient_surface
    )
  end

  @doc """
  Filter a late provider/outbox payload: drop if version mismatch.
  """
  def gate_late_payload(active, payload) when is_map(active) and is_map(payload) do
    if accept_response?(active, payload) do
      {:ok, stringify(payload)}
    else
      {:reject,
       %{
         "reason" => "plan_version_mismatch",
         "must_not_surface" => true,
         "must_not_change_execution" => true,
         "must_not_attach_booking" => true,
         "must_not_reward" => true
       }}
    end
  end

  def gate_late_payload(_, _), do: {:reject, %{"reason" => "invalid"}}

  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_binary(n), do: String.to_integer(n)
  defp to_int(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

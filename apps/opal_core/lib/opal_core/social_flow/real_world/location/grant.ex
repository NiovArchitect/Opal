defmodule OpalCore.SocialFlow.RealWorld.Location.Grant do
  @moduledoc """
  Purpose-bound location grants.

  Not one monolithic location permission.
  Purpose, duration, and precision matter.
  """

  alias OpalCore.SocialFlow.RealWorld.Location.Precision

  @purposes ~w(
    approximate_for_plan
    share_eta_until_arrive
    private_nearby_suggestions
    share_meeting_point
    use_familiar_areas_privately
  )

  def purposes, do: @purposes

  def build(attrs) when is_map(attrs) do
    a = stringify(attrs)
    purpose = a["purpose"]

    cond do
      purpose not in @purposes ->
        {:error, :unknown_purpose}

      not is_binary(a["owner_user_id"]) ->
        {:error, :owner_required}

      true ->
        precision =
          Precision.cap_request(
            a["precision"] || Precision.required_for(purpose),
            purpose
          )

        {:ok,
         %{
           "schema_version" => "0.1.0",
           "owner_user_id" => a["owner_user_id"],
           "purpose" => purpose,
           "precision" => precision,
           "conversation_id" => a["conversation_id"],
           "plan_id" => a["plan_id"],
           "valid_until" => a["valid_until"],
           "share_with_peers" => purpose in ~w(share_eta_until_arrive share_meeting_point),
           "permanent_exposure" => false,
           "revocable" => true,
           "revoked" => false
         }}
    end
  end

  def build(_), do: {:error, :invalid}

  def active?(grant, now \\ DateTime.utc_now())

  def active?(grant, now) when is_map(grant) do
    g = stringify(grant)

    cond do
      g["revoked"] == true -> false
      match?(%DateTime{}, g["valid_until"]) and DateTime.compare(g["valid_until"], now) != :gt -> false
      true -> true
    end
  end

  def active?(_, _), do: false

  def revoke(grant) when is_map(grant) do
    grant
    |> stringify()
    |> Map.put("revoked", true)
    |> Map.put("revoked_at", DateTime.utc_now() |> DateTime.to_iso8601())
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

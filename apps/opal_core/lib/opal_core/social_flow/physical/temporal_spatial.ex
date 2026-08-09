defmodule OpalCore.SocialFlow.Physical.TemporalSpatial do
  @moduledoc """
  Temporal-spatial feasibility:

  Can this person realistically transition from where they are expected to be
  to the proposed plan at the proposed time?

  Peers never learn the prior plan's who/what/where.
  """

  alias OpalCore.SocialFlow.Feasibility.Engine
  alias OpalCore.SocialFlow.Physical.LocationContext
  alias OpalCore.SocialFlow.Physical.TravelProvider

  @doc """
  Full private evaluation for owner in conversation.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    owner = a["owner_user_id"]
    start_at = parse_dt(a["candidate_start"])
    conv = a["conversation_id"]

    with true <- is_binary(owner),
         %DateTime{} <- start_at,
         :ok <- authorize_context(a) do
      {:ok, origin} =
        LocationContext.expected_origin(%{
          prior_commitment_place: a["prior_commitment_place"],
          explicit_area: a["explicit_area"],
          home_area: a["home_area"],
          work_area: a["work_area"],
          current_area: a["current_area"],
          near_term: a["near_term"] == true
        })

      travel_min =
        case a["travel_minutes"] do
          n when is_number(n) ->
            n

          _ ->
            case TravelProvider.estimate(%{
                   "origin_area" => origin["area_label"],
                   "dest_area" => a["destination_area"],
                   "mode" => a["mode"] || "driving"
                 }) do
              {:ok, t} -> t["duration_minutes"]
              _ -> 25.0
            end
        end

      {:ok, feas} =
        Engine.evaluate(%{
          "owner_user_id" => owner,
          "conversation_id" => conv,
          "candidate_start" => start_at,
          "candidate_end" => a["candidate_end"],
          "travel_minutes" => travel_min,
          "mode" => a["mode"]
        })

      place_gap? =
        a["place_known"] != true and a["event_named"] != true and a["come_over"] != true and
          feas["viable"] == true

      {:ok,
       %{
         "viable" => feas["viable"],
         "feasibility" => feas["feasibility"],
         "leave_by" => feas["leave_by"],
         "leave_copy" => feas["leave_copy"],
         "origin_kind" => origin["kind"],
         "origin_usable" => origin["usable_for_future_plan"],
         "travel_minutes" => travel_min,
         "travel_estimate_class" => "geometric_estimate",
         "place_is_gap" => place_gap?,
         "conflict" => feas["conflict"],
         "alternate_start" => feas["alternate_start"],
         "shared_benefit" =>
           if(a["destination_area"],
             do: LocationContext.shared_benefit(a["destination_area"]),
             else: nil
           ),
         "other_plan_revealed" => false,
         "origin_exposed" => false,
         "authorizes_set" => false,
         "trace" =>
           Map.merge(feas["trace"] || %{}, %{
             "origin_kind" => origin["kind"],
             "place_is_gap" => place_gap?
           })
       }}
    else
      {:error, _} = err -> err
      _ -> {:error, :invalid}
    end
  end

  def evaluate(_), do: {:error, :invalid}

  defp authorize_context(a) do
    cond do
      not is_binary(a["conversation_id"]) -> {:error, :conversation_required}
      a["blocked"] == true -> {:error, :blocked}
      true -> :ok
    end
  end

  defp parse_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

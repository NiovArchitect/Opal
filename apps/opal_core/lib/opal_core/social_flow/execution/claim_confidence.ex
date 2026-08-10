defmodule OpalCore.SocialFlow.Execution.ClaimConfidence do
  @moduledoc """
  Confidence is claim-specific — does not bleed across claims.

  place_fit ≠ live_availability ≠ provider_confirmed ≠ navigation_ready

  Provider metadata may establish fit.
  Live provider may establish availability.
  Provider confirmation establishes external result.
  """

  @claims ~w(
    place_fit
    time_fit
    social_viability
    live_availability
    provider_confirmed
    navigation_ready
    leave_by_ready
    party_capacity
  )

  def claims, do: @claims

  @doc """
  Assess confidence bag. Each claim independent.
  """
  def assess(attrs) when is_map(attrs) do
    a = stringify(attrs)

    claims = %{
      "place_fit" => place_fit(a),
      "time_fit" => time_fit(a),
      "social_viability" => social(a),
      "live_availability" => live_avail(a),
      "provider_confirmed" => confirmed(a),
      "navigation_ready" => nav(a),
      "leave_by_ready" => leave(a),
      "party_capacity" => party(a)
    }

    %{
      "claims" => claims,
      "place_fit_ne_availability" => true,
      "availability_ne_confirmed" => true,
      "may_surface_place_fit" => claims["place_fit"]["confident"],
      "may_prompt_book" =>
        claims["place_fit"]["confident"] and claims["live_availability"]["confident"] and
          claims["party_capacity"]["confident"] and
          claims["provider_confirmed"]["confident"] != true,
      "may_prompt_directions" => claims["navigation_ready"]["confident"],
      "truth_granular" => true,
      "authorizes_set" => false,
      "private" => true
    }
  end

  def assess(_), do: %{"claims" => %{}, "authorizes_set" => false}

  @doc "Bleed check: confidence on A must not imply B."
  def bleed?(from_claim, to_claim, assessment) when is_map(assessment) do
    c = assessment["claims"] || %{}
    from = c[to_string(from_claim)] || %{}
    to = c[to_string(to_claim)] || %{}
    from["confident"] == true and to["confident"] == true and from_claim != to_claim
  end

  def bleed?(_, _, _), do: false

  defp place_fit(a) do
    conf =
      cond do
        a["place_fit_confident"] == true ->
          true

        is_binary(a["destination"] || a["place"] || a["venue_id"]) and a["fit_ok"] != false ->
          true

        a["one_dominant_option"] == true ->
          true

        true ->
          false
      end

    level =
      cond do
        a["provider_metadata_only"] == true -> "metadata"
        a["live_provider"] == true -> "live_context"
        true -> "local"
      end

    claim(conf, level, "place_fit")
  end

  defp time_fit(a) do
    conf =
      match?(%DateTime{}, a["when"] || a["plan_start"]) or a["slot_label"] not in [nil, ""] or
        a["time_known"] == true

    claim(conf, "local", "time_fit")
  end

  defp social(a) do
    conf =
      a["set"] == true or a["socially_aligned"] == true or
        (a["willingness_ok"] == true and a["required_participant_unresolved"] != true)

    claim(conf, "social", "social_viability")
  end

  defp live_avail(a) do
    conf =
      a["provider_checked"] == true and a["provider_available"] == true and
        a["slot_expired"] != true

    # Metadata alone is NOT live availability
    conf = conf and a["provider_metadata_only"] != true

    claim(conf, "live_provider", "live_availability")
  end

  defp confirmed(a) do
    conf = a["provider_confirmed"] == true or a["booked"] == true
    claim(conf, "provider_confirmation", "provider_confirmed")
  end

  defp nav(a) do
    conf =
      is_binary(a["destination"] || a["place"]) and a["navigation_stale"] != true and
        a["destination_resolved"] != false

    claim(conf, "local", "navigation_ready")
  end

  defp leave(a) do
    conf = match?(%DateTime{}, a["leave_by"]) or a["leave_by_prepared"] == true
    claim(conf, "local", "leave_by_ready")
  end

  defp party(a) do
    conf =
      (is_number(a["party_size"]) and a["party_size"] > 0) or a["party_known"] == true or
        a["capacity_ok"] != false

    conf = conf and a["capacity_overflow"] != true
    claim(conf, "local", "party_capacity")
  end

  defp claim(confident, level, name) do
    %{
      "claim" => name,
      "confident" => confident == true,
      "truth_level" => level,
      "bleeds_to_others" => false
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

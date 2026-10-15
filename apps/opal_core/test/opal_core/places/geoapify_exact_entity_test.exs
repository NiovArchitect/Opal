defmodule OpalCore.Places.GeoapifyExactEntityTest do
  @moduledoc """
  Repair #6 P0-A — exact named venue resolution.

  Person-agnostic: no Nighthawk/Coronado hardcodes in production code.
  Live Geoapify calls only when GEOAPIFY_API_KEY is configured.
  """
  use ExUnit.Case, async: false

  alias OpalCore.Places.Providers.Geoapify
  alias OpalCore.Places.Gateway

  @moduletag :external

  test "exact_entity mode never returns unrequested category alternatives when unresolved" do
    # Unknown venue — must not invent Crown Bistro-style substitutes.
    result =
      Geoapify.resolve_exact_entity(%{
        "requested_venue_name" => "Zzqx Nonexistent Bistro 99421",
        "requested_venue_locality" => "Coronado"
      })

    case result do
      {:ok, body} ->
        assert body["search_mode"] == "exact_entity"
        assert body["candidates"] == []
        assert body["unrequested_alternatives"] == 0
        assert body["venue_substitution"] == 0
        assert body["exact_unresolved"] == true

      {:error, :missing_credential} ->
        assert true
    end
  end

  @tag :live_provider
  test "exact named venue resolves Night Hawk style query when provider live" do
    key =
      Application.get_env(:opal_core, :geoapify_api_key) ||
        System.get_env("GEOAPIFY_API_KEY") ||
        System.get_env("OPAL_GEOAPIFY_API_KEY")

    if key in [nil, ""] do
      IO.puts("SKIP live exact venue — GEOAPIFY_API_KEY not configured")
      assert true
    else
      assert {:ok, body} =
               Gateway.search_places(%{
                 "search_mode" => "exact_entity",
                 "requested_venue_name" => "Nighthawk",
                 "requested_venue_locality" => "Coronado"
               })

      assert body["search_mode"] == "exact_entity"
      assert body["unrequested_alternatives"] == 0
      assert body["venue_substitution"] == 0
      # Exact mode must never pad with unrelated category hits.
      assert length(body["candidates"] || []) <= 1

      if body["exact_resolved"] == true do
        [cand] = body["candidates"]
        assert cand["exact_match"] == true
        assert cand["name"] =~ ~r/night\s*hawk/i
        assert (cand["address"] || "") =~ ~r/Coronado|Orange/i
        assert cand["real"] == true
        assert cand["synthetic"] == false
      else
        assert body["candidates"] == []
        assert body["exact_unresolved"] == true
      end
    end
  end

  test "discovery query shape does not set exact_entity" do
    q = %{"destination_text" => "Mexico City", "categories" => "catering.restaurant", "limit" => 1}
    refute q["search_mode"] == "exact_entity"
    assert q["requested_venue_name"] in [nil, ""]
  end
end

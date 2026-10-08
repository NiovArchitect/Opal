defmodule OpalCore.Places.PlacesFacadeTest do
  use ExUnit.Case, async: false

  alias OpalCore.Intelligence.WorldEnrichment
  alias OpalCore.Places

  setup do
    prior = System.get_env("GOOGLE_PLACES_API_KEY")
    prior_opal = System.get_env("OPAL_GOOGLE_PLACES_API_KEY")
    prior_app = Application.get_env(:opal_core, :google_places_api_key)
    prior_http = Application.get_env(:opal_core, :places_details_http_client)
    prior_gp_http = Application.get_env(:opal_core, :google_places_http_client)

    System.delete_env("GOOGLE_PLACES_API_KEY")
    System.delete_env("OPAL_GOOGLE_PLACES_API_KEY")
    Application.delete_env(:opal_core, :google_places_api_key)

    on_exit(fn ->
      restore_env("GOOGLE_PLACES_API_KEY", prior)
      restore_env("OPAL_GOOGLE_PLACES_API_KEY", prior_opal)
      restore_app(:google_places_api_key, prior_app)
      restore_app(:places_details_http_client, prior_http)
      restore_app(:google_places_http_client, prior_gp_http)
    end)

    :ok
  end

  defp restore_env(name, nil), do: System.delete_env(name)
  defp restore_env(name, val), do: System.put_env(name, val)
  defp restore_app(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore_app(key, val), do: Application.put_env(:opal_core, key, val)

  test "without key nearby/search_text/get_details are disabled" do
    assert {:disabled, "GOOGLE_PLACES_API_KEY missing"} =
             Places.nearby(%{"lat" => 32.7, "lng" => -117.1})

    assert {:disabled, "GOOGLE_PLACES_API_KEY missing"} =
             Places.search_text("tacos in Atlantis")

    assert {:disabled, "GOOGLE_PLACES_API_KEY missing"} = Places.get_details("ChIJfake")
  end

  test "demo_fallback labels source demo_fixture and never claims live" do
    assert {:ok, venues, :demo} =
             Places.resolve_venues("Mexico City", "Mexican fine dining", demo_fallback: true)

    assert length(venues) >= 1
    assert Enum.all?(venues, &(&1.source == "demo_fixture"))
  end

  test "without demo_fallback, missing key stays disabled (no silent mix)" do
    assert {:disabled, _} = Places.resolve_venues("Mexico City", "tacos")
  end

  test "get_details via mock HTTP normalizes place" do
    Application.put_env(:opal_core, :google_places_api_key, "test-places-key")
    System.put_env("GOOGLE_PLACES_API_KEY", "test-places-key")
    Application.put_env(:opal_core, :places_details_http_client, __MODULE__.FakeDetailsHTTP)

    assert {:ok, place} = Places.get_details("abc123")
    assert place["name"] == "Fixture Cafe"
    assert place["source"] == "google_places"
    assert place["live"] == true
  end

  test "adversarial fake-city venue ask → honest could-not-find section, not invented" do
    # No places key → enrichment must not invent venues.
    text = "What's the best restaurant in Zyxwvut City for neon dumpling foam?"
    enriched = WorldEnrichment.enrich("world.lookup", text)

    assert enriched.meta.triggered == true
    assert is_binary(enriched.places_section)
    assert enriched.places_section =~ "do not invent"
    refute enriched.places_section =~ "Neon Dumpling Palace"
    refute enriched.places_section =~ ~r/rating=4\.\d/
  end

  defmodule FakeDetailsHTTP do
    def get_json(url, opts) do
      assert url =~ "/places/abc123"
      assert Keyword.fetch!(opts, :api_key) == "test-places-key"

      {:ok,
       %{
         "id" => "abc123",
         "displayName" => %{"text" => "Fixture Cafe"},
         "formattedAddress" => "1 Main St",
         "location" => %{"latitude" => 32.7, "longitude" => -117.1},
         "types" => ["cafe"],
         "rating" => 4.2,
         "businessStatus" => "OPERATIONAL"
       }}
    end
  end
end

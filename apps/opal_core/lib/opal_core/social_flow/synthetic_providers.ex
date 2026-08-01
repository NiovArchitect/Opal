defmodule OpalCore.SocialFlow.SyntheticProviders do
  @moduledoc """
  Provider-neutral synthetic adapters for Social Flow 5.

  No live partner networks, billing, or real geolocation.
  """

  @allowed_hosts ~w(synthetic.opal.local places.opal.local)

  def search_experiences(%{request_type: "restaurant"} = req), do: restaurant_catalog(req)
  def search_experiences(%{request_type: "activity"} = req), do: activity_catalog(req)

  def search_experiences(%{request_type: type} = req)
      when type in ~w(event venue meeting_place) do
    activity_catalog(Map.put(req, :request_type, "activity"))
  end

  def search_experiences(_), do: {:error, :unsupported_request_type}

  def validate_handoff_url(url) when is_binary(url) do
    uri = URI.parse(url)

    cond do
      uri.scheme not in ["https"] ->
        {:error, :invalid_scheme}

      is_nil(uri.host) or uri.host not in @allowed_hosts ->
        {:error, :untrusted_host}

      String.contains?(url, "javascript:") or String.starts_with?(url, "data:") ->
        {:error, :dangerous_url}

      true ->
        # Minimize tracking params in validated handoff
        clean = %{uri | query: nil, fragment: nil} |> URI.to_string()
        {:ok, clean}
    end
  end

  def validate_handoff_url(_), do: {:error, :invalid_url}

  def allowed_hosts, do: @allowed_hosts

  defp restaurant_catalog(req) do
    include_sponsored = Map.get(req, :include_sponsored, false)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    base = [
      %{
        "provider_id" => "synthetic_restaurant",
        "provider_candidate_id" => "rest-harbor-table",
        "experience_type" => "restaurant",
        "display_name" => "Harbor Table",
        "category" => "seafood",
        "geographic_summary" => "Neighborhood midtown",
        "travel_estimate" => "~12 min",
        "price_band" => "$$",
        "accessibility_attributes" => %{
          "accessible_parking" => true,
          "fit" => "meets_accessibility"
        },
        "dietary_attributes" => %{"vegetarian_options" => true, "fit" => "meets_dietary"},
        "availability_state" => "available",
        "availability_checked_at" => now,
        "sponsorship_state" => "organic",
        "handoff_url" => "https://synthetic.opal.local/places/harbor-table",
        "normalized_facts" => %{"capacity" => 8, "open_at_time" => true, "price_rank" => 2}
      },
      %{
        "provider_id" => "synthetic_restaurant",
        "provider_candidate_id" => "rest-green-lantern",
        "experience_type" => "restaurant",
        "display_name" => "Green Lantern Kitchen",
        "category" => "vegetarian",
        "geographic_summary" => "Neighborhood midtown",
        "travel_estimate" => "~8 min",
        "price_band" => "$",
        "accessibility_attributes" => %{
          "accessible_parking" => true,
          "fit" => "meets_accessibility"
        },
        "dietary_attributes" => %{"vegetarian_options" => true, "fit" => "meets_dietary"},
        "availability_state" => "available",
        "availability_checked_at" => now,
        "sponsorship_state" => "organic",
        "handoff_url" => "https://synthetic.opal.local/places/green-lantern",
        "normalized_facts" => %{"capacity" => 6, "open_at_time" => true, "price_rank" => 1}
      },
      %{
        "provider_id" => "synthetic_restaurant",
        "provider_candidate_id" => "rest-summit-grill",
        "experience_type" => "restaurant",
        "display_name" => "Summit Grill",
        "category" => "american",
        "geographic_summary" => "Neighborhood midtown",
        "travel_estimate" => "~15 min",
        "price_band" => "$$$",
        "accessibility_attributes" => %{
          "accessible_parking" => true,
          "fit" => "meets_accessibility"
        },
        "dietary_attributes" => %{"vegetarian_options" => true, "fit" => "meets_dietary"},
        "availability_state" => "limited",
        "availability_checked_at" => now,
        "sponsorship_state" => "organic",
        "handoff_url" => "https://synthetic.opal.local/places/summit-grill",
        "normalized_facts" => %{"capacity" => 10, "open_at_time" => true, "price_rank" => 3}
      },
      %{
        "provider_id" => "synthetic_restaurant",
        "provider_candidate_id" => "rest-no-access",
        "experience_type" => "restaurant",
        "display_name" => "Steps Bistro",
        "category" => "italian",
        "geographic_summary" => "Neighborhood midtown",
        "travel_estimate" => "~10 min",
        "price_band" => "$$",
        "accessibility_attributes" => %{
          "accessible_parking" => false,
          "fit" => "missing_accessibility"
        },
        "dietary_attributes" => %{"vegetarian_options" => true, "fit" => "meets_dietary"},
        "availability_state" => "available",
        "availability_checked_at" => now,
        "sponsorship_state" => "organic",
        "handoff_url" => "https://synthetic.opal.local/places/steps-bistro",
        "normalized_facts" => %{"capacity" => 4, "open_at_time" => true, "price_rank" => 2}
      },
      %{
        "provider_id" => "synthetic_restaurant",
        "provider_candidate_id" => "rest-pricey",
        "experience_type" => "restaurant",
        "display_name" => "Velvet Room",
        "category" => "fine_dining",
        "geographic_summary" => "Neighborhood midtown",
        "travel_estimate" => "~18 min",
        "price_band" => "$$$$",
        "accessibility_attributes" => %{
          "accessible_parking" => true,
          "fit" => "meets_accessibility"
        },
        "dietary_attributes" => %{"vegetarian_options" => true, "fit" => "meets_dietary"},
        "availability_state" => "available",
        "availability_checked_at" => now,
        "sponsorship_state" => "organic",
        "handoff_url" => "https://synthetic.opal.local/places/velvet-room",
        "normalized_facts" => %{"capacity" => 8, "open_at_time" => true, "price_rank" => 4}
      },
      %{
        "provider_id" => "synthetic_restaurant",
        "provider_candidate_id" => "rest-no-veg",
        "experience_type" => "restaurant",
        "display_name" => "Steakhouse Central",
        "category" => "steakhouse",
        "geographic_summary" => "Neighborhood midtown",
        "travel_estimate" => "~14 min",
        "price_band" => "$$",
        "accessibility_attributes" => %{
          "accessible_parking" => true,
          "fit" => "meets_accessibility"
        },
        "dietary_attributes" => %{"vegetarian_options" => false, "fit" => "missing_dietary"},
        "availability_state" => "available",
        "availability_checked_at" => now,
        "sponsorship_state" => "organic",
        "handoff_url" => "https://synthetic.opal.local/places/steakhouse-central",
        "normalized_facts" => %{"capacity" => 12, "open_at_time" => true, "price_rank" => 2}
      }
    ]

    sponsored =
      if include_sponsored do
        [
          %{
            "provider_id" => "synthetic_restaurant",
            "provider_candidate_id" => "rest-sponsored-cafe",
            "experience_type" => "restaurant",
            "display_name" => "Partner Plaza Café",
            "category" => "cafe",
            "geographic_summary" => "Neighborhood midtown",
            "travel_estimate" => "~9 min",
            "price_band" => "$$",
            "accessibility_attributes" => %{
              "accessible_parking" => true,
              "fit" => "meets_accessibility"
            },
            "dietary_attributes" => %{"vegetarian_options" => true, "fit" => "meets_dietary"},
            "availability_state" => "available",
            "availability_checked_at" => now,
            "sponsorship_state" => "sponsored",
            "sponsor_label" => "Sponsored",
            "handoff_url" => "https://synthetic.opal.local/places/partner-plaza",
            "normalized_facts" => %{
              "capacity" => 8,
              "open_at_time" => true,
              "price_rank" => 2,
              "ranking_effect_class" => "bounded_boost"
            }
          },
          # Sponsored but fails accessibility — must not become eligible via payment
          %{
            "provider_id" => "synthetic_restaurant",
            "provider_candidate_id" => "rest-sponsored-ineligible",
            "experience_type" => "restaurant",
            "display_name" => "Paid Stairs Lounge",
            "category" => "lounge",
            "geographic_summary" => "Neighborhood midtown",
            "travel_estimate" => "~11 min",
            "price_band" => "$$",
            "accessibility_attributes" => %{
              "accessible_parking" => false,
              "fit" => "missing_accessibility"
            },
            "dietary_attributes" => %{"vegetarian_options" => true, "fit" => "meets_dietary"},
            "availability_state" => "available",
            "availability_checked_at" => now,
            "sponsorship_state" => "sponsored",
            "sponsor_label" => "Sponsored",
            "handoff_url" => "https://synthetic.opal.local/places/paid-stairs",
            "normalized_facts" => %{"capacity" => 6, "open_at_time" => true, "price_rank" => 2}
          }
        ]
      else
        []
      end

    {:ok, base ++ sponsored}
  end

  defp activity_catalog(_req) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {:ok,
     [
       %{
         "provider_id" => "synthetic_activity",
         "provider_candidate_id" => "act-botanical",
         "experience_type" => "activity",
         "display_name" => "City Botanical Garden",
         "category" => "outdoor_quiet",
         "geographic_summary" => "City park district",
         "travel_estimate" => "~20 min",
         "price_band" => "$",
         "accessibility_attributes" => %{"fit" => "meets_accessibility"},
         "dietary_attributes" => %{},
         "availability_state" => "available",
         "availability_checked_at" => now,
         "sponsorship_state" => "organic",
         "handoff_url" => "https://synthetic.opal.local/activities/botanical",
         "normalized_facts" => %{
           "outdoor" => true,
           "quiet" => true,
           "duration" => "2h",
           "weather_dependent" => true
         }
       },
       %{
         "provider_id" => "synthetic_activity",
         "provider_candidate_id" => "act-art-walk",
         "experience_type" => "activity",
         "display_name" => "Riverside Art Walk",
         "category" => "outdoor",
         "geographic_summary" => "Riverside corridor",
         "travel_estimate" => "~25 min",
         "price_band" => "free",
         "accessibility_attributes" => %{"fit" => "meets_accessibility"},
         "dietary_attributes" => %{},
         "availability_state" => "available",
         "availability_checked_at" => now,
         "sponsorship_state" => "organic",
         "handoff_url" => "https://synthetic.opal.local/activities/art-walk",
         "normalized_facts" => %{
           "outdoor" => true,
           "quiet" => false,
           "duration" => "1.5h",
           "weather_dependent" => true
         }
       },
       %{
         "provider_id" => "synthetic_activity",
         "provider_candidate_id" => "act-museum",
         "experience_type" => "activity",
         "display_name" => "Quiet Wing Museum",
         "category" => "indoor_quiet",
         "geographic_summary" => "Arts district",
         "travel_estimate" => "~18 min",
         "price_band" => "$$",
         "accessibility_attributes" => %{"fit" => "meets_accessibility"},
         "dietary_attributes" => %{},
         "availability_state" => "available",
         "availability_checked_at" => now,
         "sponsorship_state" => "organic",
         "handoff_url" => "https://synthetic.opal.local/activities/museum",
         "normalized_facts" => %{
           "outdoor" => false,
           "quiet" => true,
           "duration" => "2h",
           "weather_dependent" => false
         }
       },
       %{
         "provider_id" => "synthetic_activity",
         "provider_candidate_id" => "act-cafe",
         "experience_type" => "activity",
         "display_name" => "Low-Volume Reading Café",
         "category" => "cafe",
         "geographic_summary" => "Neighborhood midtown",
         "travel_estimate" => "~10 min",
         "price_band" => "$",
         "accessibility_attributes" => %{"fit" => "meets_accessibility"},
         "dietary_attributes" => %{},
         "availability_state" => "available",
         "availability_checked_at" => now,
         "sponsorship_state" => "organic",
         "handoff_url" => "https://synthetic.opal.local/activities/reading-cafe",
         "normalized_facts" => %{
           "outdoor" => false,
           "quiet" => true,
           "duration" => "1h",
           "weather_dependent" => false
         }
       }
     ]}
  end
end

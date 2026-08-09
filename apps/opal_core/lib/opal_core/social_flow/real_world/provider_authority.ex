defmodule OpalCore.SocialFlow.RealWorld.ProviderAuthority do
  @moduledoc """
  Real-world authority law:

  **Providers establish facts. Opal establishes relevance. Humans establish social authority.**

  Examples:
  - calendar_free = true  ⇏  willing_to_meet
  - nearby = true         ⇏  wants_to_share_location
  - restaurant_available  ⇏  group_selected_restaurant
  - payment_possible      ⇏  payment_authorized
  """

  @doc """
  Classify a provider signal into fact class vs what it does NOT authorize.
  """
  def classify_fact(source, payload \\ %{})

  def classify_fact("calendar_free_busy", payload) do
    free? = payload["busy"] == false or payload["free"] == true

    %{
      "source" => "calendar_free_busy",
      "fact_class" => "capacity",
      "fact" => if(free?, do: "technically_free", else: "technically_busy"),
      "authorizes_willingness" => false,
      "authorizes_share" => false,
      "authorizes_set" => false,
      "authorizes_external_action" => false
    }
  end

  def classify_fact("current_approximate_location", _payload) do
    %{
      "source" => "current_approximate_location",
      "fact_class" => "location",
      "authorizes_share" => false,
      "authorizes_willingness" => false,
      "authorizes_set" => false,
      "authorizes_external_action" => false
    }
  end

  def classify_fact("provider_availability", _payload) do
    %{
      "source" => "provider_availability",
      "fact_class" => "inventory",
      "authorizes_booking" => false,
      "authorizes_set" => false,
      "authorizes_group_selection" => false
    }
  end

  def classify_fact(source, _) when is_binary(source) do
    %{
      "source" => source,
      "fact_class" => "generic",
      "authorizes_set" => false,
      "authorizes_external_action" => false
    }
  end

  def classify_fact(_, _), do: %{"authorizes_set" => false}

  @doc "True only if fact may skip a redundant question of the given topic."
  def may_eliminate_question?(fact_class, topic) do
    case {fact_class, topic} do
      {"capacity", :time_availability} -> true
      {"location", :area} -> true
      {"inventory", :provider_open} -> true
      _ -> false
    end
  end
end

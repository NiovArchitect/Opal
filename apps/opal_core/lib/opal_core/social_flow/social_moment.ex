defmodule OpalCore.SocialFlow.SocialMoment do
  @moduledoc """
  Social Moment as a lived-experience object (Pass 15 add-on).

  Media-primary · human · not an affiliate card · not a feed engine.

  A Moment may seed a Shared Reality via "Do this with your people"
  without booking, paying, or forcing commerce.

  Place identity may carry stable provider IDs (Pass 15) without
  claiming BOOKABILITY or EXECUTION.
  """

  @doc """
  Build a Social Moment struct (in-memory / pure).

  Required: id, author_user_id, caption
  Optional: media_refs, place_ref, experience_at, audience, lineage, context_tags
  """
  def new(attrs) when is_map(attrs) do
    a = stringify(attrs)

    %{
      "id" => a["id"] || new_id("moment"),
      "kind" => "social_moment",
      "author_user_id" => a["author_user_id"] || a["author"],
      "caption" => a["caption"] || "",
      "media_refs" => List.wrap(a["media_refs"] || a["media"] || []),
      "place_ref" => normalize_place_ref(a["place_ref"] || a["place"]),
      "experience_at" => a["experience_at"],
      "social_context" => a["social_context"] || a["context"] || nil,
      "audience" => a["audience"] || %{"policy" => "relationship_first"},
      "shared_reality_id" => a["shared_reality_id"],
      "source_lineage_id" => a["source_lineage_id"] || a["inspired_by_moment_id"],
      "downstream_reality_ids" => List.wrap(a["downstream_reality_ids"] || []),
      "attribution_refs" => List.wrap(a["attribution_refs"] || []),
      "commerce_led" => false,
      "book_now_cta" => false,
      "earn_money_cta" => false,
      "not_a_feed_item" => true,
      "human_surface" => human_surface(a)
    }
  end

  def new(_), do: new(%{})

  @doc """
  Seed an independent Shared Reality from a Moment + chosen people.

  Does NOT Set, book, or share automatically.
  Does NOT force original Moment participants into the new Reality.
  """
  def do_with_people(moment, opts) when is_map(moment) and is_map(opts) do
    m = stringify(moment)
    o = stringify(opts)
    people = List.wrap(o["participant_user_ids"] || o["people"] || [])

    if people == [] do
      {:error, :people_required}
    else
      place = m["place_ref"] || %{}

      seed = %{
        "kind" => "reality_seed",
        "source" => "social_moment",
        "social_moment_id" => m["id"],
        "inspiration_lineage_id" => m["id"],
        "author_user_id" => o["actor_user_id"] || o["user_id"],
        "participant_user_ids" => people,
        "what" => o["what"] || infer_what(m),
        "when" => o["when"] || "open",
        "where_candidate" => place["display_name"] || place["name"],
        "place_identity" => place_identity_from_ref(place),
        "social_context" => m["social_context"],
        "authorizes_set" => false,
        "authorizes_booking" => false,
        "provider_status" => "unknown",
        "bookability" => "unknown",
        "execution" => "none",
        "next_gap" => if(place_identity_from_ref(place), do: "time", else: "place"),
        "independent_circle" => true,
        "not_original_circle_entitlement" => true
      }

      {:ok, seed}
    end
  end

  def do_with_people(_, _), do: {:error, :invalid}

  @doc "Human presentation — never earn/book led."
  def human_surface(attrs) when is_map(attrs) do
    a = stringify(attrs)
    place = normalize_place_ref(a["place_ref"] || a["place"])

    %{
      "creator" => a["creator_display"] || a["author_user_id"] || "Someone",
      "caption" => a["caption"] || "",
      "place_label" => place && (place["display_name"] || place["name"]),
      "cta" => "Do this with your people",
      "hint" => "Tap to show interest",
      "suppress_commerce" => true
    }
  end

  def human_surface(_), do: %{"cta" => "Do this with your people", "suppress_commerce" => true}

  @doc "Invariant: moment UI must not lead with commerce/earn."
  def commerce_led?(moment) when is_map(moment) do
    m = stringify(moment)
    m["book_now_cta"] == true or m["earn_money_cta"] == true or m["commerce_led"] == true
  end

  def commerce_led?(_), do: false

  # --- internals ---

  defp normalize_place_ref(nil), do: nil
  defp normalize_place_ref(name) when is_binary(name), do: %{"display_name" => name, "name" => name}

  defp normalize_place_ref(p) when is_map(p) do
    p = stringify(p)

    %{
      "display_name" => p["display_name"] || p["name"],
      "name" => p["name"] || p["display_name"],
      "provider" => p["provider"],
      "provider_place_id" => p["provider_place_id"] || p["id"],
      "area_label" => p["area_label"] || p["area"],
      "lat" => p["lat"],
      "lng" => p["lng"],
      "truth_class" => "provider_fact",
      "bookability" => "unknown",
      "execution" => "none"
    }
  end

  defp normalize_place_ref(_), do: nil

  defp place_identity_from_ref(nil), do: nil
  defp place_identity_from_ref(p) when p == %{}, do: nil

  defp place_identity_from_ref(p) do
    p = stringify(p)

    if p["provider_place_id"] || p["display_name"] || p["name"] do
      %{
        "display_name" => p["display_name"] || p["name"],
        "provider_place_id" => p["provider_place_id"],
        "provider" => p["provider"],
        "area_label" => p["area_label"],
        "lat" => p["lat"],
        "lng" => p["lng"],
        "truth_class" => "provider_fact",
        "bookability" => "unknown",
        "execution" => "none",
        "authorizes_set" => false
      }
    else
      nil
    end
  end

  defp infer_what(m) do
    ctx = String.downcase(to_string(m["social_context"] || m["caption"] || ""))

    cond do
      String.contains?(ctx, "coffee") -> "Coffee"
      String.contains?(ctx, "hike") -> "Hike"
      String.contains?(ctx, "date") -> "Dinner"
      true -> "Dinner"
    end
  end

  defp new_id(prefix), do: prefix <> "-" <> Base.encode16(:crypto.strong_rand_bytes(6), case: :lower)

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

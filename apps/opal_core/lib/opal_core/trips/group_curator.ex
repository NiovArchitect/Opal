defmodule OpalCore.Trips.GroupCurator do
  @moduledoc """
  Phase 3 — group experience curation over the multi-day canvas.

  Finds overlaps (together) and honest splits (subgroups) from vibe profiles
  + existing activity RSVPs. Proposes; never auto-commits blocks.
  Preserves free time — Opal does not fill every hour.
  """

  alias OpalCore.Trips
  alias OpalCore.Trips.DestinationPacks

  @doc """
  Curate the trip experience.

  Returns:
  `%{destination, together, splits, free_blocks, proposals, commits_canvas: false}`
  """
  def curate(trip_id, viewer_user_id)
      when is_binary(trip_id) and is_binary(viewer_user_id) do
    with {:ok, trip} <- Trips.get_trip_for_user(trip_id, viewer_user_id),
         {:ok, profiles} <- Trips.vibe_profiles_for_trip(trip_id) do
      contract = Trips.to_contract(trip)
      days = contract["days"] || []

      together = together_moments(days)
      splits = split_moments(days)
      free_blocks = free_moments(days)
      proposals = proposals_for(trip, profiles, days)

      {:ok,
       %{
         "destination" => trip.destination_label,
         "together" => together,
         "splits" => splits,
         "free_blocks" => free_blocks,
         "proposals" => proposals,
         "profiles" => profiles,
         "commits_canvas" => false,
         "authority" => "group_experience_curation"
       }}
    end
  end

  def curate(_, _), do: {:error, :not_found}

  defp together_moments(days) do
    for day <- days,
        block <- day["time_blocks"] || [],
        act <- block["activities"] || [],
        length(act["whos_in"] || []) >= 3 do
      %{
        "day_label" => day["label"],
        "time_label" => block["time_label"],
        "venue_name" => act["venue_name"],
        "whos_in_count" => length(act["whos_in"]),
        "note" => "Group overlap — keep this together."
      }
    end
  end

  defp split_moments(days) do
    for day <- days,
        block <- day["time_blocks"] || [],
        length(block["activities"] || []) >= 2 do
      acts = block["activities"]

      %{
        "day_label" => day["label"],
        "time_label" => block["time_label"],
        "options" =>
          Enum.map(acts, fn a ->
            %{
              "venue_name" => a["venue_name"],
              "whos_in" => a["whos_in"] || [],
              "passed" => a["passed"] || [],
              "vibe_tags" => a["vibe_tags"] || []
            }
          end),
        "note" => split_note(acts)
      }
    end
  end

  defp split_note(acts) do
    names =
      acts
      |> Enum.map(fn a ->
        n = length(a["whos_in"] || [])
        "#{n} for #{a["venue_name"]}"
      end)
      |> Enum.join("; ")

    "Honest split — #{names}. Meet after for a shared meal when it fits."
  end

  defp free_moments(days) do
    for day <- days,
        block <- day["time_blocks"] || [],
        block["block_kind"] == "free" do
      %{
        "day_label" => day["label"],
        "time_label" => block["time_label"],
        "title" => block["title"],
        "note" => "Breathing room — do not auto-fill."
      }
    end
  end

  defp proposals_for(trip, profiles, days) do
    label = trip.destination_label || ""
    pack_entries = DestinationPacks.entries(label)
    existing_venues = MapSet.new(all_venues(days))

    interest_pool =
      profiles
      |> Enum.flat_map(& &1["interest_tags"])
      |> Enum.frequencies()

    pack_entries
    |> Enum.reject(fn e -> MapSet.member?(existing_venues, e["name"]) end)
    |> Enum.map(fn e ->
      tags = entry_tags(e)
      score = Enum.reduce(tags, 0, fn t, acc -> acc + Map.get(interest_pool, t, 0) end)

      %{
        "venue_name" => e["name"],
        "venue_area" => e["area_label"],
        "activity_kind" => e["leg_type"] || e["category"] || "activity",
        "vibe_tags" => tags,
        "fit_score" => score,
        "suggested_slot" => suggest_slot(tags),
        "note" => proposal_note(e, tags, interest_pool)
      }
    end)
    |> Enum.sort_by(&(-&1["fit_score"]))
    |> Enum.take(5)
  end

  defp all_venues(days) do
    for day <- days,
        block <- day["time_blocks"] || [],
        act <- block["activities"] || [],
        do: act["venue_name"]
  end

  defp entry_tags(e) do
    base = [
      e["cuisine"],
      e["category"],
      e["leg_type"]
    ]

    (base ++ String.split(to_string(e["description"] || ""), ~r/\W+/))
    |> Enum.map(&String.downcase(to_string(&1 || "")))
    |> Enum.filter(&(String.length(&1) > 3))
    |> Enum.uniq()
    |> Enum.take(8)
  end

  defp suggest_slot(tags) do
    cond do
      "photography" in tags or "golden_hour" in tags -> "evening"
      "market" in tags or "bakery" in tags -> "morning"
      "meal" in tags or "seafood" in tags or "mexican" in tags -> "evening"
      true -> "afternoon"
    end
  end

  defp proposal_note(e, tags, interest_pool) do
    hits =
      tags
      |> Enum.filter(&(Map.get(interest_pool, &1, 0) > 0))
      |> Enum.take(3)

    if hits == [] do
      "Optional add from #{e["area_label"] || "the destination"} — only if the group wants it."
    else
      "Fits learned vibes: #{Enum.join(hits, ", ")}."
    end
  end
end

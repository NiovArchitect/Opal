defmodule OpalCore.Trips.TripCurator do
  @moduledoc """
  Phase 4G — pick people + destination → ranked leg suggestions.

  Uses CuratorPack (people/prefs) + destination fixture packs + 
  RecommendationIntelligence. Never falls back to San Diego outing fixtures.
  Does not auto-commit legs.
  """

  alias OpalCore.SocialFlow.CuratorPack
  alias OpalCore.SocialFlow.RecommendationIntelligence
  alias OpalCore.Trips
  alias OpalCore.Trips.DestinationPacks

  @quotas %{"lodging" => 2, "activity" => 3, "meal" => 2}

  @doc """
  Curate stop suggestions for a trip the viewer can access.

  Returns `{:ok, %{destination, suggestions}}` or
  `{:error, :not_found}` | `{:error, {:no_curated_destination, label}}`.
  """
  def curate(trip_id, viewer_user_id)
      when is_binary(trip_id) and is_binary(viewer_user_id) do
    with {:ok, trip} <- Trips.get_trip_for_user(trip_id, viewer_user_id),
         label <- destination_label(trip),
         {:ok, pack} <- lookup_pack(label),
         user_ids <- participant_ids(trip),
         {:ok, pack_ctx} <-
           CuratorPack.assemble(viewer_user_id, user_ids, activity: "dinner"),
         candidates <- pack_candidates(pack),
         attrs <- recommend_attrs(viewer_user_id, pack_ctx, candidates),
         {:ok, result} <- RecommendationIntelligence.recommend(attrs) do
      suggestions = select_suggestions(result["ranked"] || [], pack)

      {:ok,
       %{
         "destination" => pack["label"],
         "suggestions" => suggestions,
         "authority" => result["authority"] || "candidate_hypothesis",
         "commits_legs" => false
       }}
    end
  end

  def curate(_, _), do: {:error, :not_found}

  defp destination_label(trip) do
    (trip.destination_label || "")
    |> to_string()
    |> String.trim()
  end

  defp lookup_pack(""), do: {:error, {:no_curated_destination, ""}}

  defp lookup_pack(label) do
    case DestinationPacks.lookup(label) do
      {:ok, pack} -> {:ok, pack}
      {:error, :no_curated_destination} -> {:error, {:no_curated_destination, label}}
    end
  end

  defp participant_ids(trip) do
    (trip.participants || [])
    |> Enum.map(& &1.user_id)
    |> Enum.filter(&(is_binary(&1) and &1 != ""))
    |> then(fn ids ->
      if trip.created_by_user_id in ids, do: ids, else: [trip.created_by_user_id | ids]
    end)
    |> Enum.uniq()
  end

  defp pack_candidates(pack) do
    Enum.map(pack["entries"] || [], fn e ->
      %{
        "id" => e["id"],
        "display_name" => e["name"],
        "name" => e["name"],
        "area_label" => e["area_label"],
        "cuisine" => e["cuisine"],
        "price_band" => e["price_band"],
        "category" => e["category"],
        "leg_type" => e["leg_type"],
        "description" => e["description"],
        "open_now" => true,
        "max_party" => 12,
        "provenance" => "destination_pack",
        "candidate_type" => e["leg_type"] || "place"
      }
    end)
  end

  defp recommend_attrs(viewer_id, pack_ctx, candidates) do
    boundaries =
      pack_ctx["participants"]
      |> Enum.flat_map(&List.wrap(&1["boundaries"]))

    %{
      "viewer_user_id" => viewer_id,
      "participants" => pack_ctx["participants"],
      "activity" => "dinner",
      "what" => "dinner",
      "relationship_context" => pack_ctx["relationship_context"],
      "hard_constraints" => pack_ctx["hard_constraints"],
      "boundaries" => boundaries,
      "recent_visits" => pack_ctx["recent_visits"],
      "history_rejected" => pack_ctx["history_rejected"],
      "soft_prefs" => pack_ctx["soft_prefs"],
      "candidates" => candidates,
      "limit" => 12,
      "shared_board" => true,
      "include_private_reasons" => true,
      "load_durable" => true
    }
  end

  defp select_suggestions(ranked, pack) do
    by_id =
      (pack["entries"] || [])
      |> Map.new(fn e -> {e["id"], e} end)

    counts = %{"lodging" => 0, "activity" => 0, "meal" => 0}

    {picked, _} =
      Enum.reduce(ranked, {[], counts}, fn row, {acc, counts} ->
        row = stringify(row)
        id = row["id"]
        entry = Map.get(by_id, id)

        cond do
          is_nil(entry) ->
            {acc, counts}

          true ->
            leg_type = entry["leg_type"] || "activity"
            quota = Map.get(@quotas, leg_type, 0)
            used = Map.get(counts, leg_type, 0)

            if used < quota do
              suggestion = %{
                "id" => id,
                "name" => entry["name"],
                "leg_type" => leg_type,
                "description" => entry["description"],
                "area_label" => entry["area_label"],
                "price_band" => entry["price_band"],
                "cuisine" => entry["cuisine"],
                "shared_reasons" => List.wrap(row["shared_reasons"]),
                "private_reasons" => List.wrap(row["private_reasons"])
              }

              {[suggestion | acc], Map.put(counts, leg_type, used + 1)}
            else
              {acc, counts}
            end
        end
      end)

    # Preserve RI rank order (reduce reversed)
    Enum.reverse(picked)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

defmodule OpalCoreWeb.RecommendationController do
  @moduledoc """
  Product API for curate-plans: pick people → ranked shortlist.

  POST /api/v1/product/recommendations/curate

  Commits nothing — RecommendationIntelligence is candidate_hypothesis only.
  """
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.CuratorPack
  alias OpalCore.SocialFlow.Physical.{CandidateSource, PlaceProvider}
  alias OpalCore.SocialFlow.RecommendationIntelligence

  @doc """
  Body: user_ids, activity|what, current_intent?, relationship_context?,
  hard_constraints?, limit? (default 3), area_label?, lat?, lng?
  """
  def curate(conn, params) do
    viewer_id = conn.assigns.current_user_id
    params = stringify(params)
    user_ids = List.wrap(params["user_ids"])
    activity = params["activity"] || params["what"] || "dinner"
    limit = parse_limit(params["limit"])

    with {:ok, pack} <-
           CuratorPack.assemble(viewer_id, user_ids,
             relationship_context: params["relationship_context"],
             hard_constraints: params["hard_constraints"],
             recent_visits: params["recent_visits"],
             history_rejected: params["history_rejected"],
             activity: activity
           ),
         {:ok, candidates} <- acquire_candidates(activity, pack, params),
         attrs <- recommend_attrs(viewer_id, pack, candidates, activity, params, limit),
         {:ok, result} <- RecommendationIntelligence.recommend(attrs) do
      ranked = enrich_ranked(result["ranked"], candidates)

      json(conn, %{
        "ranked" => ranked,
        "limit" => result["limit"],
        "authority" => result["authority"],
        "commits_shared_plan" => result["commits_shared_plan"] == true,
        "writes_durable_memory" => result["writes_durable_memory"] == true,
        "privacy" => result["privacy"],
        "group_fit_model" => result["group_fit_model"],
        "hard_rejected" => result["hard_rejected"] || [],
        "current_intent" => result["current_intent"],
        "relationship_context" => result["relationship_context"],
        "candidate_source" => candidate_source_label(candidates),
        "activity" => activity
      })
    else
      {:error, :user_ids_required} ->
        error(conn, 422, "user_ids_required", "user_ids required")

      {:error, {:unknown_users, missing}} ->
        error(conn, 404, "unknown_users", "Unknown user_ids: #{Enum.join(missing, ", ")}")

      {:error, :invalid} ->
        error(conn, 422, "invalid", "Invalid curate request")

      {:reject, reason} ->
        error(conn, 422, "rejected", to_string(reason))

      {:error, reason} ->
        error(conn, 422, "curate_failed", inspect(reason))
    end
  end

  defp acquire_candidates(activity, pack, params) do
    party =
      get_in(pack, ["hard_constraints", "party_size"]) ||
        max(length(pack["participants"] || []), 2)

    category = catalog_category(activity)
    area = params["area_label"]
    lat = number(params["lat"])
    lng = number(params["lng"])

    opts =
      [
        source: :catalog,
        category: category,
        capacity_min: party,
        max_result_count: 12,
        # Curate may run without lat/area — fixture catalog is the accepted default.
        allow_unbounded: true,
        force_query: true
      ]
      |> maybe_kw(:area_label, area)
      |> maybe_kw(:lat, lat)
      |> maybe_kw(:lng, lng)

    # Prefer PlaceProvider → OpportunitySource (fixture-default; connected when configured).
    case PlaceProvider.search(opts) do
      {:ok, list} when is_list(list) and list != [] ->
        {:ok, Enum.map(list, &CandidateSource.normalize_place/1)}

      {:ok, _} ->
        CandidateSource.fetch(opts)

      {:error, _} ->
        # Fixture-default accepted for this tranche when connected search fails
        CandidateSource.fetch(opts)
    end
  end

  defp recommend_attrs(viewer_id, pack, candidates, activity, params, limit) do
    boundaries =
      pack["participants"]
      |> Enum.flat_map(&List.wrap(&1["boundaries"]))

    %{
      "viewer_user_id" => viewer_id,
      "participants" => pack["participants"],
      "activity" => activity,
      "what" => activity,
      "current_intent" => params["current_intent"],
      "relationship_context" => pack["relationship_context"],
      "hard_constraints" => pack["hard_constraints"],
      "boundaries" => boundaries,
      "recent_visits" => pack["recent_visits"],
      "history_rejected" => pack["history_rejected"],
      "soft_prefs" => pack["soft_prefs"],
      "candidates" => Enum.reject(List.wrap(candidates), &is_nil/1),
      "limit" => limit,
      "shared_board" => true,
      "include_private_reasons" => true
    }
  end

  defp catalog_category(activity) when is_binary(activity) do
    case String.downcase(String.trim(activity)) do
      a when a in ~w(dinner drinks food restaurant) -> "dinner"
      "coffee" -> "coffee"
      "event" -> "event"
      _ -> "dinner"
    end
  end

  defp catalog_category(_), do: "dinner"

  defp enrich_ranked(ranked, candidates) when is_list(ranked) do
    by_id =
      candidates
      |> List.wrap()
      |> Enum.reject(&is_nil/1)
      |> Map.new(fn c ->
        c = stringify(c)
        id = c["id"] || c["provider_place_id"]
        {id, c}
      end)

    Enum.map(ranked, fn row ->
      row = stringify(row)
      src = Map.get(by_id, row["id"], %{})

      row
      |> Map.put_new("area_label", src["area_label"] || src["area"])
      |> Map.put_new("name", row["display_name"] || src["name"] || src["display_name"])
    end)
  end

  defp enrich_ranked(ranked, _), do: List.wrap(ranked)

  defp candidate_source_label(candidates) do
    first = List.first(List.wrap(candidates)) || %{}

    cond do
      first["real"] == true or first["live"] == true -> "connected"
      first["provider_freshness"] == "fixture" or first["synthetic"] == true -> "fixture_catalog"
      true -> "fixture_catalog"
    end
  end

  defp parse_limit(nil), do: 3
  defp parse_limit(n) when is_integer(n) and n > 0 and n <= 10, do: n

  defp parse_limit(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} when i > 0 and i <= 10 -> i
      _ -> 3
    end
  end

  defp parse_limit(_), do: 3

  defp number(nil), do: nil
  defp number(n) when is_number(n), do: n * 1.0

  defp number(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp number(_), do: nil

  defp maybe_kw(opts, _k, nil), do: opts
  defp maybe_kw(opts, k, v), do: Keyword.put(opts, k, v)

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

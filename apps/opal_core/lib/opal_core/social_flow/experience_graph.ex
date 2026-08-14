defmodule OpalCore.SocialFlow.ExperienceGraph do
  @moduledoc """
  Experience Graph — durable lineage of lived experiences (Pass 15 add-on).

  Connects: people, Social Moments, places, Shared Realities, provider entities,
  real-world experiences — without becoming a feed ranker or payout engine.

  Edge kinds:
  inspired_by | planned_from | executed_as | captured_as | attributed_to | experienced_as

  Lineage is provenance, not AlignmentAuthority.
  """

  @edge_kinds ~w(inspired_by planned_from executed_as captured_as attributed_to experienced_as)

  def edge_kinds, do: @edge_kinds

  @doc "Empty graph container."
  def new do
    %{"nodes" => %{}, "edges" => [], "schema" => "experience_graph.v1"}
  end

  @doc "Put a node (moment | reality | place | person | experience | provider)."
  def put_node(graph, type, id, attrs \\ %{}) when is_map(graph) do
    g = stringify(graph)
    nodes = g["nodes"] || %{}
    node = Map.merge(%{"id" => id, "type" => to_string(type)}, stringify(attrs))
    %{g | "nodes" => Map.put(nodes, node_key(type, id), node)}
  end

  @doc "Add a directed lineage edge."
  def add_edge(graph, from_ref, to_ref, kind, meta \\ %{}) when is_map(graph) do
    kind_s = to_string(kind)

    if kind_s not in @edge_kinds do
      {:error, :unknown_edge_kind}
    else
      g = stringify(graph)
      edge = %{
        "id" => meta["id"] || edge_id(from_ref, to_ref, kind_s),
        "from" => normalize_ref(from_ref),
        "to" => normalize_ref(to_ref),
        "kind" => kind_s,
        "at" => meta["at"] || iso_now(),
        "privacy" => meta["privacy"] || "internal",
        "meta" => Map.drop(stringify(meta), ["id", "at", "privacy"])
      }

      {:ok, %{g | "edges" => (g["edges"] || []) ++ [edge]}}
    end
  end

  @doc """
  Record: Moment → Reality seed (Do this with your people).
  """
  def link_moment_to_reality(graph, moment_id, reality_id, meta \\ %{}) do
    graph
    |> put_node("moment", moment_id, meta["moment"] || %{})
    |> put_node("reality", reality_id, meta["reality"] || %{})
    |> then(fn g -> add_edge(g, {"moment", moment_id}, {"reality", reality_id}, "inspired_by", meta) end)
  end

  @doc "Record: Reality → lived experience."
  def link_reality_to_experience(graph, reality_id, experience_id, meta \\ %{}) do
    graph
    |> put_node("reality", reality_id, %{})
    |> put_node("experience", experience_id, meta)
    |> then(fn g ->
      add_edge(g, {"reality", reality_id}, {"experience", experience_id}, "experienced_as", meta)
    end)
  end

  @doc "Record: Experience → new Social Moment capture."
  def link_experience_to_moment(graph, experience_id, moment_id, meta \\ %{}) do
    graph
    |> put_node("experience", experience_id, %{})
    |> put_node("moment", moment_id, meta)
    |> then(fn g ->
      add_edge(g, {"experience", experience_id}, {"moment", moment_id}, "captured_as", meta)
    end)
  end

  @doc "Upstream moment chain walking inspired_by edges (bounded)."
  def upstream_moments(graph, moment_id, max_hops \\ 4) do
    g = stringify(graph)
    walk_upstream(g["edges"] || [], {"moment", moment_id}, max_hops, [])
  end

  @doc "Downstream realities inspired by a moment."
  def downstream_realities(graph, moment_id) do
    g = stringify(graph)

    (g["edges"] || [])
    |> Enum.filter(fn e ->
      e = stringify(e)
      e["kind"] == "inspired_by" and e["from"] == normalize_ref({"moment", moment_id})
    end)
    |> Enum.map(fn e -> stringify(e)["to"] end)
  end

  # --- internals ---

  defp walk_upstream(_edges, _ref, hops, acc) when hops <= 0, do: Enum.reverse(acc)

  defp walk_upstream(edges, ref, hops, acc) do
    parents =
      edges
      |> Enum.filter(fn e ->
        e = stringify(e)
        e["kind"] in ~w(inspired_by captured_as) and e["to"] == normalize_ref(ref)
      end)
      |> Enum.map(fn e -> stringify(e)["from"] end)

    case parents do
      [] ->
        Enum.reverse(acc)

      [parent | _] ->
        walk_upstream(edges, parent, hops - 1, [parent | acc])
    end
  end

  defp normalize_ref({type, id}), do: %{"type" => to_string(type), "id" => to_string(id)}
  defp normalize_ref(%{"type" => t, "id" => i}), do: %{"type" => to_string(t), "id" => to_string(i)}
  defp normalize_ref(id) when is_binary(id), do: %{"type" => "unknown", "id" => id}

  defp node_key(type, id), do: to_string(type) <> ":" <> to_string(id)

  defp edge_id(from, to, kind) do
    f = normalize_ref(from)
    t = normalize_ref(to)
    "edge-#{kind}-#{f["id"]}-#{t["id"]}"
  end

  defp iso_now, do: DateTime.utc_now() |> DateTime.to_iso8601()

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

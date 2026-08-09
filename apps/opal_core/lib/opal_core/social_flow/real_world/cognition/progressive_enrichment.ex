defmodule OpalCore.SocialFlow.RealWorld.Cognition.ProgressiveEnrichment do
  @moduledoc """
  Progressive enrichment / private prefetch.

  If time is almost aligned, privately prepare likely next-place calculations
  so "A couple places fit" can appear nearly instantly after confirmation.

  Never expose premature results. Never reckless expensive provider calls.
  """

  @doc """
  Decide what may be prefetched privately given current gap state.
  """
  def plan_prefetch(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      a["gap"] == "time" and a["time_almost_aligned"] == true ->
        {:ok,
         %{
           "prefetch" => ["place_candidates", "travel_burden_sketch"],
           "expose_now" => false,
           "max_provider_calls" => 0,
           "reason" => "time_almost_aligned"
         }}

      a["gap"] == "place" and a["time_aligned"] == true ->
        {:ok,
         %{
           "prefetch" => ["provider_availability_sketch"],
           "expose_now" => false,
           "max_provider_calls" => if(a["budget_ok"] == true, do: 2, else: 0),
           "reason" => "place_gap_open"
         }}

      a["gap"] == "time" and a["confidence"] != nil and to_float(a["confidence"]) < 0.5 ->
        {:ok,
         %{
           "prefetch" => [],
           "expose_now" => false,
           "max_provider_calls" => 0,
           "reason" => "too_uncertain"
         }}

      true ->
        {:ok,
         %{
           "prefetch" => [],
           "expose_now" => false,
           "max_provider_calls" => 0,
           "reason" => "no_prefetch"
         }}
    end
  end

  def plan_prefetch(_), do: {:ok, %{"prefetch" => [], "expose_now" => false}}

  @doc "Materialize a private enrichment result that must stay unexposed."
  def private_result(kind, payload) when is_binary(kind) and is_map(payload) do
    %{
      "kind" => kind,
      "payload" => payload,
      "expose_now" => false,
      "private" => true,
      "authorizes_set" => false
    }
  end

  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> 0.0
    end
  end

  defp to_float(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

defmodule OpalCore.SocialFlow.RealWorld.Cognition.LeaveTime do
  @moduledoc """
  Private leave-by intelligence after Set.

  Step eliminated: manually estimating when to leave.
  Never shares private origin. Shared thread may only get authorized ETA.
  """

  @doc """
  Compute private leave-by time.

  Requires plan_start and travel_minutes. Optional buffer_minutes (default 10).
  """
  def compute(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, plan_start} <- parse_dt(a["plan_start"]),
         travel when is_number(travel) <- to_num(a["travel_minutes"]) do
      buffer = to_num(a["buffer_minutes"]) || 10
      leave_by = DateTime.add(plan_start, -round((travel + buffer) * 60), :second)

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "leave_by" => leave_by,
         "plan_start" => plan_start,
         "travel_minutes_internal" => travel,
         "buffer_minutes" => buffer,
         "permission_class" => "owner_private",
         "shared_safe_summary" => nil,
         "origin_exposed" => false,
         "authorizes_set" => false
       }}
    else
      _ -> {:error, :insufficient_context}
    end
  end

  def compute(_), do: {:error, :invalid}

  @doc "Authorized share of movement state only — never origin."
  def shared_on_the_way(leave_result, opts \\ []) when is_map(leave_result) do
    if Keyword.get(opts, :user_authorized) == true do
      {:ok,
       %{
         "shared_safe" => true,
         "summary" => Keyword.get(opts, :summary, "On the way"),
         "origin_exposed" => false,
         "leave_by_exposed" => false
       }}
    else
      {:error, :user_authorization_required}
    end
  end

  defp parse_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> :error
    end
  end

  defp parse_dt(_), do: :error

  defp to_num(nil), do: nil
  defp to_num(n) when is_number(n), do: n * 1.0

  defp to_num(s) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp to_num(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

defmodule OpalCore.SocialFlow.RealWorld.Calendar.Connector do
  @moduledoc """
  Provider-neutral calendar boundary.

  Alignment never sees Google/Apple/Outlook payloads — only free/busy facts.

  Step eliminated: “let me check my calendar.”

  Live OAuth is **not** claimed. Implementations plug via adapter behaviour.
  Default adapter is an in-process store for tests and local development.
  """

  alias OpalCore.SocialFlow.RealWorld.Calendar.FreeBusyStore
  alias OpalCore.SocialFlow.RealWorld.ContextSource

  @callback free_busy(user_id :: String.t(), range :: map()) ::
              {:ok, [map()]} | {:error, atom()}
  @callback calendar_permission(user_id :: String.t()) ::
              {:ok, map()} | {:error, atom()}
  @callback calendar_freshness(user_id :: String.t()) ::
              {:ok, map()} | {:error, atom()}

  def adapter do
    Application.get_env(
      :opal_core,
      :calendar_connector_adapter,
      FreeBusyStore
    )
  end

  @doc "Busy blocks for user in range — free/busy only, never titles."
  def free_busy(user_id, range) when is_binary(user_id) and is_map(range) do
    case adapter().free_busy(user_id, range) do
      {:ok, blocks} ->
        {:ok, Enum.map(blocks, &sanitize_block/1)}

      {:error, _} = err ->
        err
    end
  end

  def free_busy(_, _), do: {:error, :invalid}

  def calendar_permission(user_id) when is_binary(user_id) do
    adapter().calendar_permission(user_id)
  end

  def calendar_permission(_), do: {:error, :invalid}

  def calendar_freshness(user_id) when is_binary(user_id) do
    adapter().calendar_freshness(user_id)
  end

  def calendar_freshness(_), do: {:error, :invalid}

  @doc """
  Project free windows inside a horizon into ContextSource facts (owner-private).
  """
  def free_facts(user_id, range) when is_binary(user_id) and is_map(range) do
    with {:ok, perm} <- calendar_permission(user_id),
         true <- perm["granted"] == true || {:error, :permission_denied},
         {:ok, busy} <- free_busy(user_id, range),
         {:ok, free} <- invert_busy(busy, range) do
      facts =
        Enum.map(free, fn %{start_at: s, end_at: e} ->
          {:ok, fact} =
            ContextSource.build(%{
              source: "calendar_free_busy",
              owner_user_id: user_id,
              confidence: 0.9,
              permission_class: "owner_private",
              step_eliminated: "manual_calendar_check",
              payload: %{
                "start_at" => s,
                "end_at" => e,
                "busy" => false,
                "no_event_titles" => true
              }
            })

          fact
        end)

      {:ok, facts}
    end
  end

  def free_facts(_, _), do: {:error, :invalid}

  @doc "Whether interval is free given busy blocks (pure)."
  def free_during?(busy_blocks, %DateTime{} = start_at, %DateTime{} = end_at)
      when is_list(busy_blocks) do
    not Enum.any?(busy_blocks, fn b ->
      b = stringify(b)
      {:ok, bs} = parse_dt(b["start_at"] || b[:start_at])
      {:ok, be} = parse_dt(b["end_at"] || b[:end_at])
      overlaps?(bs, be, start_at, end_at)
    end)
  rescue
    _ -> false
  end

  def free_during?(_, _, _), do: false

  defp sanitize_block(block) when is_map(block) do
    b = stringify(block)

    %{
      "start_at" => b["start_at"],
      "end_at" => b["end_at"],
      "busy" => b["busy"] != false,
      "no_event_titles" => true,
      "calendar_id" => b["calendar_id"]
    }
    |> Map.reject(fn {_k, v} -> is_nil(v) end)
    |> then(fn m ->
      # Hard forbid titles leaking
      Map.drop(m, ~w(title event_title summary description attendees))
    end)
  end

  defp invert_busy(busy, range) do
    with {:ok, hs} <- parse_dt(range[:start_at] || range["start_at"]),
         {:ok, he} <- parse_dt(range[:end_at] || range["end_at"]) do
      blocks =
        busy
        |> Enum.map(&stringify/1)
        |> Enum.filter(&(&1["busy"] != false))
        |> Enum.map(fn b ->
          {:ok, s} = parse_dt(b["start_at"])
          {:ok, e} = parse_dt(b["end_at"])
          {s, e}
        end)
        |> Enum.sort_by(fn {s, _} -> DateTime.to_unix(s, :microsecond) end)

      free = subtract(hs, he, blocks)
      {:ok, Enum.map(free, fn {s, e} -> %{start_at: s, end_at: e} end)}
    end
  end

  defp subtract(start_at, end_at, []), do: [{start_at, end_at}]

  defp subtract(start_at, end_at, busy) do
    {free, cursor} =
      Enum.reduce(busy, {[], start_at}, fn {bs, be}, {acc, cur} ->
        cond do
          DateTime.compare(be, cur) != :gt ->
            {acc, cur}

          DateTime.compare(bs, cur) == :gt ->
            gap_end = min_dt(bs, end_at)

            if DateTime.compare(gap_end, cur) == :gt do
              {acc ++ [{cur, gap_end}], max_dt(cur, be)}
            else
              {acc, max_dt(cur, be)}
            end

          true ->
            {acc, max_dt(cur, be)}
        end
      end)

    if DateTime.compare(end_at, cursor) == :gt, do: free ++ [{cursor, end_at}], else: free
  end

  defp overlaps?(s1, e1, s2, e2) do
    DateTime.compare(e1, s2) == :gt and DateTime.compare(e2, s1) == :gt
  end

  defp max_dt(a, b), do: if(DateTime.compare(a, b) == :gt, do: a, else: b)
  defp min_dt(a, b), do: if(DateTime.compare(a, b) == :lt, do: a, else: b)

  defp parse_dt(%DateTime{} = dt), do: {:ok, DateTime.truncate(dt, :microsecond)}

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> {:error, :invalid_datetime}
    end
  end

  defp parse_dt(_), do: {:error, :invalid_datetime}

  defp stringify(%{__struct__: _} = s), do: s

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

defmodule OpalCoreWeb.AttentionCenterController do
  @moduledoc """
  Track A6.1 — product Attention Center projection.

  GET  /api/v1/product/attention
  POST /api/v1/product/attention/ingest   (dev/test + internal fixtures)
  POST /api/v1/product/attention/resolve
  POST /api/v1/product/attention/seen
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.AttentionCenter

  def show(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, AttentionCenter.feed(user_id))
  end

  def ingest(conn, params) do
    user_id = conn.assigns.current_user_id
    event = stringify(params["event"] || params)

    # Scope ingest to authenticated user as a participant when missing.
    event =
      event
      |> Map.put_new("participants", [user_id])
      |> then(fn e ->
        if is_list(e["participants"]) and user_id not in e["participants"],
          do: Map.put(e, "participants", [user_id | e["participants"]]),
          else: e
      end)

    case AttentionCenter.ingest(event) do
      {:ok, _items} ->
        json(conn, AttentionCenter.feed(user_id))

      {:error, reason} ->
        conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
    end
  end

  def resolve(conn, params) do
    user_id = conn.assigns.current_user_id
    id = params["id"] || params["dedupe_key"]

    cond do
      not is_binary(id) or id == "" ->
        conn |> put_status(422) |> json(%{"error_code" => "id_required"})

      true ->
        case AttentionCenter.resolve(user_id, id) do
          {:ok, _} ->
            json(conn, AttentionCenter.feed(user_id))

          {:error, :not_found} ->
            conn |> put_status(404) |> json(%{"error_code" => "not_found"})

          {:error, :forbidden} ->
            conn |> put_status(403) |> json(%{"error_code" => "forbidden"})

          {:error, reason} ->
            conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
        end
    end
  end

  def seen(conn, params) do
    user_id = conn.assigns.current_user_id
    ids = params["ids"] || :all

    {:ok, _} = AttentionCenter.mark_seen(user_id, ids)
    json(conn, AttentionCenter.feed(user_id))
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  defp stringify_val(v) when is_map(v), do: stringify(v)
  defp stringify_val(v) when is_list(v), do: Enum.map(v, &stringify_val/1)
  defp stringify_val(v), do: v
end

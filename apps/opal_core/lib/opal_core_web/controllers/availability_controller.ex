defmodule OpalCoreWeb.AvailabilityController do
  @moduledoc """
  Product HTTP surface for additive availability alignment.

  Nested under conversations. No shell redesign; optional Find-a-time clients only.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.Availability
  alias OpalCore.SocialFlow.AvailabilityWindow

  # GET /api/v1/product/availability/windows — my private windows
  def index_windows(conn, _params) do
    user_id = conn.assigns.current_user_id
    windows = Availability.list_my_windows(user_id)

    json(conn, %{
      "windows" => Enum.map(windows, &AvailabilityWindow.to_owner_contract/1),
      "private" => true
    })
  end

  # POST /api/v1/product/availability/windows
  def create_window(conn, params) do
    user_id = conn.assigns.current_user_id

    case parse_dt(params["start_at"]) do
      {:ok, start_at} ->
        case parse_dt(params["end_at"]) do
          {:ok, end_at} ->
            attrs = %{
              owner_user_id: user_id,
              start_at: start_at,
              end_at: end_at,
              timezone: params["timezone"] || "UTC",
              source: params["source"] || "manual",
              expires_at: parse_dt_optional(params["expires_at"])
            }

            case Availability.create_window(attrs) do
              {:ok, w} ->
                conn
                |> put_status(201)
                |> json(%{
                  "window" => AvailabilityWindow.to_owner_contract(w),
                  "private" => true
                })

              {:error, :source_not_enabled} ->
                error(
                  conn,
                  422,
                  "source_not_enabled",
                  "Only manual times are available right now"
                )

              {:error, :rate_limited} ->
                error(conn, 429, "rate_limited", "Please wait a moment and try again.")

              {:error, cs} ->
                error(conn, 422, "invalid_window", inspect(cs.errors))
            end

          {:error, _} ->
            error(conn, 422, "invalid_end_at", "Choose an end time")
        end

      {:error, _} ->
        error(conn, 422, "invalid_start_at", "Choose a start time")
    end
  end

  # DELETE /api/v1/product/availability/windows/:window_id
  def delete_window(conn, %{"window_id" => window_id}) do
    user_id = conn.assigns.current_user_id

    case Availability.delete_window(user_id, window_id) do
      {:ok, _} ->
        json(conn, %{"deleted" => true})

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "You cannot change that time")

      {:error, :not_found} ->
        error(conn, 404, "not_found", "That time is not available")

      {:error, _} ->
        error(conn, 422, "delete_failed", "Could not remove that time")
    end
  end

  # PATCH /api/v1/product/availability/windows/:window_id
  def update_window(conn, %{"window_id" => window_id} = params) do
    user_id = conn.assigns.current_user_id

    attrs =
      %{}
      |> maybe_put_dt(:start_at, params["start_at"])
      |> maybe_put_dt(:end_at, params["end_at"])
      |> then(fn m ->
        if is_binary(params["timezone"]), do: Map.put(m, :timezone, params["timezone"]), else: m
      end)

    case Availability.update_window(user_id, window_id, attrs) do
      {:ok, w} ->
        json(conn, %{"window" => AvailabilityWindow.to_owner_contract(w), "private" => true})

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "You cannot change that time")

      {:error, :not_found} ->
        error(conn, 404, "not_found", "That time is not available")

      {:error, cs} ->
        error(conn, 422, "invalid_window", inspect(cs.errors))
    end
  end

  # POST /api/v1/product/conversations/:id/availability/share
  def share(conn, %{"id" => conversation_id} = params) do
    user_id = conn.assigns.current_user_id
    window_ids = List.wrap(params["window_ids"] || params["window_id"])

    case Availability.share_windows(%{
           owner_user_id: user_id,
           conversation_id: conversation_id,
           window_ids: window_ids
         }) do
      {:ok, _shares, projections} ->
        Enum.each(projections, fn proj ->
          Availability.assert_shared_safe!(proj)

          OpalCoreWeb.Endpoint.broadcast(
            "conversation:#{conversation_id}",
            "availability:shared",
            proj
          )
        end)

        overlap =
          case Availability.compute_overlap(conversation_id, user_id) do
            {:ok, o} -> o
            _ -> nil
          end

        conn
        |> put_status(201)
        |> json(%{
          "shared" => projections,
          "overlap" => overlap,
          "private_schedule_hidden" => true
        })

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")

      {:error, :blocked} ->
        error(conn, 403, "blocked", "Could not share a time")

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "Could not share that time")

      {:error, :window_ids_required} ->
        error(conn, 422, "window_ids_required", "Choose a time to share")

      {:error, :window_expired} ->
        error(conn, 422, "window_expired", "That time is no longer available")

      {:error, :rate_limited} ->
        error(conn, 429, "rate_limited", "Please wait a moment and try again.")

      {:error, _} ->
        error(conn, 422, "share_failed", "Could not share those times")
    end
  end

  # POST /api/v1/product/conversations/:id/availability/shares/:share_id/revoke
  def revoke(conn, %{"id" => conversation_id, "share_id" => share_id}) do
    user_id = conn.assigns.current_user_id

    case Availability.revoke_share(user_id, share_id, conversation_id) do
      {:ok, share} ->
        OpalCoreWeb.Endpoint.broadcast(
          "conversation:#{conversation_id}",
          "availability:revoked",
          %{
            "schema_version" => "0.1.0",
            "conversation_id" => conversation_id,
            "share_id" => share.id,
            "shared_safe" => true
          }
        )

        json(conn, %{"revoked" => true, "share_id" => share.id})

      {:error, :forbidden} ->
        error(conn, 403, "forbidden", "You cannot change that share")

      {:error, :not_found} ->
        error(conn, 404, "not_found", "That share is not available")

      {:error, :already_revoked} ->
        json(conn, %{"revoked" => true, "share_id" => share_id, "origin" => "idempotent"})

      {:error, _} ->
        error(conn, 422, "revoke_failed", "Could not update that share")
    end
  end

  # GET /api/v1/product/conversations/:id/availability/shared
  def list_shared(conn, %{"id" => conversation_id}) do
    user_id = conn.assigns.current_user_id

    case Availability.list_shared_safe(conversation_id, user_id) do
      {:ok, list} ->
        Enum.each(list, &Availability.assert_shared_safe!/1)
        json(conn, %{"shared" => list, "private_schedule_hidden" => true})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")
    end
  end

  # GET /api/v1/product/conversations/:id/availability/mine
  def list_mine_in_conversation(conn, %{"id" => conversation_id}) do
    user_id = conn.assigns.current_user_id

    case Availability.list_my_shares(conversation_id, user_id) do
      {:ok, list} ->
        json(conn, %{"shares" => list, "private" => true})

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")
    end
  end

  # GET /api/v1/product/conversations/:id/availability/overlap
  def overlap(conn, %{"id" => conversation_id}) do
    user_id = conn.assigns.current_user_id

    case Availability.compute_overlap(conversation_id, user_id) do
      {:ok, result} ->
        Availability.assert_shared_safe!(result)
        json(conn, result)

      {:error, :not_a_member} ->
        error(conn, 403, "not_a_member", "You are not in this conversation")
    end
  end

  defp parse_dt(nil), do: {:error, :missing}
  defp parse_dt(""), do: {:error, :missing}

  defp parse_dt(str) when is_binary(str) do
    case DateTime.from_iso8601(str) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :microsecond)}
      _ -> {:error, :invalid}
    end
  end

  defp parse_dt(_), do: {:error, :invalid}

  defp parse_dt_optional(nil), do: nil
  defp parse_dt_optional(""), do: nil

  defp parse_dt_optional(str) when is_binary(str) do
    case parse_dt(str) do
      {:ok, dt} -> dt
      _ -> nil
    end
  end

  defp maybe_put_dt(map, _key, nil), do: map
  defp maybe_put_dt(map, _key, ""), do: map

  defp maybe_put_dt(map, key, str) when is_binary(str) do
    case parse_dt(str) do
      {:ok, dt} -> Map.put(map, key, dt)
      _ -> map
    end
  end

  defp error(conn, status, code, message) do
    conn
    |> put_status(status)
    |> json(%{"error_code" => code, "message" => message})
  end
end

defmodule OpalCoreWeb.LivesController do
  @moduledoc "Paste K — lives, stickers, venue pay, presence reports."

  use OpalCoreWeb, :controller

  alias OpalCore.Lives
  alias OpalCore.Lives.{LiveRoom, LiveSticker, Stickers, Venue}

  def go_live_copy(conn, _params) do
    json(conn, Lives.go_live_copy())
  end

  def catalog(conn, _params) do
    json(conn, Lives.catalog())
  end

  def go_live(conn, params) do
    user_id = conn.assigns.current_user_id
    place_id = params["place_id"]

    cond do
      is_binary(params["venue_name"]) and (place_id in [nil, ""]) ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          "error" => "venue_not_found",
          "message" => "we couldn't find that venue — try searching"
        })

      not is_binary(place_id) or place_id == "" ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{"error" => "place_id_required", "message" => "Where are you?"})

      true ->
        opts = [
          title: params["title"],
          allow_fixture: Mix.env() != :prod,
          name: params["name"],
          address: params["address"],
          types: params["types"]
        ]

        case Lives.go_live(user_id, place_id, opts) do
          {:ok, %{live_room: room, venue: venue}} ->
            conn
            |> put_status(:created)
            |> json(%{
              "live_room" => LiveRoom.to_contract(room, venue),
              "consequence" => "Anyone can see you're at #{venue.name}",
              "trade" =>
                "Confirmed venues get discovered on the heat map — that's how your people (and new fans) find you."
            })

          {:error, :residential, msg} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => "residential", "message" => msg})

          {:error, :venue_not_found, msg} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => "venue_not_found", "message" => msg})

          {:error, :place_id_required} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => "place_id_required"})

          {:error, :new_venue_rate_limited} ->
            conn
            |> put_status(:too_many_requests)
            |> json(%{"error" => "new_venue_rate_limited"})

          {:error, :venue_live_rate_limited} ->
            conn
            |> put_status(:too_many_requests)
            |> json(%{"error" => "venue_live_rate_limited"})

          {:error, reason} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => error_string(reason)})
        end
    end
  end

  def show(conn, %{"id" => id}) do
    case Lives.get_live(id) do
      {:ok, room, venue} ->
        json(conn, %{"live_room" => LiveRoom.to_contract(room, venue)})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def end_live(conn, %{"id" => id}) do
    case Lives.end_live(id, conn.assigns.current_user_id) do
      {:ok, room} ->
        json(conn, %{"live_room" => LiveRoom.to_contract(room)})

      {:error, :forbidden} ->
        conn |> put_status(:forbidden) |> json(%{"error" => "forbidden"})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def report_presence(conn, %{"id" => id}) do
    case Lives.report_host_not_here(id, conn.assigns.current_user_id) do
      {:ok, result} ->
        json(conn, %{
          "ok" => true,
          "flagged" => result.flagged,
          "presence_report_count" => result.live_room.presence_report_count,
          "heat_contribution_frozen" => result.live_room.heat_contribution_frozen
        })

      {:error, :already_reported} ->
        json(conn, %{"ok" => true, "already_reported" => true})

      {:error, :cannot_report_own_live} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "cannot_report_own_live"})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def send_sticker(conn, %{"id" => id} = params) do
    key = params["sticker_key"] || params["key"]
    idem = params["idempotency_key"]

    cond do
      not is_binary(key) or key == "" ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "sticker_key_required"})

      not is_binary(idem) or idem == "" ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "idempotency_key_required"})

      true ->
        case Lives.send_sticker(id, conn.assigns.current_user_id, key, idem) do
          {:ok, sticker, origin} ->
            display = Stickers.host_display(sticker, params["sender_name"] || "Someone")

            json(conn, %{
              "sticker" => LiveSticker.to_contract(sticker),
              "display" => display,
              "origin" => to_string(origin),
              "honesty" => "Stickers use test credits for now.",
              "test_mode" => sticker.test_mode,
              "live_money_flag" => "OPAL_STICKER_LIVE_MONEY"
            })

          {:error, :self_gifting_forbidden} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => "self_gifting_forbidden"})

          {:error, :stickers_disabled_quarantine} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => "stickers_disabled_quarantine"})

          {:error, :insufficient_balance} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => "insufficient_balance"})

          {:error, reason} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => error_string(reason)})
        end
    end
  end

  def venue_show(conn, %{"id" => id}) do
    case Lives.get_venue(id) do
      %Venue{} = v ->
        json(conn, %{"venue" => Venue.to_public_contract(v)})

      nil ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def venue_qr(conn, %{"id" => id}) do
    case Lives.venue_qr(id) do
      {:ok, payload} ->
        json(conn, payload)

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def venue_pay(conn, params) do
    token = params["token"] || params["pay_token"] || params["venue_id"]
    amount = parse_int(params["amount_cents"])
    idem = params["idempotency_key"]

    cond do
      not is_binary(token) or token == "" ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "token_required"})

      not is_integer(amount) or amount <= 0 ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "invalid_amount"})

      not is_binary(idem) or idem == "" ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "idempotency_key_required"})

      true ->
        case Lives.pay_venue(token, conn.assigns.current_user_id, amount, idem) do
          {:ok, _payment, receipt, origin} ->
            json(conn, %{
              "receipt" => receipt,
              "origin" => to_string(origin),
              "honesty" => if(receipt["test_mode"], do: "test payment", else: nil),
              "live_money_flag" => "OPAL_PAY_LIVE_MONEY"
            })

          {:error, reason} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"error" => error_string(reason)})
        end
    end
  end

  def scan_presence(conn, params) do
    token = params["token"] || params["pay_token"]

    case Lives.scan_presence(token, conn.assigns.current_user_id,
           live_room_id: params["live_room_id"]
         ) do
      {:ok, result} ->
        json(conn, %{
          "verified_presence" => true,
          "venue" => Venue.to_public_contract(result.venue),
          "scan_id" => result.scan.id
        })

      {:error, :invalid_token} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "invalid_token"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def contributors(conn, %{"id" => id} = params) do
    circle? = params["circle"] in ["1", "true", true]

    case Lives.contributors(id, conn.assigns.current_user_id, circle?: circle?) do
      {:ok, payload} ->
        json(conn, payload)
    end
  end

  def streaks(conn, _params) do
    json(conn, %{
      "streaks" => Lives.private_streaks(conn.assigns.current_user_id),
      "private" => true,
      "leaderboard" => false
    })
  end

  def reward(conn, %{"id" => venue_id} = params) do
    amount = parse_int(params["amount_cents"])
    contributor = params["contributor_account_id"]
    idem = params["idempotency_key"]

    case Lives.reward_contributor(venue_id, contributor, amount, idem) do
      {:ok, reward, origin} ->
        json(conn, %{
          "reward_id" => reward.id,
          "amount_cents" => reward.amount_cents,
          "test_mode" => reward.test_mode,
          "origin" => to_string(origin)
        })

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  defp parse_int(n) when is_integer(n), do: n

  defp parse_int(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> nil
    end
  end

  defp parse_int(_), do: nil

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(%Ecto.Changeset{}), do: "invalid"
  defp error_string(other), do: inspect(other)
end

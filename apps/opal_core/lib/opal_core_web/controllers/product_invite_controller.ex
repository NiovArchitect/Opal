defmodule OpalCoreWeb.ProductInviteController do
  @moduledoc """
  Phase NE-1 — product invite HTTP API.

  POST   /api/v1/product/invites
  GET    /api/v1/product/invites
  GET    /api/v1/product/invites/:code/validate  (public)
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Accounts.User
  alias OpalCore.Invites
  alias OpalCore.Repo

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case Invites.create_invite(user_id, params) do
      {:ok, invite} ->
        inviter = Repo.get!(User, user_id)
        delivery = Invites.maybe_deliver(invite, inviter)

        conn
        |> put_status(201)
        |> json(%{
          "invite" => Invites.to_contract(invite),
          "code" => invite.code,
          "share_url" => Invites.share_url(invite.code),
          "delivery" => delivery
        })

      {:error, :rate_limited} ->
        conn
        |> put_status(429)
        |> json(%{
          "error_code" => "rate_limited",
          "message" => "You've sent quite a few invites today — try again tomorrow."
        })

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => "invalid", "reason" => to_string(reason)})
    end
  end

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    invites = Invites.for_inviter(user_id)

    json(conn, %{
      "invites" => Enum.map(invites, &Invites.to_contract/1),
      "pending_count" => Invites.pending_for_inviter(user_id),
      "rewards" => rewards_contract(user_id)
    })
  end

  def validate(conn, %{"code" => code}) do
    case Invites.validate_code(code) do
      {:ok, invite} ->
        # Soft open mark — idempotent.
        _ = Invites.mark_opened(code)
        json(conn, Invites.validate_contract(invite))

      {:error, :already_joined} ->
        conn
        |> put_status(404)
        |> json(%{"error_code" => "already_joined", "valid" => false})

      {:error, _} ->
        conn
        |> put_status(404)
        |> json(%{"error_code" => "not_found", "valid" => false})
    end
  end

  defp rewards_contract(user_id) do
    case Invites.rewards_for(user_id) do
      nil -> %{"successful_invites" => 0}
      row -> %{"successful_invites" => row.successful_invites}
    end
  end

  defp unprocessable(conn, %Ecto.Changeset{} = cs) do
    conn
    |> put_status(422)
    |> json(%{
      "error_code" => "invalid",
      "errors" =>
        Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
          Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
            opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
          end)
        end)
    })
  end
end

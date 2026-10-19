defmodule OpalCoreWeb.SoulMemoryController do
  @moduledoc """
  Repair #18 SM scoped build - Soul + Memory HTTP API.

  GET    /api/v1/product/memory-wallet           wallet + soul + capsules
  PATCH  /api/v1/product/memory-wallet/soul      edit the soul (real truth)
  POST   /api/v1/product/memory-wallet/capsules  remember a new capsule
  DELETE /api/v1/product/memory-wallet/capsules/:id  forget (truly deletes)

  Every capsule read and write here goes through the ONE mediated
  facade (`CapsuleRead`); the soul reads and writes the existing
  assistance-preference truth through `Soul` (no parallel store).
  The caller is always `conn.assigns.current_user_id` - there is no
  parameter that names another account, by construction.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.MemoryWallet
  alias OpalCore.MemoryWallet.{CapsuleRead, PersonalMemoryCapsule, Soul, Wallet}

  def show(conn, _params) do
    user_id = conn.assigns.current_user_id

    with {:ok, wallet} <- MemoryWallet.ensure_wallet(user_id),
         {:ok, soul} <- Soul.soul_for(user_id) do
      capsules =
        user_id
        |> CapsuleRead.list_for_owner_browse()
        |> Enum.map(&PersonalMemoryCapsule.to_contract/1)

      json(conn, %{
        "wallet" => Wallet.to_contract(wallet),
        "soul" => soul,
        "capsules" => capsules,
        "capsule_count" => length(capsules)
      })
    else
      _ -> render_error(conn, 422, "soul_unavailable", "Your Soul and Memory could not load.")
    end
  end

  def update_soul(conn, params) do
    user_id = conn.assigns.current_user_id

    case Soul.update_soul(user_id, params) do
      {:ok, soul} ->
        json(conn, %{"soul" => soul})

      {:error, :nothing_to_save} ->
        render_error(
          conn,
          422,
          "nothing_to_save",
          "Nothing to save. Change a Soul setting first."
        )

      {:error, %Ecto.Changeset{}} ->
        render_error(
          conn,
          422,
          "soul_invalid",
          "That Soul setting could not be saved. Check the values and try again."
        )

      _ ->
        render_error(conn, 422, "soul_invalid", "That Soul setting could not be saved.")
    end
  end

  def create_capsule(conn, params) do
    user_id = conn.assigns.current_user_id

    case CapsuleRead.remember(user_id, params) do
      {:ok, capsule} ->
        conn
        |> put_status(201)
        |> json(%{"capsule" => PersonalMemoryCapsule.to_contract(capsule)})

      {:error, :summary_required} ->
        render_error(conn, 422, "summary_required", "Say what Opal should remember.")

      {:error, _} ->
        render_error(conn, 422, "capsule_invalid", "That memory could not be saved.")
    end
  end

  def forget_capsule(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case CapsuleRead.forget(user_id, id) do
      {:ok, :forgotten, source} ->
        json(conn, %{"forgotten" => true, "source" => Atom.to_string(source)})

      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{"error_code" => "not_found"})

      {:error, _} ->
        render_error(conn, 422, "could_not_forget", "That memory could not be forgotten.")
    end
  end

  defp render_error(conn, status, code, message) do
    conn |> put_status(status) |> json(%{"error_code" => code, "message" => message})
  end
end

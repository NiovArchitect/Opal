defmodule OpalCoreWeb.SettingsAccountController do
  @moduledoc """
  Adoption wave 2 - the account/settings cluster endpoints.

  - 4.C2 devices: GET the real session roster (the DeviceSession
    store `TrustSafety.list_sessions/1` reads), POST revoke - which
    kills the session server-side, so the revoked device is signed
    out on its next request (`ProductSession.authenticate/1` reads
    the same store).
  - 4.C3 saved logins: hosts ONLY in every payload. Add/remove.
    There is deliberately NO endpoint that returns a value.
  - SF-A what Opal hears: per-source lines, and a retry that
    re-derives exactly one source (ER-2).
  - 4.C6 delete: self-serve data/account deletion returning the
    completion receipt. The support path (SupportController)
    executes the identical `AccountDeletion.execute/3`.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Accounts.AccountActivity
  alias OpalCore.Accounts.AccountDeletion
  alias OpalCore.Accounts.DeletionReceipt
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Settings.IngestionStatus
  alias OpalCore.Settings.SavedLogin
  alias OpalCore.Settings.SavedLogins
  alias OpalCore.SocialFlow.TrustSafety

  # --- 4.C2 devices ---------------------------------------------------

  def devices_index(conn, _params) do
    user_id = conn.assigns.current_user_id
    current_session_id = conn.assigns.current_session && conn.assigns.current_session.id

    devices =
      Enum.map(TrustSafety.list_sessions(user_id), fn contract ->
        Map.put(contract, "is_current", contract["id"] == current_session_id)
      end)

    json(conn, %{"devices" => devices})
  end

  def devices_revoke(conn, %{"id" => session_id}) do
    user_id = conn.assigns.current_user_id

    case ProductSession.revoke_by_ids(user_id, session_id) do
      {:ok, _session} ->
        _ =
          AccountActivity.record(user_id, "device_revoked", session_id, %{
            "session_id" => session_id
          })

        json(conn, %{"revoked" => true, "session_id" => session_id})

      {:error, :forbidden} ->
        conn |> put_status(403) |> json(%{"error_code" => "forbidden"})

      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{"error_code" => "not_found"})

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "could_not_revoke"})
    end
  end

  # --- 4.C3 saved logins ------------------------------------------------

  def saved_logins_index(conn, _params) do
    logins =
      conn.assigns.current_user_id
      |> SavedLogins.list_for_user()
      |> Enum.map(&SavedLogin.to_contract/1)

    json(conn, %{"saved_logins" => logins})
  end

  def saved_logins_create(conn, params) do
    user_id = conn.assigns.current_user_id

    case SavedLogins.add(user_id, params["host"], params["secret"]) do
      {:ok, login} ->
        conn
        |> put_status(201)
        |> json(%{"saved_login" => SavedLogin.to_contract(login)})

      {:error, :invalid_host} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid_host",
          "message" => "Add the site name, like api.example.com."
        })

      {:error, %Ecto.Changeset{}} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "saved_login_invalid",
          "message" => "That login could not be saved. It may already be saved for that site."
        })

      {:error, _} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "saved_login_invalid",
          "message" => "That login could not be saved."
        })
    end
  end

  def saved_logins_delete(conn, %{"id" => id}) do
    case SavedLogins.remove(conn.assigns.current_user_id, id) do
      {:ok, _login} -> json(conn, %{"removed" => true})
      {:error, :not_found} -> conn |> put_status(404) |> json(%{"error_code" => "not_found"})
      {:error, _} -> conn |> put_status(422) |> json(%{"error_code" => "could_not_remove"})
    end
  end

  def activity_index(conn, _params) do
    entries =
      conn.assigns.current_user_id
      |> AccountActivity.list_for_user()
      |> Enum.map(&OpalCore.Accounts.ActivityEntry.to_contract/1)

    json(conn, %{"activity" => entries})
  end

  # --- SF-A what Opal hears ----------------------------------------------

  def hears_index(conn, _params) do
    sources = IngestionStatus.status_for_user(conn.assigns.current_user_id)
    json(conn, %{"sources" => sources})
  end

  def hears_retry(conn, %{"source" => source}) do
    case IngestionStatus.retry_source(conn.assigns.current_user_id, source) do
      {:ok, line} ->
        json(conn, %{"source_line" => line})

      {:error, :unknown_source} ->
        conn |> put_status(422) |> json(%{"error_code" => "unknown_source"})
    end
  end

  def hears_retry(conn, _params) do
    conn |> put_status(422) |> json(%{"error_code" => "unknown_source"})
  end

  # --- 4.C6 delete ---------------------------------------------------------

  def delete_execute(conn, params) do
    mode = params["mode"]
    confirmed = params["confirm"] == true or params["confirm"] == "true"

    cond do
      mode not in ["data", "account"] ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid_mode",
          "message" => "Choose delete my data or delete my account."
        })

      not confirmed ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "confirmation_required",
          "message" => "Deletion needs an explicit confirmation."
        })

      true ->
        case AccountDeletion.execute(conn.assigns.current_user_id, mode, "self_serve") do
          {:ok, receipt} ->
            conn
            |> put_status(201)
            |> json(%{"receipt" => DeletionReceipt.to_contract(receipt)})

          {:error, :already_deleted} ->
            conn |> put_status(409) |> json(%{"error_code" => "already_deleted"})

          {:error, :receipt_reference_exhausted} ->
            conn
            |> put_status(422)
            |> json(%{"error_code" => "receipt_reference_exhausted"})

          {:error, _} ->
            conn |> put_status(422) |> json(%{"error_code" => "deletion_failed"})
        end
    end
  end
end

defmodule OpalCoreWeb.SupportController do
  @moduledoc """
  Repair #18 DIR-2 / Muse settings audit spec 4.A5 — the support
  intake surface behind Settings > Help & support.

  POST creates one submission in the real intake and returns the
  reference the person can quote; GET reads one back by reference,
  owner-scoped. The accepted payload is exactly what the page's
  disclosure lists: words, kind, category, served build identity.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Support
  alias OpalCore.Support.SupportReport

  def create_report(conn, params) do
    attrs = %{
      kind: params["kind"],
      category: params["category"],
      body: params["body"],
      build_ref: params["build_ref"],
      entry_point: params["entry_point"],
      # Repair #18 hardening: the client's retry key, when it sends
      # one - a repeat under the same key returns the original
      # report instead of filing a duplicate.
      idempotency_key: params["idempotency_key"]
    }

    case Support.submit(conn.assigns.current_user_id, attrs) do
      {:ok, report} ->
        conn
        |> put_status(201)
        |> json(%{"report" => SupportReport.to_reporter_contract(report)})

      {:error, changeset} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "support_report_invalid",
          "message" => "Add a few words about what happened, pick a category, and try again.",
          "fields" => error_fields(changeset)
        })
    end
  end

  def show_report(conn, %{"reference" => reference}) do
    case Support.fetch_for_user(conn.assigns.current_user_id, reference) do
      {:ok, report} ->
        json(conn, %{"report" => SupportReport.to_reporter_contract(report)})

      {:error, :not_found} ->
        conn
        |> put_status(404)
        |> json(%{
          "error_code" => "not_found",
          "message" => "No submission with that reference on this account."
        })
    end
  end

  @doc """
  Spec 4.C6 support-path parity: a deletion asked for through
  support executes the IDENTICAL `AccountDeletion.execute/3` as the
  self-serve route - same modes, same shared-truth scoping, same
  receipt - with the source recorded as "support" on the receipt.
  """
  def account_deletion(conn, params) do
    mode = params["mode"]
    confirmed = params["confirm"] == true or params["confirm"] == "true"

    if mode in ["data", "account"] and confirmed do
      case OpalCore.Accounts.AccountDeletion.execute(
             conn.assigns.current_user_id,
             mode,
             "support"
           ) do
        {:ok, receipt} ->
          conn
          |> put_status(201)
          |> json(%{"receipt" => OpalCore.Accounts.DeletionReceipt.to_contract(receipt)})

        {:error, :already_deleted} ->
          conn |> put_status(409) |> json(%{"error_code" => "already_deleted"})

        {:error, :receipt_reference_exhausted} ->
          conn
          |> put_status(422)
          |> json(%{"error_code" => "receipt_reference_exhausted"})

        {:error, _} ->
          conn |> put_status(422) |> json(%{"error_code" => "deletion_failed"})
      end
    else
      conn
      |> put_status(422)
      |> json(%{
        "error_code" => "invalid_deletion_request",
        "message" => "Choose delete my data or delete my account, and confirm it."
      })
    end
  end

  defp error_fields(changeset) do
    Enum.map(changeset.errors, fn {field, _} -> to_string(field) end)
  end
end

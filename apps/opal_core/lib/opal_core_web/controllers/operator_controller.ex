defmodule OpalCoreWeb.OperatorController do
  @moduledoc """
  Temporary, tightly restricted operator actions for synthetic hosted environments.

  Routes are only registered when OPAL_ALLOW_SMOKE_CLEANUP is enabled.
  Must not remain enabled after one-time cleanup.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.SmokeResidue

  def smoke_cleanup(conn, params) do
    with :ok <- ensure_enabled(),
         :ok <- ensure_synthetic_fixture_only(),
         :ok <- ensure_operator_secret(conn) do
      dry_run? = truthy?(params["dry_run"])

      {count, _ids} = SmokeResidue.cleanup!(force: true, dry_run: dry_run?)

      # Counts only — never return message bodies, phones, tokens, or raw IDs.
      json(conn, %{
        "ok" => true,
        "dry_run" => dry_run?,
        "matched" => count,
        "deleted" => if(dry_run?, do: 0, else: count),
        "status" =>
          if(dry_run?, do: "dry_run", else: if(count == 0, do: "clean", else: "deleted"))
      })
    else
      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{"error_code" => "not_found"})

      {:error, :forbidden} ->
        conn |> put_status(403) |> json(%{"error_code" => "forbidden"})
    end
  end

  defp ensure_enabled do
    if System.get_env("OPAL_ALLOW_SMOKE_CLEANUP") in ~w(true 1 yes) do
      :ok
    else
      {:error, :not_found}
    end
  end

  defp ensure_synthetic_fixture_only do
    if System.get_env("OPAL_SYNTHETIC_FIXTURE_ONLY") in ~w(true 1 yes) or
         Application.get_env(:opal_core, :synthetic_fixture_only) == true do
      :ok
    else
      {:error, :forbidden}
    end
  end

  defp ensure_operator_secret(conn) do
    expected = System.get_env("OPAL_SMOKE_CLEANUP_SECRET") || ""
    provided = conn |> get_req_header("x-opal-operator-secret") |> List.first() || ""

    if expected != "" and secure_compare(expected, provided) do
      :ok
    else
      {:error, :forbidden}
    end
  end

  defp truthy?(v) when v in [true, "true", "1", 1, "yes"], do: true
  defp truthy?(_), do: false

  defp secure_compare(a, b) when is_binary(a) and is_binary(b) do
    if byte_size(a) == byte_size(b) and a != "" do
      Plug.Crypto.secure_compare(a, b)
    else
      false
    end
  end
end

defmodule OpalCoreWeb.CelebrationController do
  @moduledoc """
  Phase 10A / D-2 — celebrations HTTP API.

  GET    /api/v1/product/celebrations
  POST   /api/v1/product/celebrations
  DELETE /api/v1/product/celebrations/:id
  GET    /api/v1/product/celebrations/:id/curate
  """

  use OpalCoreWeb, :controller

  alias OpalCore.CelebrationCuration
  alias OpalCore.Celebrations
  alias OpalCore.TrustTiers

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    case Celebrations.list_for_user(user_id) do
      {:ok, list} ->
        celebrations =
          Enum.map(list, fn c ->
            contract = Celebrations.to_contract(c)

            case CelebrationCuration.top_plan_idea(user_id, c.id) do
              idea when is_binary(idea) and idea != "" ->
                Map.put(contract, "would_love", idea)

              _ ->
                contract
            end
          end)

        json(conn, %{"celebrations" => celebrations})

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  @doc "Phase D-2 — curated gift/plan ideas for one celebration."
  def curate(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    # Ownership first (404), then trust gate (403).
    case Celebrations.get_for_user(user_id, id) do
      {:error, :not_found} ->
        not_found(conn)

      {:ok, _c} ->
        if TrustTiers.can_access_tier?(TrustTiers.get_tier(user_id), :taste) do
          case CelebrationCuration.curate_for(user_id, id) do
            {:ok, %{mode: :full} = curation} ->
              json(conn, %{"curation" => CelebrationCuration.to_contract(curation)})

            {:ok, %{mode: :basic}} ->
              conn
              |> put_status(403)
              |> json(%{"error_code" => "forbidden", "reason" => "trust_tier"})

            {:error, :not_found} ->
              not_found(conn)

            {:error, _} ->
              conn |> put_status(422) |> json(%{"error_code" => "invalid"})
          end
        else
          conn
          |> put_status(403)
          |> json(%{"error_code" => "forbidden", "reason" => "trust_tier"})
        end
    end
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case Celebrations.create(user_id, params) do
      {:ok, celebration} ->
        conn
        |> put_status(201)
        |> json(%{"celebration" => Celebrations.to_contract(celebration)})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def delete(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Celebrations.delete(user_id, id) do
      {:ok, celebration} ->
        json(conn, %{"celebration" => Celebrations.to_contract(celebration), "deleted" => true})

      {:error, :not_found} ->
        not_found(conn)

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)
    end
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end

  defp unprocessable(conn, %Ecto.Changeset{} = cs) do
    conn
    |> put_status(422)
    |> json(%{
      "error_code" => "invalid",
      "errors" => Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
        Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
          opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
        end)
      end)
    })
  end
end

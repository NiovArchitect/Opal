defmodule OpalCoreWeb.RelationshipController do
  @moduledoc """
  Phase RU-1 — relationship types HTTP API.

  GET /api/v1/product/relationships
  PUT /api/v1/product/relationships/:contact_user_id
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Relationships

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    relationships = Relationships.for_user(user_id)
    contacts = Relationships.contacts_with_types(user_id)

    json(conn, %{
      "relationships" => Enum.map(relationships, &Relationships.to_contract/1),
      "contacts" => Enum.map(contacts, &Relationships.to_contact_contract/1),
      "allowed_types" => Relationships.allowed_types()
    })
  end

  def upsert(conn, %{"contact_user_id" => contact_user_id} = params) do
    user_id = conn.assigns.current_user_id
    type = params["type"]
    bounds = params["bounds"] || params["communication_bounds"] || %{}

    case Relationships.set_type(user_id, contact_user_id, type || "", bounds) do
      {:ok, rel} ->
        json(conn, %{"relationship" => Relationships.to_contract(rel)})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def upsert(conn, _params) do
    conn |> put_status(422) |> json(%{"error_code" => "invalid"})
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

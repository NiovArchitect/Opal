defmodule OpalCoreWeb.RelationshipController do
  @moduledoc """
  Phase RU-1 — relationship types HTTP API.

  GET /api/v1/product/relationships
  PUT /api/v1/product/relationships/:contact_user_id

  Repair #19 W24 (DL-02) — the PUT also carries the family subtype
  dimension: when the request includes `family_subtype` and/or
  `family_minor`, they are applied through
  `Relationships.set_family_subtype/4` in the same request and the
  response contract carries the stored values back. Before this, the
  fields were accepted and silently dropped (a 200 that did not say
  what it stored). A subtype sent for a non-family type, or an
  unknown subtype slug, is a 422 — never a silent no-op.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Relationships
  alias OpalCore.Relationships.FamilySubtype

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    relationships = Relationships.for_user(user_id)
    contacts = Relationships.contacts_with_types(user_id)

    json(conn, %{
      "relationships" => Enum.map(relationships, &Relationships.to_contract/1),
      "contacts" => Enum.map(contacts, &Relationships.to_contact_contract/1),
      "allowed_types" => Relationships.allowed_types(),
      "family_subtypes" => FamilySubtype.options()
    })
  end

  def upsert(conn, %{"contact_user_id" => contact_user_id} = params) do
    user_id = conn.assigns.current_user_id
    type = params["type"]
    bounds = params["bounds"] || params["communication_bounds"] || %{}

    with {:ok, rel} <- Relationships.set_type(user_id, contact_user_id, type || "", bounds),
         {:ok, rel} <- apply_family_subtype(user_id, contact_user_id, rel, params) do
      json(conn, %{"relationship" => Relationships.to_contract(rel)})
    else
      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def upsert(conn, _params) do
    conn |> put_status(422) |> json(%{"error_code" => "invalid"})
  end

  # DL-02: the subtype leg of the one write. Absent keys leave the
  # stored subtype untouched (the type write's own family rules
  # apply); a present `family_subtype` (slug, or null to clear) is
  # applied only under type == "family" — under any other type the
  # type write has already cleared the dimension, and a non-null
  # subtype request is refused rather than dropped.
  defp apply_family_subtype(user_id, contact_user_id, rel, params) do
    subtype_present = Map.has_key?(params, "family_subtype")
    minor_present = Map.has_key?(params, "family_minor")

    cond do
      not subtype_present and not minor_present ->
        {:ok, rel}

      rel.type != "family" ->
        if params["family_subtype"] in [nil, ""] do
          {:ok, rel}
        else
          {:error, :not_family}
        end

      true ->
        subtype =
          if subtype_present, do: blank_to_nil(params["family_subtype"]), else: rel.family_subtype

        opts =
          if minor_present,
            do: [minor: params["family_minor"] == true],
            else: [minor: rel.family_minor || false]

        Relationships.set_family_subtype(user_id, contact_user_id, subtype, opts)
    end
  end

  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

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

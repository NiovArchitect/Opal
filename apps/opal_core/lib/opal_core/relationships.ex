defmodule OpalCore.Relationships do
  @moduledoc """
  Phase RU-1 — relationship types (how the user relates to each person).

  Explicit user-set types only. No auto-detection. No closeness scores.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.SocialFlow.RelationshipEstablishment

  @doc "Allowed type strings (exact RU-1 taxonomy)."
  def allowed_types, do: RelationshipType.allowed_types()

  @doc """
  Set or update the relationship type for `(user_id, contact_user_id)`.

  Upserts on the unique pair. `bounds` is optional.
  """
  def set_type(user_id, contact_user_id, type, bounds \\ %{})

  def set_type(user_id, contact_user_id, type, bounds)
      when is_binary(user_id) and is_binary(contact_user_id) and is_binary(type) do
    # Paste I — empty bounds inherit type defaults so enforcement has real values
    bounds_map =
      case normalize_bounds(bounds) do
        empty when empty == %{} -> OpalCore.Relationships.Behavior.defaults_for(type)
        filled -> Map.merge(OpalCore.Relationships.Behavior.defaults_for(type), filled)
      end

    attrs = %{
      user_id: user_id,
      contact_user_id: contact_user_id,
      type: type,
      communication_bounds: bounds_map,
      # Explicit user label (A5/A6 upgrade/downgrade) — not provisional
      source: "explicit",
      inference_status: nil,
      inference_resolved_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
    }

    result =
      case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
        nil ->
          %RelationshipType{}
          |> RelationshipType.changeset(attrs)
          |> Repo.insert()

        %RelationshipType{} = existing ->
          existing
          |> RelationshipType.changeset(%{type: type, communication_bounds: bounds_map})
          |> Repo.update()
      end

    # Keep PersonMemory.relationship_type in sync for PromptBuilder / call briefs
    _ = sync_person_memory_type(user_id, contact_user_id, type)
    result
  end

  def set_type(_, _, _, _), do: {:error, :invalid}

  @doc "Return the type string for a contact, or nil when unset."
  def get_type(user_id, contact_user_id)
      when is_binary(user_id) and is_binary(contact_user_id) do
    case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
      %RelationshipType{type: type} -> type
      nil -> nil
    end
  end

  def get_type(_, _), do: nil

  @doc "All relationship type rows for this user (newest first)."
  def for_user(user_id) when is_binary(user_id) do
    from(r in RelationshipType,
      where: r.user_id == ^user_id,
      order_by: [desc: r.updated_at]
    )
    |> Repo.all()
  end

  def for_user(_), do: []

  @doc """
  Map `%{contact_user_id => type}` for OC-2 context assembly.
  Empty map when none set.
  """
  def type_map_for(user_id) when is_binary(user_id) do
    for_user(user_id)
    |> Map.new(fn %RelationshipType{contact_user_id: id, type: type} -> {id, type} end)
  end

  def type_map_for(_), do: %{}

  @doc """
  Contacts the user can assign a type to: connected peers + already-typed contacts.

  Each entry: `%{contact_user_id, display_name, type}` where type may be nil.
  """
  def contacts_with_types(user_id) when is_binary(user_id) do
    typed = for_user(user_id)
    typed_map = Map.new(typed, fn r -> {r.contact_user_id, r} end)

    peer_ids =
      connected_peer_ids(user_id)
      |> MapSet.new()
      |> MapSet.union(MapSet.new(Map.keys(typed_map)))
      |> MapSet.to_list()

    users =
      if peer_ids == [] do
        %{}
      else
        from(u in User, where: u.id in ^peer_ids, select: {u.id, u.display_name})
        |> Repo.all()
        |> Map.new()
      end

    peer_ids
    |> Enum.map(fn id ->
      rel = Map.get(typed_map, id)

      %{
        contact_user_id: id,
        display_name: Map.get(users, id),
        type: rel && rel.type,
        communication_bounds: rel && rel.communication_bounds,
        id: rel && rel.id
      }
    end)
    |> Enum.sort_by(fn c -> String.downcase(c.display_name || "") end)
  end

  def contacts_with_types(_), do: []

  @doc """
  Paste H — case-insensitive substring search over `contacts_with_types/1`.

  Returns matching contact maps sorted by display_name. Empty query → [].
  """
  def search_contacts(user_id, query, opts \\ [])

  def search_contacts(user_id, query, opts)
      when is_binary(user_id) and is_binary(query) do
    needle = query |> String.trim() |> String.downcase()
    limit = Keyword.get(opts, :limit, 25) |> max(1) |> min(100)

    if needle == "" do
      []
    else
      contacts_with_types(user_id)
      |> Enum.filter(fn c ->
        name = c[:display_name] || c["display_name"] || ""
        String.contains?(String.downcase(to_string(name)), needle)
      end)
      |> Enum.take(limit)
    end
  end

  def search_contacts(_, _, _), do: []

  def to_contract(%RelationshipType{} = r) do
    %{
      "id" => r.id,
      "user_id" => r.user_id,
      "contact_user_id" => r.contact_user_id,
      "type" => r.type,
      "communication_bounds" => r.communication_bounds,
      "source" => r.source || "explicit",
      "inference_status" => r.inference_status,
      # 0.5 asymmetry — never expose reverse label
      "their_type_for_me" => nil,
      "inserted_at" => datetime(r.inserted_at),
      "updated_at" => datetime(r.updated_at)
    }
  end

  def to_contact_contract(c) when is_map(c) do
    %{
      "id" => c[:id] || c["id"],
      "contact_user_id" => c[:contact_user_id] || c["contact_user_id"],
      "display_name" => c[:display_name] || c["display_name"],
      "type" => c[:type] || c["type"],
      "communication_bounds" => c[:communication_bounds] || c["communication_bounds"]
    }
  end

  defp connected_peer_ids(user_id) do
    from(e in RelationshipEstablishment,
      where: e.status == "active",
      order_by: [desc: e.established_at],
      limit: 100
    )
    |> Repo.all()
    |> Enum.filter(fn e -> user_id in (e.participant_ids || []) end)
    |> Enum.map(fn e ->
      Enum.find(e.participant_ids || [], &(&1 != user_id))
    end)
    |> Enum.filter(&is_binary/1)
    |> Enum.uniq()
  end

  defp normalize_bounds(nil), do: %{}

  defp normalize_bounds(bounds) when is_map(bounds) do
    Map.new(bounds, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp normalize_bounds(_), do: %{}

  defp sync_person_memory_type(user_id, contact_user_id, type) do
    alias OpalCore.SocialMemory.PersonMemory

    case Repo.get_by(PersonMemory, account_id: user_id, person_id: contact_user_id) do
      %PersonMemory{} = pm ->
        pm |> PersonMemory.changeset(%{relationship_type: type}) |> Repo.update()

      nil ->
        :ok
    end
  rescue
    _ -> :ok
  end

  defp datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime(_), do: nil
end

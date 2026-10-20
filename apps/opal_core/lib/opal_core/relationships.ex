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
          update_attrs =
            %{type: type, communication_bounds: bounds_map}
            # Repair #15: changing away from "family" clears the subtype
            # dimension (it is only valid under family); re-setting "family"
            # keeps the stored subtype.
            |> then(fn attrs ->
              if type != "family",
                do: Map.merge(attrs, %{family_subtype: nil, family_minor: false}),
                else: attrs
            end)

          existing
          |> RelationshipType.changeset(update_attrs)
          |> Repo.update()
      end

    # Keep PersonMemory.relationship_type in sync for PromptBuilder / call briefs
    _ = sync_person_memory_type(user_id, contact_user_id, type)
    result
  end

  def set_type(_, _, _, _), do: {:error, :invalid}

  @doc """
  Repair #15 Track B — set (or clear, with `nil`) the family subtype for a
  contact whose RU-1 type is `family`.

  `opts`: `minor: boolean` — flags the counterpart as a minor, which turns
  on the Behavior minor restraint (no adult-pattern nudges; planning help
  unaffected). Returns `{:error, :not_family}` when the pair has no stored
  `family` type, and a changeset error for an unknown subtype slug.
  """
  def set_family_subtype(user_id, contact_user_id, subtype, opts \\ [])

  def set_family_subtype(user_id, contact_user_id, subtype, opts)
      when is_binary(user_id) and is_binary(contact_user_id) do
    case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
      %RelationshipType{type: "family"} = existing ->
        existing
        |> RelationshipType.changeset(%{
          family_subtype: subtype,
          family_minor: Keyword.get(opts, :minor, existing.family_minor || false)
        })
        |> Repo.update()

      %RelationshipType{} ->
        {:error, :not_family}

      nil ->
        {:error, :not_family}
    end
  end

  def set_family_subtype(_, _, _, _), do: {:error, :invalid}

  @doc """
  Founder Screen Notes N4 - establish (or clear, with `nil`) the
  age band for a counterpart on the viewer's relationship record.

  The band is a fact about the PERSON as the viewer knows them, so
  it belongs to the relationship record and is NOT tied to the
  family type and NOT cleared by type changes (age does not change
  when the tie label does). Values: "under_13" | "age_13_17" |
  "adult" (see RelationshipType.age_bands/0); anything else is
  `{:error, :invalid_age_band}` - fail closed, never stored.

  AFFORDANCE ONLY: nothing in the product reads this value to
  restrict anything. What bands restrict (messaging, care
  surfaces, discovery) is a founder-gated policy that binds to
  this exact shape later.
  """
  def set_age_band(user_id, contact_user_id, band)
      when is_binary(user_id) and is_binary(contact_user_id) do
    cond do
      not is_nil(band) and band not in RelationshipType.age_bands() ->
        {:error, :invalid_age_band}

      true ->
        case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
          %RelationshipType{} = existing ->
            existing
            |> RelationshipType.changeset(%{age_band: band})
            |> Repo.update()

          nil ->
            {:error, :not_found}
        end
    end
  end

  def set_age_band(_, _, _), do: {:error, :invalid}

  @doc "Age-band vocabulary for the picker: [%{slug, label}], in band order."
  def age_band_options do
    [
      %{slug: "under_13", label: "Under 13"},
      %{slug: "age_13_17", label: "13-17"},
      %{slug: "adult", label: "Adult (18 or over)"}
    ]
  end

  @doc "Family subtype + minor flag for a contact: `%{subtype, minor}` or nil."
  def get_family_subtype(user_id, contact_user_id)
      when is_binary(user_id) and is_binary(contact_user_id) do
    case Repo.get_by(RelationshipType, user_id: user_id, contact_user_id: contact_user_id) do
      %RelationshipType{type: "family", family_subtype: subtype, family_minor: minor}
      when is_binary(subtype) ->
        %{subtype: subtype, minor: minor || false}

      _ ->
        nil
    end
  end

  def get_family_subtype(_, _), do: nil

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
        family_subtype: rel && rel.family_subtype,
        family_minor: (rel && rel.family_minor) || false,
        age_band: rel && rel.age_band,
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
      "family_subtype" => r.family_subtype,
      "family_minor" => r.family_minor || false,
      "age_band" => r.age_band,
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
      "family_subtype" => c[:family_subtype] || c["family_subtype"],
      "family_minor" => c[:family_minor] || c["family_minor"] || false,
      "age_band" => c[:age_band] || c["age_band"],
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

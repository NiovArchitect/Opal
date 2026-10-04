defmodule OpalCore.SocialFlow.DurablePreferenceMemory do
  @moduledoc """
  Server-authoritative relationship place preference memory.

  Owner: `RelationshipMemory` (`personal_relationship_memories`).
  Visibility: private to owner (schema enforces visibility=private).

  Does NOT use browser sessionStorage as source of truth.
  Does NOT auto-learn durable prefs from one episode statement like "lively tonight".

  Write law:
  - explicit durable place preference only via remember_explicit/2
  - one-time episode intent is not durable
  - no duplicate active rows for same owner+preference

  Read law:
  - filter by owners, active deletion_state, place_preference purposes
  - map to PreferenceMemory facts for CollectiveComposition
  """

  import Ecto.Query

  alias OpalCore.Repo
  alias OpalCore.SocialFlow.MemoryCandidate
  alias OpalCore.SocialFlow.RelationshipMemory

  @place_purposes ~w(place_preference place_vibe food_preference)

  @doc """
  Persist an explicit durable place preference for an owner.

  Required: owner_user_id, preference (e.g. "quiet restaurants").
  Optional: counterpart_user_id, conversation_id, weight_class, polarity, source_message_id.
  """
  def remember_explicit(attrs) when is_map(attrs) do
    a = stringify(attrs)
    owner = a["owner_user_id"]
    pref = a["preference"] || a["summary"]

    cond do
      not is_binary(owner) or owner == "" ->
        {:error, :owner_required}

      not is_binary(pref) or String.trim(pref) == "" ->
        {:error, :preference_required}

      episode_only_intent?(pref) and a["force_durable"] != true ->
        {:error, :episode_intent_not_durable}

      true ->
        weight = a["weight_class"] || "relationship_specific"
        polarity = a["polarity"] || "prefer"
        purpose = encode_purpose(a["purpose"] || "place_preference", weight, polarity)

        case find_active(owner, pref) do
          %RelationshipMemory{} = existing ->
            # No duplicate — return existing (idempotent)
            {:ok, existing, :idempotent}

          nil ->
            review = DateTime.utc_now() |> DateTime.add(90 * 24 * 3600, :second) |> DateTime.truncate(:microsecond)

            %RelationshipMemory{}
            |> RelationshipMemory.changeset(%{
              owner_user_id: owner,
              conversation_id: a["conversation_id"],
              counterpart_user_id: a["counterpart_user_id"],
              summary: String.trim(pref),
              purpose: purpose,
              visibility: "private",
              review_at: review,
              deletion_state: "active"
            })
            |> Repo.insert()
            |> case do
              {:ok, m} -> {:ok, m, :created}
              {:error, cs} -> {:error, cs}
            end
        end
    end
  end

  def remember_explicit(_), do: {:error, :invalid}

  @doc "List active durable place prefs for owners (private facts)."
  def list_for_owners(owner_ids) when is_list(owner_ids) do
    ids = Enum.filter(owner_ids, &is_binary/1)

    if ids == [] do
      []
    else
      from(m in RelationshipMemory,
        where:
          m.owner_user_id in ^ids and m.deletion_state == "active" and
            m.visibility == "private",
        order_by: [desc: m.inserted_at]
      )
      |> Repo.all()
      |> Enum.filter(&place_purpose?/1)
    end
  end

  def list_for_owners(_), do: []

  @doc "Map RelationshipMemory rows to PreferenceMemory-compatible facts."
  def to_preference_facts(memories) when is_list(memories) do
    Enum.map(memories, &to_preference_fact/1)
  end

  def to_preference_fact(%RelationshipMemory{} = m) do
    {weight, polarity} = decode_purpose(m.purpose)

    %{
      "id" => m.id,
      "owner_user_id" => m.owner_user_id,
      "preference" => m.summary,
      "polarity" => polarity,
      "weight_class" => weight,
      "scope" => if(m.counterpart_user_id, do: "relationship", else: "personal"),
      "relationship_id" => m.counterpart_user_id,
      "permission_class" => "owner_private",
      "provenance" => "durable_relationship_memory",
      "confidence" => 0.75,
      "revoked" => m.deletion_state != "active",
      "source" => "server",
      "durable" => true
    }
  end

  def to_preference_fact(_), do: nil

  @doc "Supersede/revise: forget old, write new with provenance."
  def supersede(owner_user_id, old_preference, new_attrs) when is_binary(owner_user_id) do
    case find_active(owner_user_id, old_preference) do
      %RelationshipMemory{} = old ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        {:ok, _} =
          old
          |> RelationshipMemory.changeset(%{deletion_state: "forgotten", forgotten_at: now})
          |> Repo.update()

        remember_explicit(
          Map.merge(stringify(new_attrs), %{
            "owner_user_id" => owner_user_id,
            "force_durable" => true
          })
        )

      nil ->
        remember_explicit(
          Map.merge(stringify(new_attrs), %{
            "owner_user_id" => owner_user_id,
            "force_durable" => true
          })
        )
    end
  end

  @doc "Forget/revoke durable memory for owner."
  def forget(memory_id, owner_user_id) when is_binary(memory_id) and is_binary(owner_user_id) do
    case Repo.get(RelationshipMemory, memory_id) do
      %RelationshipMemory{owner_user_id: ^owner_user_id, deletion_state: "active"} = m ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        m
        |> RelationshipMemory.changeset(%{deletion_state: "forgotten", forgotten_at: now})
        |> Repo.update()

      %RelationshipMemory{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def forget(_, _), do: {:error, :invalid}

  @doc """
  Phase 7A — forget a durable fact and remove linked MemoryCandidates.

  Links cleaned (honest, no silent orphans):
  - `promoted_memory_id == fact.id`
  - `candidate_summary` or `value_key` equal to the fact summary
  - `context_dims.conceptual_value_key` equal to the fact summary
  """
  def forget_with_candidates(memory_id, owner_user_id)
      when is_binary(memory_id) and is_binary(owner_user_id) do
    case forget(memory_id, owner_user_id) do
      {:ok, %RelationshipMemory{} = m} ->
        summary = m.summary || ""

        {count, _} =
          from(c in MemoryCandidate,
            where:
              c.owner_user_id == ^owner_user_id and
                (c.promoted_memory_id == ^m.id or
                   c.candidate_summary == ^summary or
                   c.value_key == ^summary or
                   fragment("(? ->> 'conceptual_value_key') = ?", c.context_dims, ^summary))
          )
          |> Repo.delete_all()

        {:ok, m,
         %{
           "candidates_removed" => count,
           "candidate_cleanup" => "promoted_memory_id_and_value_key_match"
         }}

      other ->
        other
    end
  end

  def forget_with_candidates(_, _), do: {:error, :invalid}

  @doc """
  Plain-language label for a stored preference value.

  Maps known value_key shapes; otherwise returns the raw value honestly
  (never invents a label).
  """
  def plain_label(value) when is_binary(value) do
    v = String.trim(value)

    cond do
      v == "" ->
        v

      match = Regex.run(~r/^taste:cuisine:(.+)$/i, v) ->
        "Prefers #{humanize_token(Enum.at(match, 1))} food"

      match = Regex.run(~r/^taste:vibe:(.+)$/i, v) ->
        "Prefers #{humanize_token(Enum.at(match, 1))} places"

      match = Regex.run(~r/^taste:price:(.+)$/i, v) ->
        "Prefers #{Enum.at(match, 1)} price range"

      match = Regex.run(~r/^taste:area:(.+)$/i, v) ->
        "Prefers #{humanize_token(Enum.at(match, 1))}"

      match = Regex.run(~r/^taste:time_of_day:(.+)$/i, v) ->
        "Prefers #{humanize_token(Enum.at(match, 1))}"

      match = Regex.run(~r/^temporal:prefers:([a-z]+)_([a-z]+)$/i, v) ->
        day = humanize_weekday(Enum.at(match, 1))
        part = humanize_daypart(Enum.at(match, 2))
        "Free #{day} #{part}"

      match = Regex.run(~r/^temporal:prefers:(.+)$/i, v) ->
        "Free #{humanize_token(Enum.at(match, 1))}"

      match = Regex.run(~r/^temporal:avoids:(.+)$/i, v) ->
        "Avoids #{humanize_token(Enum.at(match, 1))}"

      true ->
        # Honest: unmapped keys and free-text prefs surface as stored.
        v
    end
  end

  def plain_label(_), do: ""

  @doc "User-facing transparency contract (no confidence / evidence internals)."
  def to_transparency_fact(%RelationshipMemory{} = m) do
    value = m.summary || ""
    label = plain_label(value)

    %{
      "id" => m.id,
      "label" => label,
      "value" => value,
      "mapped" => label != value
    }
  end

  def to_transparency_fact(_), do: nil

  @doc "Build PreferenceMemory facts for participant ids from durable store."
  def facts_for_participants(participant_ids) do
    list_for_owners(participant_ids)
    |> to_preference_facts()
    |> Enum.reject(&is_nil/1)
  end

  # One-evening intent phrases must not auto-persist as forever preferences
  defp episode_only_intent?(pref) do
    p = String.downcase(pref || "")

    Regex.match?(
      ~r/\btonight\b|\bthis (evening|weekend|saturday|sunday)\b|\bfor now\b|\bjust this once\b/i,
      p
    )
  end

  defp find_active(owner, pref) do
    pref_norm = String.downcase(String.trim(pref))

    from(m in RelationshipMemory,
      where: m.owner_user_id == ^owner and m.deletion_state == "active",
      order_by: [desc: m.inserted_at]
    )
    |> Repo.all()
    |> Enum.find(fn m ->
      place_purpose?(m) and String.downcase(m.summary || "") == pref_norm
    end)
  end

  defp place_purpose?(%RelationshipMemory{purpose: purpose}) when is_binary(purpose) do
    base = purpose |> String.split("|") |> List.first()
    base in @place_purposes or String.starts_with?(purpose, "place_")
  end

  defp place_purpose?(_), do: false

  defp encode_purpose(base, weight, polarity) do
    "#{base}|#{weight}|#{polarity}"
  end

  defp decode_purpose(nil), do: {"relationship_specific", "prefer"}

  defp decode_purpose(purpose) when is_binary(purpose) do
    case String.split(purpose, "|") do
      [_base, weight, polarity | _] -> {weight, polarity}
      [_base, weight] -> {weight, "prefer"}
      _ -> {"relationship_specific", "prefer"}
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp humanize_token(raw) when is_binary(raw) do
    raw
    |> String.replace(~r/[_-]+/, " ")
    |> String.split(" ", trim: true)
    |> Enum.map(&String.capitalize/1)
    |> Enum.join(" ")
  end

  defp humanize_token(_), do: ""

  defp humanize_weekday(day) do
    case String.downcase(day || "") do
      "monday" -> "Monday"
      "tuesday" -> "Tuesday"
      "wednesday" -> "Wednesday"
      "thursday" -> "Thursday"
      "friday" -> "Friday"
      "saturday" -> "Saturday"
      "sunday" -> "Sunday"
      other -> humanize_token(other)
    end
  end

  defp humanize_daypart(part) do
    case String.downcase(part || "") do
      "morning" -> "mornings"
      "afternoon" -> "afternoons"
      "evening" -> "evenings"
      "night" -> "nights"
      other -> humanize_token(other)
    end
  end
end

defmodule OpalCore.Social.ContactCelebrationSync do
  @moduledoc """
  Paste G Phase 5 — sync birthday/anniversary from a **user-selected** contact.

  Trust law: ONLY contacts the user explicitly added/picked. Never whole address book.
  Provenance: observed / notes "from your contacts". Removable via Celebrations /
  PersonMemory transparency (existing delete / fact remove).
  """

  require Logger

  alias OpalCore.Celebrations
  alias OpalCore.Intelligence.TemporalResolver
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.PersonMemory

  @source_note "from your contacts"
  @provenance "observed"

  @doc """
  Sync celebration dates from a selected contact payload.

  Expected attrs (string or atom keys):
  - `person_name` / `name` (required)
  - `person_id` / `contact_user_id` (optional binary_id)
  - `birthday` — `%{"month" => m, "day" => d, "year" => y?}` or ISO `"YYYY-MM-DD"` / `"MM-DD"`
  - `anniversary` — same shapes

  Returns `{:ok, %{celebrations: [...], anchors: [...]}}` or `{:ok, :nothing}` when
  no date fields present. Never invents dates.
  """
  def sync_selected_contact(account_id, attrs)
      when is_binary(account_id) and is_map(attrs) do
    params = stringify(attrs)
    name = blank_to_nil(params["person_name"] || params["name"])
    person_id = blank_to_nil(params["person_id"] || params["contact_user_id"])

    if is_nil(name) do
      {:error, :person_name_required}
    else
      birthday = parse_date_field(params["birthday"])
      anniversary = parse_date_field(params["anniversary"])

      if is_nil(birthday) and is_nil(anniversary) do
        {:ok, :nothing}
      else
        celebrations = []
        anchors = []

        {celebrations, anchors} =
          maybe_sync_kind(
            celebrations,
            anchors,
            account_id,
            person_id,
            name,
            "birthday",
            birthday
          )

        {celebrations, anchors} =
          maybe_sync_kind(
            celebrations,
            anchors,
            account_id,
            person_id,
            name,
            "anniversary",
            anniversary
          )

        _ = maybe_person_fact(account_id, person_id, name, birthday, anniversary)

        {:ok, %{celebrations: celebrations, anchors: anchors, provenance: @provenance}}
      end
    end
  end

  def sync_selected_contact(_, _), do: {:error, :invalid}

  defp maybe_sync_kind(celebrations, anchors, _account_id, _person_id, _name, _kind, nil),
    do: {celebrations, anchors}

  defp maybe_sync_kind(celebrations, anchors, account_id, person_id, name, kind, %{
         month: month,
         day: day,
         year: year
       }) do
    notes = @source_note

    celebration =
      case find_existing_celebration(account_id, name, kind) do
        {:ok, existing} ->
          {:ok, existing}

        :none ->
          Celebrations.create(account_id, %{
            "person_name" => name,
            "kind" => kind,
            "month" => month,
            "day" => day,
            "year" => year,
            "notes" => notes
          })
      end

    celebrations =
      case celebration do
        {:ok, c} -> [c | celebrations]
        {:error, reason} ->
          Logger.info("contact_celebration_sync.celebration_skip kind=#{kind} reason=#{inspect(reason)}")
          celebrations
      end

    date = date_for_anchor(month, day, year)

    anchors =
      case date do
        %Date{} = d ->
          attrs = %{
            account_id: account_id,
            person_id: person_id,
            anchor_type: kind,
            date: d,
            source_text: "#{name}'s #{kind} #{@source_note}",
            confidence: 0.85,
            needs_confirmation: false,
            confirmed: false,
            provenance: @provenance
          }

          case TemporalResolver.upsert_anchors([attrs]) do
            [result | _] -> [result | anchors]
            _ -> anchors
          end

        _ ->
          anchors
      end

    {celebrations, anchors}
  end

  defp find_existing_celebration(account_id, name, kind) do
    case Celebrations.list_for_user(account_id) do
      {:ok, list} ->
        match =
          Enum.find(list, fn c ->
            String.downcase(c.person_name || "") == String.downcase(name) and c.kind == kind
          end)

        if match, do: {:ok, match}, else: :none

      _ ->
        :none
    end
  end

  defp maybe_person_fact(_account_id, nil, _name, _b, _a), do: :ok

  defp maybe_person_fact(account_id, person_id, name, birthday, anniversary)
       when is_binary(person_id) do
    row =
      case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
        nil ->
          %PersonMemory{}
          |> PersonMemory.changeset(%{
            account_id: account_id,
            person_id: person_id,
            known_facts: %{"display_name" => %{"value" => name, "provenance" => @provenance}}
          })
          |> Repo.insert()
          |> case do
            {:ok, r} -> r
            _ -> nil
          end

        %PersonMemory{} = r ->
          r
      end

    if row do
      facts = row.known_facts || %{}

      facts =
        facts
        |> Map.put_new("display_name", %{"value" => name, "provenance" => @provenance})
        |> maybe_put_fact("birthday", birthday)
        |> maybe_put_fact("anniversary", anniversary)

      row
      |> PersonMemory.changeset(%{known_facts: facts})
      |> Repo.update()
    else
      :ok
    end
  rescue
    e ->
      Logger.warning("contact_celebration_sync.person_fact_failed #{Exception.message(e)}")
      :ok
  end

  defp maybe_put_fact(facts, _key, nil), do: facts

  defp maybe_put_fact(facts, key, %{month: m, day: d, year: y}) do
    value =
      cond do
        is_integer(y) -> "#{y}-#{pad(m)}-#{pad(d)}"
        true -> "#{pad(m)}-#{pad(d)}"
      end

    Map.put(facts, key, %{
      "value" => value,
      "provenance" => @provenance,
      "source" => @source_note,
      "updated_at" => DateTime.utc_now() |> DateTime.to_iso8601()
    })
  end

  defp parse_date_field(nil), do: nil
  defp parse_date_field(""), do: nil

  defp parse_date_field(%{} = map) do
    m = Map.get(map, "month") || Map.get(map, :month)
    d = Map.get(map, "day") || Map.get(map, :day)
    y = Map.get(map, "year") || Map.get(map, :year)

    with month when is_integer(month) <- to_int(m),
         day when is_integer(day) <- to_int(d),
         true <- month in 1..12,
         true <- day in 1..31,
         true <- match?({:ok, _}, Date.new(2024, month, day)) do
      %{month: month, day: day, year: to_int(y)}
    else
      _ -> nil
    end
  end

  defp parse_date_field(iso) when is_binary(iso) do
    trimmed = String.trim(iso)

    cond do
      Regex.match?(~r/^\d{4}-\d{2}-\d{2}$/, trimmed) ->
        case Date.from_iso8601(trimmed) do
          {:ok, %Date{month: m, day: d, year: y}} -> %{month: m, day: d, year: y}
          _ -> nil
        end

      Regex.match?(~r/^\d{2}-\d{2}$/, trimmed) ->
        [ms, ds] = String.split(trimmed, "-")

        with month when is_integer(month) <- to_int(ms),
             day when is_integer(day) <- to_int(ds),
             true <- match?({:ok, _}, Date.new(2024, month, day)) do
          %{month: month, day: day, year: nil}
        else
          _ -> nil
        end

      true ->
        nil
    end
  end

  defp parse_date_field(_), do: nil

  defp date_for_anchor(month, day, year) when is_integer(month) and is_integer(day) do
    y = if is_integer(year), do: year, else: Date.utc_today().year

    case Date.new(y, month, day) do
      {:ok, d} ->
        today = Date.utc_today()
        if Date.compare(d, today) == :lt, do: Date.new!(today.year + 1, month, day), else: d

      _ ->
        nil
    end
  end

  defp date_for_anchor(_, _, _), do: nil

  defp to_int(nil), do: nil
  defp to_int(i) when is_integer(i), do: i

  defp to_int(s) when is_binary(s) do
    case Integer.parse(String.trim(s)) do
      {i, _} -> i
      :error -> nil
    end
  end

  defp to_int(_), do: nil

  defp pad(n) when is_integer(n) and n < 10, do: "0#{n}"
  defp pad(n) when is_integer(n), do: Integer.to_string(n)

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(s) when is_binary(s) do
    case String.trim(s) do
      "" -> nil
      t -> t
    end
  end

  defp blank_to_nil(other), do: other

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end

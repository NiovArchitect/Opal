defmodule OpalCore.Intelligence.TemporalResolver do
  @moduledoc """
  Resolves natural-language time expressions into durable `temporal_anchors`.

  ## Paste A Phase 0 — ground truth

  - **entities.times** (`OpalCore.Intelligence.LlmExtract.normalize_entities/1`):
    list of free-text strings (`"Saturday"`, `"June 14th"`, `"tomorrow"`).
    Reliable for explicit phrases; noisy for vague months without a day.
  - **known_facts** (`person_memories.known_facts`): map values often hold raw
    body slices via `SocialMemory.Ingest` (`"birthday" => %{"value" => "..."}`).
  - **Relationship taxonomy**: spouse|partner|family|close_friend|friend|business|acquaintance
    (`OpalCore.Relationships.RelationshipType`).
  - **Nudge queries**: `SocialMemory.Recall.surface_nudges/1` +
    `MemoryHourlyWorker.surface_for_account/1` (overdue, conflicts, cooling,
    unanswered; birthday stub previously empty — temporal anchors extend it).
  - **social_patterns live in hourly**: `overcommit_signal`, `weekend_planner`
    (of six schema types).
  - **Date library**: Elixir stdlib `Date`/`DateTime` — no Timex/Calendar hex package
    in `mix.exs`. Do not hand-roll calendar arithmetic beyond Date.add/Date.diff.

  Uses `OpalCore.Intelligence.LlmAdapter` (never modified). Rules fallback when
  LLM disabled so tests stay green without DeepSeek.
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Intelligence.LlmAdapter
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.TemporalAnchor

  @confirm_floor 0.6

  @system_prompt """
  Extract every time expression referring to a future/past date, deadline, birthday,
  anniversary, or recurring event. Resolve each to an ISO date relative to the given
  reference date. For recurring events, specify the recurrence. Return STRICT JSON:
  {"anchors":[{
    "expression":"the exact quoted text",
    "type":"birthday|anniversary|deadline|one_time|recurring",
    "date":"YYYY-MM-DD",
    "recurrence":null,
    "person_hint":null,
    "confidence":0.0
  }]}.
  Never invent dates. If ambiguous (e.g. "June" without a day), set date to the first
  of the month and confidence <= 0.5. Return {"anchors":[]} if no time expressions.
  recurrence when present: {"frequency":"weekly|monthly|yearly","day_of_week":0-6|null,
  "day_of_month":1-31|null,"month":1-12|null}.
  """

  @doc """
  Resolve time expressions from raw text + extraction entities.times.

  Returns `{:ok, [anchor_attrs]}` (attrs ready for upsert) or `{:ok, []}`.
  """
  def resolve(text, entities_times, reference_date, account_id, person_id \\ nil)

  def resolve(text, entities_times, reference_date, account_id, person_id)
      when is_binary(account_id) do
    ref = normalize_date(reference_date)
    times = List.wrap(entities_times) |> Enum.map(&to_string/1) |> Enum.reject(&(&1 == ""))
    body = text || ""

    case LlmAdapter.readiness() do
      :ready ->
        case llm_resolve(body, times, ref) do
          {:ok, anchors} ->
            {:ok, Enum.map(anchors, &finalize(&1, account_id, person_id, body))}

          {:fallback, _} ->
            {:ok, rules_resolve(body, times, ref, account_id, person_id)}
        end

      {:disabled, _} ->
        {:ok, rules_resolve(body, times, ref, account_id, person_id)}
    end
  end

  def resolve(_, _, _, _, _), do: {:ok, []}

  @doc """
  Upsert anchors with 7-day dedup on (account_id, person_id, anchor_type).
  Logs dedup decisions. Returns `{:ok, :inserted | :updated | :skipped}`.
  """
  def upsert_anchors(attrs_list) when is_list(attrs_list) do
    Enum.map(attrs_list, &upsert_one/1)
  end

  def upsert_anchors(_), do: []

  defp upsert_one(attrs) when is_map(attrs) do
    account_id = attrs[:account_id] || attrs["account_id"]
    person_id = attrs[:person_id] || attrs["person_id"]
    type = attrs[:anchor_type] || attrs["anchor_type"]
    date = attrs[:date] || attrs["date"]

    if is_nil(account_id) or is_nil(type) or is_nil(date) do
      {:error, :invalid}
    else
      window_start = Date.add(date, -7)
      window_end = Date.add(date, 7)

      existing =
        from(a in TemporalAnchor,
          where:
            a.account_id == ^account_id and a.anchor_type == ^type and a.date >= ^window_start and
              a.date <= ^window_end
        )
        |> maybe_person(person_id)
        |> limit(1)
        |> Repo.one()

      case existing do
        %TemporalAnchor{} = row ->
          Logger.info(
            "temporal.dedup decision=update account=#{account_id} type=#{type} id=#{row.id}"
          )

          row
          |> TemporalAnchor.changeset(Map.drop(attrs, [:account_id, "account_id"]))
          |> Repo.update()
          |> case do
            {:ok, _} -> {:ok, :updated}
            err -> err
          end

        nil ->
          %TemporalAnchor{}
          |> TemporalAnchor.changeset(attrs)
          |> Repo.insert()
          |> case do
            {:ok, _} ->
              Logger.info("temporal.dedup decision=insert account=#{account_id} type=#{type}")
              {:ok, :inserted}

            err ->
              err
          end
      end
    end
  end

  defp maybe_person(q, nil), do: where(q, [a], is_nil(a.person_id))
  defp maybe_person(q, person_id), do: where(q, [a], a.person_id == ^person_id)

  defp llm_resolve(text, times, ref) do
    payload = %{
      "text" => text,
      "entities_times" => times,
      "reference_date" => Date.to_iso8601(ref)
    }

    messages = [
      %{role: "system", content: @system_prompt},
      %{role: "user", content: Jason.encode!(payload)}
    ]

    case LlmAdapter.chat(messages, temperature: 0.0, response_format: %{type: "json_object"}) do
      {:ok, %{content: content}} ->
        case Jason.decode(content) do
          {:ok, %{"anchors" => list}} when is_list(list) ->
            {:ok, Enum.map(list, &normalize_llm_anchor/1) |> Enum.reject(&is_nil/1)}

          {:ok, list} when is_list(list) ->
            {:ok, Enum.map(list, &normalize_llm_anchor/1) |> Enum.reject(&is_nil/1)}

          _ ->
            {:fallback, :parse}
        end

      _ ->
        {:fallback, :llm}
    end
  end

  defp normalize_llm_anchor(m) when is_map(m) do
    type = map_type(m["type"] || m[:type])
    date = parse_date(m["date"] || m[:date])
    conf = to_float(m["confidence"] || m[:confidence] || 0.0)

    if type && date do
      %{
        expression: m["expression"] || m[:expression],
        type: type,
        date: date,
        recurrence: normalize_recurrence(m["recurrence"] || m[:recurrence]),
        person_hint: m["person_hint"] || m[:person_hint],
        confidence: conf
      }
    else
      nil
    end
  end

  defp normalize_llm_anchor(_), do: nil

  defp map_type("birthday"), do: "birthday"
  defp map_type("anniversary"), do: "anniversary"
  defp map_type("deadline"), do: "deadline"
  defp map_type("recurring"), do: "recurring_event"
  defp map_type("recurring_event"), do: "recurring_event"
  defp map_type("one_time"), do: "one_time"
  defp map_type(_), do: nil

  defp normalize_recurrence(nil), do: nil
  defp normalize_recurrence(%{} = r), do: r
  defp normalize_recurrence(_), do: nil

  defp finalize(parsed, account_id, person_id, fallback_text) do
    conf = parsed.confidence
    needs? = conf < @confirm_floor

    %{
      account_id: account_id,
      person_id: person_id,
      anchor_type: parsed.type,
      date: next_occurrence(parsed.date, parsed.type, Date.utc_today()),
      recurrence: parsed.recurrence,
      source_text: parsed.expression || String.slice(fallback_text, 0, 200),
      confidence: conf,
      needs_confirmation: needs?,
      confirmed: not needs?
    }
  end

  # Advance yearly birthday/anniversary to next future occurrence
  defp next_occurrence(%Date{} = d, type, today) when type in ~w(birthday anniversary) do
    this_year = %{d | year: today.year}

    cond do
      Date.compare(this_year, today) == :lt -> %{this_year | year: today.year + 1}
      true -> this_year
    end
  rescue
    _ -> d
  end

  defp next_occurrence(%Date{} = d, _, _), do: d

  # --- Rules fallback (LLM down / disabled) ---

  defp rules_resolve(body, times, ref, account_id, person_id) do
    corpus = Enum.join([body | times], " ")

    birthday =
      cond do
        match = Regex.run(~r/birthday\s+(?:is\s+)?(?:on\s+)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/i, corpus) ->
          [expr, month, day] = match
          explicit_birthday(expr, month, day, ref, account_id, person_id, body)

        match =
            Regex.run(~r/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+birthday)?/i, corpus) ->
          if String.match?(corpus, ~r/birthday/i) do
            [expr, month, day] = match
            explicit_birthday(expr, month, day, ref, account_id, person_id, body)
          else
            vague_month(corpus, account_id, person_id, body, ref)
          end

        true ->
          vague_month(corpus, account_id, person_id, body, ref)
      end

    birthday
  end

  defp explicit_birthday(expr, month, day, ref, account_id, person_id, body) do
    case month_day_to_date(month, day, ref) do
      {:ok, date} ->
        [
          finalize(
            %{
              expression: expr,
              type: "birthday",
              date: date,
              recurrence: %{
                "frequency" => "yearly",
                "month" => date.month,
                "day_of_month" => date.day
              },
              confidence: 0.85,
              person_hint: nil
            },
            account_id,
            person_id,
            body
          )
        ]

      _ ->
        []
    end
  end

  defp vague_month(corpus, account_id, person_id, body, ref) do
    # "sometime in June" / "in June" without day → confidence <= 0.5, needs confirmation
    case Regex.run(~r/(sometime\s+in\s+|in\s+|around\s+)([A-Za-z]+)(?:\b)/i, corpus) do
      [expr, _, month] ->
        if String.match?(corpus, ~r/birthday|anniversary|deadline/i) do
          case month_to_first(month, ref) do
            {:ok, date} ->
              type =
                cond do
                  String.match?(corpus, ~r/anniversary/i) -> "anniversary"
                  String.match?(corpus, ~r/deadline|due/i) -> "deadline"
                  true -> "birthday"
                end

              [
                finalize(
                  %{
                    expression: String.trim(expr),
                    type: type,
                    date: date,
                    recurrence: nil,
                    confidence: 0.45,
                    person_hint: nil
                  },
                  account_id,
                  person_id,
                  body
                )
              ]

            _ ->
              []
          end
        else
          []
        end

      _ ->
        []
    end
  end

  defp month_day_to_date(month_name, day_str, ref) do
    with {:ok, month} <- month_number(month_name),
         {day, _} <- Integer.parse(to_string(day_str)),
         {:ok, date} <- Date.new(ref.year, month, day) do
      {:ok, date}
    else
      _ -> :error
    end
  end

  defp month_to_first(month_name, ref) do
    with {:ok, month} <- month_number(month_name),
         {:ok, date} <- Date.new(ref.year, month, 1) do
      {:ok, date}
    else
      _ -> :error
    end
  end

  defp month_number(name) do
    n =
      name
      |> String.downcase()
      |> String.slice(0, 3)
      |> case do
        "jan" -> 1
        "feb" -> 2
        "mar" -> 3
        "apr" -> 4
        "may" -> 5
        "jun" -> 6
        "jul" -> 7
        "aug" -> 8
        "sep" -> 9
        "oct" -> 10
        "nov" -> 11
        "dec" -> 12
        _ -> nil
      end

    if n, do: {:ok, n}, else: :error
  end

  defp normalize_date(%Date{} = d), do: d
  defp normalize_date(%DateTime{} = dt), do: DateTime.to_date(dt)

  defp normalize_date(iso) when is_binary(iso) do
    case Date.from_iso8601(iso) do
      {:ok, d} -> d
      _ -> Date.utc_today()
    end
  end

  defp normalize_date(_), do: Date.utc_today()

  defp parse_date(%Date{} = d), do: d

  defp parse_date(iso) when is_binary(iso) do
    case Date.from_iso8601(iso) do
      {:ok, d} -> d
      _ -> nil
    end
  end

  defp parse_date(_), do: nil

  defp to_float(n) when is_float(n), do: n
  defp to_float(n) when is_integer(n), do: n * 1.0

  defp to_float(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      _ -> 0.0
    end
  end

  defp to_float(_), do: 0.0

  @doc "Confirm a low-confidence anchor after user affirmation."
  def confirm(anchor_id, account_id) when is_binary(anchor_id) and is_binary(account_id) do
    case Repo.get_by(TemporalAnchor, id: anchor_id, account_id: account_id) do
      %TemporalAnchor{} = row ->
        row
        |> TemporalAnchor.changeset(%{
          confirmed: true,
          needs_confirmation: false,
          confidence: max(row.confidence, @confirm_floor)
        })
        |> Repo.update()

      nil ->
        {:error, :not_found}
    end
  end
end

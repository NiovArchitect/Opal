defmodule OpalCore.Social.LifeEvents do
  @moduledoc """
  Paste G Phase 5 — user-told life events ("Maya just got engaged").

  Writes person memory + optional temporal/open-loop signal so existing
  Recall / MemoryHourlyWorker nudge paths can surface follow-through.
  Does not rebuild AttentionCenter or celebrations.
  """

  require Logger

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.TemporalResolver
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.PersonMemory

  @engagement_re ~r/\b(got\s+engaged|just\s+engaged|is\s+engaged|engagement)\b/i
  @married_re ~r/\b(just\s+(got\s+)?married|got\s+married|wedding\s+is)\b/i
  @baby_re ~r/\b(had\s+a\s+(baby|kid)|is\s+pregnant|expecting)\b/i
  @new_job_re ~r/\b(new\s+job|got\s+(a\s+)?(promotion|new\s+role)|just\s+started\s+at)\b/i
  @moved_re ~r/\b(just\s+moved|moved\s+to)\b/i

  @doc """
  Detect + persist a life event from owner-told text.

  Returns:
  - `{:ok, %{event_type, person_name, person_id, fact_key, anchor}}`
  - `{:ok, :none}` when no life-event language
  """
  def ingest_user_told(account_id, text, opts \\ [])
      when is_binary(account_id) and is_binary(text) do
    body = String.trim(text)

    case detect(body) do
      nil ->
        {:ok, :none}

      %{event_type: type, fact_key: key} = detected ->
        person_name = Keyword.get(opts, :person_name) || detected[:person_name] || extract_person(body)
        person_id = Keyword.get(opts, :person_id) || resolve_person_id(account_id, person_name)

        {:ok, pm} = ensure_person(account_id, person_id, person_name)
        facts = pm.known_facts || %{}

        fact = %{
          "value" => String.slice(body, 0, 240),
          "event_type" => type,
          "provenance" => "stated",
          "source" => "user_told",
          "updated_at" => DateTime.utc_now() |> DateTime.to_iso8601()
        }

        {:ok, updated} =
          pm
          |> PersonMemory.changeset(%{
            known_facts: Map.put(facts, key, fact),
            open_loops:
              append_open_loop(pm.open_loops || [], %{
                "description" => life_event_loop(type, person_name),
                "opened_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
                "event_type" => type
              })
          })
          |> Repo.update()

        anchor =
          maybe_anchor(account_id, person_id, type, body, Keyword.get(opts, :reference_date))

        {:ok,
         %{
           event_type: type,
           fact_key: key,
           person_name: person_name,
           person_id: person_id || updated.person_id,
           person_memory_id: updated.id,
           anchor: anchor,
           nudge_path: :recall_open_loop_or_temporal
         }}
    end
  end

  def ingest_user_told(_, _, _), do: {:error, :invalid}

  @doc "Pure detection for tests / extractor entities."
  def detect(text) when is_binary(text) do
    lower = text

    cond do
      Regex.match?(@engagement_re, lower) ->
        %{event_type: "engagement", fact_key: "life_event.engagement", person_name: extract_person(text)}

      Regex.match?(@married_re, lower) ->
        %{event_type: "married", fact_key: "life_event.married", person_name: extract_person(text)}

      Regex.match?(@baby_re, lower) ->
        %{event_type: "new_child", fact_key: "life_event.new_child", person_name: extract_person(text)}

      Regex.match?(@new_job_re, lower) ->
        %{event_type: "new_job", fact_key: "life_event.new_job", person_name: extract_person(text)}

      Regex.match?(@moved_re, lower) ->
        %{event_type: "moved", fact_key: "life_event.moved", person_name: extract_person(text)}

      true ->
        nil
    end
  end

  def detect(_), do: nil

  defp maybe_anchor(account_id, person_id, "engagement", body, ref) do
    # Soft one_time anchor ~2 weeks out as a "reach out" window — not a fake wedding date.
    today = normalize_date(ref) || Date.utc_today()
    date = Date.add(today, 14)

    attrs = %{
      account_id: account_id,
      person_id: person_id,
      anchor_type: "one_time",
      date: date,
      source_text: String.slice(body, 0, 200),
      confidence: 0.7,
      needs_confirmation: true,
      confirmed: false,
      provenance: "stated"
    }

    case TemporalResolver.upsert_anchors([attrs]) do
      [result | _] -> result
      _ -> nil
    end
  end

  defp maybe_anchor(_, _, _, _, _), do: nil

  defp ensure_person(account_id, person_id, person_name) do
    pid = person_id || Ecto.UUID.generate()

    case Repo.get_by(PersonMemory, account_id: account_id, person_id: pid) do
      %PersonMemory{} = row ->
        {:ok, row}

      nil ->
        facts =
          if is_binary(person_name) and person_name != "" do
            %{"display_name" => %{"value" => person_name, "provenance" => "stated"}}
          else
            %{}
          end

        %PersonMemory{}
        |> PersonMemory.changeset(%{
          account_id: account_id,
          person_id: pid,
          known_facts: facts
        })
        |> Repo.insert()
    end
  end

  defp resolve_person_id(_account_id, nil), do: nil

  defp resolve_person_id(account_id, name) when is_binary(name) do
    needle = String.downcase(String.trim(name))

    from(p in PersonMemory,
      where: p.account_id == ^account_id,
      limit: 50
    )
    |> Repo.all()
    |> Enum.find_value(fn p ->
      hint = get_in(p.known_facts || %{}, ["display_name", "value"])

      cond do
        is_binary(hint) and String.downcase(hint) == needle -> p.person_id
        true -> nil
      end
    end)
    |> case do
      nil ->
        case from(u in User,
               where: fragment("lower(?) = ?", u.display_name, ^needle),
               limit: 1,
               select: u.id
             )
             |> Repo.one() do
          id when is_binary(id) -> id
          _ -> nil
        end

      id ->
        id
    end
  rescue
    _ -> nil
  end

  defp extract_person(text) when is_binary(text) do
    # "Maya just got engaged" / "Sam got married"
    case Regex.run(~r/^([A-Z][a-zA-Z'’-]+)\s+(just\s+)?(got\s+)?(engaged|married|pregnant)/u, String.trim(text)) do
      [_, name | _] -> name
      _ ->
        case Regex.run(~r/\b([A-Z][a-zA-Z'’-]+)\s+(just\s+)?(got\s+engaged|is\s+engaged)/u, text) do
          [_, name | _] -> name
          _ -> nil
        end
    end
  end

  defp life_event_loop("engagement", name) do
    who = name || "them"
    "Congratulate #{who} on the engagement — no plan yet."
  end

  defp life_event_loop(type, name) do
    who = name || "them"
    "Follow up with #{who} about #{type}."
  end

  defp append_open_loop(loops, item) when is_list(loops) do
    Enum.take([item | loops], 20)
  end

  defp append_open_loop(_, item), do: [item]

  defp normalize_date(%Date{} = d), do: d

  defp normalize_date(iso) when is_binary(iso) do
    case Date.from_iso8601(iso) do
      {:ok, d} -> d
      _ -> nil
    end
  end

  defp normalize_date(_), do: nil
end

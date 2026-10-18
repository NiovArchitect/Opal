defmodule OpalCore.SocialFlow.Execution.ProfileGap do
  @moduledoc """
  Repair #15 Track C — progressive profile-building: "conversation, not
  interrogation."

  ## Mechanism (general, not a birthday one-off)

  A flow declares the fact it needs via a fact key in the registry below.
  `assess/4` answers one of three ways:

    * `:known`   — the fact is already stored; the flow uses it silently
                   and NO ask is surfaced.
    * `:ask`     — the fact is missing and has never been asked about:
                   a single in-context, conversational ask payload is
                   returned AND the ask is recorded in the
                   `profile_gap_asks` ledger. The ask is never a gate:
                   `blocking: false`, `dismissible: true`, and the flow's
                   own plan proceeds either way.
    * `:proceed_without` — the fact is missing but was already asked
                   (pending, answered-with-no-value, or skipped). The
                   QUIET law: never ask twice, never nag. The flow
                   proceeds without the fact.

  `answer/4` stores the answer through the REAL memory path —
  `MemoryAdmission.evaluate/1` (kind `explicit_fact`) persisted via
  `MemoryStore.admit/1` — and, for birthdays, also writes the durable
  `Celebrations` record the birthday flows already read. `skip/3` records
  the skip in the ledger; per policy a skip is permanent for that fact +
  person (no re-ask, ever, from this mechanism).

  Facts are relationship-scoped memories (owner + counterpart pair key),
  so a fact learned about one person never leaks to another, and one
  owner's facts never leak to another owner.

  ## Adding a fact

  Add one entry to `@facts` with a dimension, a conversational prompt
  builder, and optionally a `durable_write` hook. No other code changes.
  """

  import Ecto.Query

  alias OpalCore.Celebrations
  alias OpalCore.Celebrations.Celebration
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.Execution.{MemoryStore, ProfileGapAsk}

  # --- fact registry -------------------------------------------------------

  @facts %{
    "birthday" => %{
      dimension: "birthday",
      label: "birthday"
    },
    # Repair #18 B5a: the ONLY lawful inference surface for households —
    # an ask-once prompt ("You plan with X, Y and Z a lot — are you a
    # household?"). The ask creates nothing; skipping is permanent per
    # this ledger's law. Auto-creating a pod from co-planning is
    # prohibited.
    "household" => %{
      dimension: "household",
      label: "household"
    }
  }

  def fact_keys, do: Map.keys(@facts)
  def known_fact?(fact_key), do: Map.has_key?(@facts, fact_key)

  # --- assess --------------------------------------------------------------

  @doc """
  Assess a fact gap for `(owner_user_id, person_id)` inside `flow`.

  Returns a string-keyed map:

    * `%{"status" => "known", "value" => value, "ask" => nil}`
    * `%{"status" => "ask", "value" => nil, "ask" => ask_payload}`
    * `%{"status" => "proceed_without", "value" => nil, "ask" => nil,
         "reason" => "already_asked" | "skipped"}`

  Unknown fact keys fail closed to `proceed_without` (never invent an ask).
  """
  def assess(owner_user_id, person_id, fact_key, opts \\ [])

  def assess(owner_user_id, person_id, fact_key, opts)
      when is_binary(owner_user_id) and is_binary(person_id) and is_binary(fact_key) do
    flow = Keyword.get(opts, :flow, "generic")
    person_name = Keyword.get(opts, :person_name, "them")

    cond do
      not known_fact?(fact_key) ->
        %{"status" => "proceed_without", "value" => nil, "ask" => nil, "reason" => "unknown_fact"}

      true ->
        case known_value(owner_user_id, person_id, fact_key, person_name) do
          {:ok, value} ->
            %{"status" => "known", "value" => value, "ask" => nil}

          :missing ->
            case ledger_row(owner_user_id, person_id, fact_key) do
              %ProfileGapAsk{status: "skipped"} ->
                %{
                  "status" => "proceed_without",
                  "value" => nil,
                  "ask" => nil,
                  "reason" => "skipped"
                }

              %ProfileGapAsk{} ->
                %{
                  "status" => "proceed_without",
                  "value" => nil,
                  "ask" => nil,
                  "reason" => "already_asked"
                }

              nil ->
                {:ok, _row} = record_ask(owner_user_id, person_id, fact_key, flow)

                %{
                  "status" => "ask",
                  "value" => nil,
                  "ask" => ask_payload(fact_key, person_name, flow)
                }
            end
        end
    end
  end

  def assess(_, _, _, _),
    do: %{"status" => "proceed_without", "value" => nil, "ask" => nil, "reason" => "invalid"}

  @doc """
  The birthday flow entry point: a birthday plan/reminder for `person_id`.

  Known birthday → `%{"status" => "known", ...}` with the date used
  silently (no ask). Unknown → one in-context ask (see `assess/4`), and
  the plan proceeds regardless (`"plan_proceeds" => true` always).
  """
  def birthday_plan_context(owner_user_id, person_id, opts \\ []) do
    result =
      assess(owner_user_id, person_id, "birthday", Keyword.put_new(opts, :flow, "birthday_plan"))

    Map.put(result, "plan_proceeds", true)
  end

  # --- answer / skip ---------------------------------------------------------

  @doc """
  Record the person's answer. The fact is admitted through
  `MemoryAdmission` + `MemoryStore` (explicit_fact, relationship scope)
  and the ledger row resolves to `answered`. Birthdays additionally write
  the durable `Celebrations` record. Returns `{:ok, fact}` or
  `{:error, reason}` — a rejected admission stores nothing durable and
  leaves the ledger `asked` (the flow still proceeds without the fact).
  """
  def answer(owner_user_id, person_id, fact_key, value, opts \\ [])

  def answer(owner_user_id, person_id, "birthday", value, opts)
      when is_binary(owner_user_id) and is_binary(person_id) do
    with {:ok, month, day, year} <- parse_birthday(value),
         {:ok, fact} <-
           admit_fact(owner_user_id, person_id, "birthday", birthday_value(month, day, year)) do
      person_name = Keyword.get(opts, :person_name)

      if is_binary(person_name) and person_name != "" do
        _ = ensure_celebration(owner_user_id, person_name, month, day, year)
      end

      _ =
        resolve_ledger(
          owner_user_id,
          person_id,
          "birthday",
          "answered",
          birthday_value(month, day, year)
        )

      {:ok, fact}
    end
  end

  def answer(owner_user_id, person_id, fact_key, value, _opts)
      when is_binary(owner_user_id) and is_binary(person_id) and is_binary(fact_key) do
    if known_fact?(fact_key) do
      text = to_string(value)

      with {:ok, fact} <- admit_fact(owner_user_id, person_id, fact_key, text) do
        _ = resolve_ledger(owner_user_id, person_id, fact_key, "answered", text)
        {:ok, fact}
      end
    else
      {:error, :unknown_fact}
    end
  end

  def answer(_, _, _, _, _), do: {:error, :invalid}

  @doc """
  Record a skip. Policy: a skip is permanent for this fact + person —
  the mechanism never asks again. The flow proceeds without the fact.
  """
  def skip(owner_user_id, person_id, fact_key)
      when is_binary(owner_user_id) and is_binary(person_id) and is_binary(fact_key) do
    resolve_ledger(owner_user_id, person_id, fact_key, "skipped", nil)
  end

  def skip(_, _, _), do: {:error, :invalid}

  @doc "Ledger row for (owner, person, fact), or nil."
  def ledger_row(owner_user_id, person_id, fact_key) do
    Repo.get_by(ProfileGapAsk,
      owner_user_id: owner_user_id,
      person_id: person_id,
      fact_key: fact_key
    )
  end

  # --- internals -------------------------------------------------------------

  defp ask_payload(fact_key, person_name, flow) do
    %{
      "fact_key" => fact_key,
      "prompt" => prompt_for(fact_key, person_name),
      "flow" => flow,
      # QUIET law surface contract: an ask is an offer, never a wall.
      "blocking" => false,
      "dismissible" => true,
      "skip_label" => "Skip",
      "asked_once" => true
    }
  end

  defp prompt_for("household", _person_name) do
    "Quick one — you plan with the same people a lot. Are you a household? " <>
      "Setting one up makes home plans faster. Skip is totally fine."
  end

  defp prompt_for("birthday", person_name) do
    "Quick one while we plan — when's #{person_name}'s birthday? " <>
      "I'll remember it so next year just works. Skip is totally fine."
  end

  defp prompt_for(fact_key, _person_name),
    do: "Quick one — what's their #{fact_key}? Skip is fine."

  defp record_ask(owner_user_id, person_id, fact_key, flow) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %ProfileGapAsk{}
    |> ProfileGapAsk.changeset(%{
      owner_user_id: owner_user_id,
      person_id: person_id,
      fact_key: fact_key,
      status: "asked",
      asked_in_flow: flow,
      asked_at: now
    })
    |> Repo.insert(
      on_conflict: :nothing,
      conflict_target: [:owner_user_id, :person_id, :fact_key]
    )
  end

  defp resolve_ledger(owner_user_id, person_id, fact_key, status, value) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    case ledger_row(owner_user_id, person_id, fact_key) do
      nil ->
        %ProfileGapAsk{}
        |> ProfileGapAsk.changeset(%{
          owner_user_id: owner_user_id,
          person_id: person_id,
          fact_key: fact_key,
          status: status,
          answered_value: value,
          asked_at: now,
          resolved_at: now
        })
        |> Repo.insert()

      %ProfileGapAsk{} = row ->
        row
        |> ProfileGapAsk.changeset(%{
          status: status,
          answered_value: value || row.answered_value,
          resolved_at: now
        })
        |> Repo.update()
    end
  end

  defp admit_fact(owner_user_id, person_id, fact_key, value) do
    dimension = @facts[fact_key].dimension

    case MemoryStore.admit(%{
           "kind" => "explicit_fact",
           "scope" => "relationship",
           "owner_user_id" => owner_user_id,
           "user_id" => owner_user_id,
           "counterpart_user_id" => person_id,
           "dimension" => dimension,
           "value" => value,
           "text" => value,
           "source" => "profile_gap_answer",
           "source_event" => "progressive_profile"
         }) do
      {:ok, fact} -> {:ok, fact}
      {:reject, decision} -> {:error, {:admission_rejected, decision["reason"]}}
    end
  end

  # Known-value lookup order: durable Celebrations record (birthdays, by
  # person name when the caller knows it) → admitted relationship memory.
  defp known_value(owner_user_id, person_id, "birthday", person_name) do
    case celebration_value(owner_user_id, person_name) do
      {:ok, _} = ok -> ok
      :missing -> memory_value(owner_user_id, person_id, "birthday")
    end
  end

  defp known_value(owner_user_id, person_id, fact_key, _person_name) do
    memory_value(owner_user_id, person_id, fact_key)
  end

  defp celebration_value(_owner_user_id, person_name)
       when not is_binary(person_name) or person_name == "",
       do: :missing

  defp celebration_value(owner_user_id, person_name) do
    row =
      from(c in Celebration,
        where: c.user_id == ^owner_user_id and c.kind == "birthday",
        where: fragment("lower(?) = lower(?)", c.person_name, ^person_name)
      )
      |> Repo.one()

    case row do
      %Celebration{month: m, day: d, year: y} -> {:ok, birthday_value(m, d, y)}
      nil -> :missing
    end
  end

  defp memory_value(owner_user_id, person_id, fact_key) do
    dimension = @facts[fact_key].dimension

    result =
      MemoryStore.retrieve(%{
        "owner_user_id" => owner_user_id,
        "user_id" => owner_user_id,
        "counterpart_user_id" => person_id,
        "scope" => "relationship",
        "dimension" => dimension
      })

    case result["memories"] do
      [%{"value" => value} | _] when is_binary(value) and value != "" -> {:ok, value}
      _ -> :missing
    end
  end

  defp ensure_celebration(owner_user_id, person_name, month, day, year) do
    case celebration_value(owner_user_id, person_name) do
      {:ok, _} ->
        :ok

      :missing ->
        case Celebrations.create(owner_user_id, %{
               "person_name" => person_name,
               "kind" => "birthday",
               "month" => month,
               "day" => day,
               "year" => year
             }) do
          {:ok, _} -> :ok
          _ -> :error
        end
    end
  end

  # Accepts a %Date{}, an ISO "YYYY-MM-DD", or a map with month/day(/year).
  defp parse_birthday(%Date{} = date), do: {:ok, date.month, date.day, date.year}

  defp parse_birthday(%{"month" => m, "day" => d} = map),
    do: validate_birthday(to_int(m), to_int(d), to_int(Map.get(map, "year")))

  defp parse_birthday(%{month: m, day: d} = map),
    do: validate_birthday(m, d, Map.get(map, :year))

  defp parse_birthday(value) when is_binary(value) do
    case Date.from_iso8601(String.trim(value)) do
      {:ok, date} -> {:ok, date.month, date.day, date.year}
      _ -> {:error, :invalid_birthday}
    end
  end

  defp parse_birthday(_), do: {:error, :invalid_birthday}

  defp validate_birthday(month, day, year)
       when is_integer(month) and is_integer(day) and month in 1..12 and day in 1..31 do
    if Celebration.valid_month_day?(month, day) do
      {:ok, month, day, year}
    else
      {:error, :invalid_birthday}
    end
  end

  defp validate_birthday(_, _, _), do: {:error, :invalid_birthday}

  defp to_int(v) when is_integer(v), do: v

  defp to_int(v) when is_binary(v) do
    case Integer.parse(v) do
      {n, _} -> n
      _ -> nil
    end
  end

  defp to_int(_), do: nil

  defp birthday_value(month, day, year) when is_integer(year) do
    case Date.new(year, month, day) do
      {:ok, date} -> Date.to_iso8601(date)
      _ -> birthday_value(month, day, nil)
    end
  end

  defp birthday_value(month, day, _year) do
    "annual:#{pad(month)}-#{pad(day)}"
  end

  defp pad(n), do: n |> Integer.to_string() |> String.pad_leading(2, "0")
end

defmodule OpalCore.Intelligence.ColdStart do
  @moduledoc """
  Cold-start / intelligence maturity (Paste E Phase 2).

  Founder-tunable thresholds:
  - `@learning_days` / `@learning_msgs` — new → learning (7d / 50 msgs)
  - `@established_days` / `@established_msgs` — learning → established (30d / 500 msgs)
  - `@max_learning_questions_per_day` — in-conversation learning Qs (default 3; NOT attention budget)

  Maturity gates proactivity via AttentionBudget:
  - `:new` — only time_critical + mediation
  - `:learning` — + reminder
  - `:established` — all priorities
  """

  require Logger
  import Ecto.Query

  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.AssistancePreference
  alias OpalCore.SocialMemory.{ConversationIndex, PersonMemory, Routine, TemporalAnchor}

  # founder-tunable
  @learning_days 7
  @learning_msgs 50
  @established_days 30
  @established_msgs 500
  @max_learning_questions_per_day 3

  @seed_question """
  To help me look out for you — who do you see regularly, and are there any big dates I should remember (birthdays, anniversaries)? Reply anytime, or say "skip".
  """

  def maturity_of(account_id) when is_binary(account_id) do
    pref = ensure_pref(account_id)
    stored = pref.intelligence_maturity

    computed = compute_maturity(account_id)

    # Promote only (never demote stored established)
    next =
      cond do
        stored == "established" or computed == :established -> :established
        stored == "learning" or computed == :learning -> :learning
        true -> :new
      end

    if to_string(next) != stored do
      _ =
        pref
        |> AssistancePreference.changeset(%{intelligence_maturity: to_string(next)})
        |> Repo.update()
    end

    next
  end

  def compute_maturity(account_id) when is_binary(account_id) do
    {age_days, msg_count} = activity_stats(account_id)

    cond do
      age_days >= @established_days or msg_count >= @established_msgs -> :established
      age_days >= @learning_days or msg_count >= @learning_msgs -> :learning
      true -> :new
    end
  end

  @doc "Curious (new/learning) vs established system instruction fragment."
  def maturity_prompt_instruction(account_id) when is_binary(account_id) do
    case maturity_of(account_id) do
      :established ->
        "You know this person well. Be concise; prefer acting on confirmed memory over re-asking."

      :learning ->
        "You're still learning this person. Be warmly curious; confirm uncertain facts once; avoid assuming routines."

      :new ->
        "This is a new relationship with Opal. Be warmly curious; ask short clarifying questions; do not invent history."
    end
  end

  @doc """
  Post one skippable onboarding seed Q&A to Opal Center if not yet completed.
  Contact import only if permission already granted (no new permission request).
  """
  def maybe_seed_onboarding(account_id) when is_binary(account_id) do
    pref = ensure_pref(account_id)

    if match?(%DateTime{}, pref.onboarding_seed_completed_at) do
      {:ok, :already}
    else
      with {:ok, conversation} <- OpalConversations.get_or_create_conversation(account_id),
           {:ok, msg} <-
             %OpalMessage{}
             |> OpalMessage.changeset(%{
               "conversation_id" => conversation.id,
               "role" => "opal",
               "body" => String.slice(@seed_question, 0, OpalMessage.max_body()),
               "metadata" => %{
                 "source" => "cold_start_seed",
                 "skippable" => true,
                 "skip_token" => "skip"
               }
             })
             |> Repo.insert() do
        Logger.info("cold_start.seed_posted account=#{account_id} msg=#{msg.id}")
        {:ok, msg}
      end
    end
  end

  @doc """
  Handle owner reply to seed Q&A. \"skip\" completes without seeding.
  Otherwise extract light person/routine/anchor seeds with provenance :stated.
  """
  def handle_seed_reply(account_id, body) when is_binary(account_id) and is_binary(body) do
    pref = ensure_pref(account_id)

    if match?(%DateTime{}, pref.onboarding_seed_completed_at) do
      {:ok, :already}
    else
      trimmed = String.trim(body)

      if Regex.match?(~r/^skip\b/i, trimmed) do
        mark_seed_done(pref)
        {:ok, :skipped}
      else
        _ = seed_from_text(account_id, trimmed)
        mark_seed_done(pref)
        {:ok, :seeded}
      end
    end
  end

  @doc "In-conversation learning question gate (max 3/day; not attention budget)."
  def allow_learning_question?(account_id) when is_binary(account_id) do
    pref = ensure_pref(account_id)
    today = Date.utc_today()

    {count, pref} =
      if pref.learning_questions_on == today do
        {pref.learning_questions_count || 0, pref}
      else
        {:ok, pref} =
          pref
          |> AssistancePreference.changeset(%{
            learning_questions_on: today,
            learning_questions_count: 0
          })
          |> Repo.update()

        {0, pref}
      end

    if count < @max_learning_questions_per_day do
      _ =
        pref
        |> AssistancePreference.changeset(%{learning_questions_count: count + 1})
        |> Repo.update()

      true
    else
      false
    end
  end

  defp seed_from_text(account_id, text) do
    # Lightweight: store a stated note on self person_memory; optional routine/anchor stubs
    ensure_person(account_id, account_id)

    case Repo.get_by(PersonMemory, account_id: account_id, person_id: account_id) do
      %PersonMemory{} = row ->
        facts = row.known_facts || %{}

        facts =
          Map.put(facts, "onboarding_note", %{
            "value" => String.slice(text, 0, 400),
            "provenance" => "stated",
            "learned_at" => DateTime.utc_now() |> DateTime.to_iso8601()
          })

        row |> PersonMemory.changeset(%{known_facts: facts}) |> Repo.update()

      _ ->
        :ok
    end

    # If text mentions a weekday + person-ish phrase, seed a low-confidence routine
    if Regex.match?(~r/\b(every|usually|regularly)\b/i, text) do
      %Routine{}
      |> Routine.changeset(%{
        account_id: account_id,
        activity: String.slice(text, 0, 120),
        cadence: "weekly",
        confidence: 0.4,
        detection_count: 1,
        last_occurrence_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.insert()
    end

    # Birthday-ish → temporal anchor needing confirmation
    case Regex.run(~r/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i, text) do
      [_, month_name, day_s] ->
        with {:ok, date} <- rough_date(month_name, String.to_integer(day_s)) do
          %TemporalAnchor{}
          |> TemporalAnchor.changeset(%{
            account_id: account_id,
            person_id: account_id,
            anchor_type: "birthday",
            date: date,
            source_text: String.slice(text, 0, 200),
            confidence: 0.5,
            needs_confirmation: true,
            confirmed: false
          })
          |> then(fn cs ->
            # provenance via source_text marker; E4 adds column
            cs
            |> Ecto.Changeset.put_change(:source_text, "[stated] " <> (Ecto.Changeset.get_field(cs, :source_text) || ""))
            |> Repo.insert()
          end)
        end

      _ ->
        :ok
    end

    :ok
  rescue
    e ->
      Logger.warning("cold_start.seed_from_text_failed #{Exception.message(e)}")
      :ok
  end

  defp rough_date(month_name, day) do
    months = %{
      "january" => 1,
      "february" => 2,
      "march" => 3,
      "april" => 4,
      "may" => 5,
      "june" => 6,
      "july" => 7,
      "august" => 8,
      "september" => 9,
      "october" => 10,
      "november" => 11,
      "december" => 12
    }

    m = Map.get(months, String.downcase(month_name))
    year = Date.utc_today().year

    if is_integer(m), do: Date.new(year, m, day), else: {:error, :bad_month}
  end

  defp ensure_person(account_id, person_id) do
    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      nil ->
        %PersonMemory{}
        |> PersonMemory.changeset(%{account_id: account_id, person_id: person_id})
        |> Repo.insert()

      row ->
        {:ok, row}
    end
  end

  defp mark_seed_done(pref) do
    pref
    |> AssistancePreference.changeset(%{
      onboarding_seed_completed_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
    })
    |> Repo.update()
  end

  defp activity_stats(account_id) do
    since_forever = ~U[2000-01-01 00:00:00Z]

    rows =
      from(i in ConversationIndex,
        where: i.account_id == ^account_id,
        select: {i.message_count, i.last_activity_at, i.inserted_at}
      )
      |> Repo.all()

    msg_count = Enum.reduce(rows, 0, fn {c, _, _}, acc -> acc + (c || 0) end)

    earliest =
      rows
      |> Enum.map(fn {_, last, inserted} -> last || inserted end)
      |> Enum.reject(&is_nil/1)
      |> Enum.min(DateTime, fn -> nil end)

    age_days =
      case earliest do
        %DateTime{} = dt -> div(DateTime.diff(DateTime.utc_now(), dt, :second), 86_400)
        _ -> 0
      end

    # Also consider account pref inserted_at as age floor
    _ = since_forever
    {age_days, msg_count}
  end

  defp ensure_pref(account_id) do
    case Repo.get_by(AssistancePreference, user_id: account_id) do
      %AssistancePreference{} = p ->
        p

      nil ->
        {:ok, p} =
          %AssistancePreference{}
          |> AssistancePreference.changeset(%{
            user_id: account_id,
            timezone: "America/Los_Angeles",
            intelligence_maturity: "new"
          })
          |> Repo.insert()

        p
    end
  end
end

defmodule OpalCore.Trivia do
  @moduledoc """
  Repair #21 (W-9 expanded) - OPAL TRIVIA, the social game from
  coordination/repair19/polish-concepts.md, built as designed:

  - Questions draw only on what the guesser legitimately holds
    about the subject. The write gate here enforces the circle:
    the guesser must hold a relationship row naming the subject
    (Relationships.RelationshipType) - no row, no game about that
    person (scope law as a mechanic, not a promise).
  - Sensitivity gates from the concept record: a minor subject
    (family_minor or a minor age band on the guesser's row) may
    only be quizzed inside a family relationship.
  - A guess is a guess: it persists as the game's own
    provenance-tagged record and NEVER overwrites truth. Only
    the subject validates. Validation ("right") enriches the
    SUBJECT's own memory wallet through the existing capsule
    path (CapsuleRead.remember, source_kind
    "trivia_validation") - the guesser's wallet is never
    written, and an anonymous guess contributes no counterpart
    to the capsule's scope.
  - Scores (founder spec 2026-10-20 15:41, superseding the
    concepts sketch): points for validated knowing, kept as a
    clean derived ledger. INERT - monetization is parked by the
    founder; nothing here designs toward rewards or discounts.
  - AI proposes questions only (client-side templates over held
    records); verification comes from people, NEVER from AI
    inference - there is no model-confirmation path in this
    context, by spec.
  """

  import Ecto.Query

  alias OpalCore.MemoryWallet.CapsuleRead
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo
  alias OpalCore.Trivia.Guess

  @doc """
  Record a guess by `guesser_user_id` about `subject_user_id`.

  Returns {:error, :not_in_circle} when the guesser holds no
  relationship row for the subject, {:error, :minor_gate} when
  the subject is a minor outside a family tie, and
  {:error, :self_guess} when guesser == subject (About You is a
  different leg - self-validation never travels this path).
  """
  def record_guess(guesser_user_id, subject_user_id, attrs)
      when is_binary(guesser_user_id) and is_binary(subject_user_id) and is_map(attrs) do
    cond do
      guesser_user_id == subject_user_id ->
        {:error, :self_guess}

      true ->
        case circle_row(guesser_user_id, subject_user_id) do
          nil ->
            {:error, :not_in_circle}

          %RelationshipType{} = row ->
            if minor_subject?(row) and row.type != "family" do
              {:error, :minor_gate}
            else
              %Guess{guesser_user_id: guesser_user_id, subject_user_id: subject_user_id}
              |> Guess.changeset(stringify(attrs))
              |> Repo.insert()
            end
        end
    end
  end

  def record_guess(_, _, _), do: {:error, :invalid}

  @doc "The two read legs: guesses about me, and guesses I made."
  def list_for_user(user_id) when is_binary(user_id) do
    about_me =
      from(g in Guess,
        where: g.subject_user_id == ^user_id,
        order_by: [desc: g.inserted_at],
        limit: 50
      )
      |> Repo.all()

    mine =
      from(g in Guess,
        where: g.guesser_user_id == ^user_id,
        order_by: [desc: g.inserted_at],
        limit: 50
      )
      |> Repo.all()

    # The score ledger (founder spec 2026-10-20 15:41): points for
    # validated knowing only - being right about your people, and
    # your people confirming it. INERT by design: no rewards, no
    # discounts, no monetization wiring reads this; the ledger is
    # the whole build. Derived from the records, never stored
    # separately, so it can never drift from the truth.
    validated = Enum.filter(mine, &(&1.status == "validated"))
    validated_count = length(validated)

    # Bonus-round guesses carry multiplier 2 (founder round
    # structure 2026-10-20 15:43): the multiplier touches the
    # SCORE only - nothing else in the system reads points.
    points = Enum.reduce(validated, 0, fn g, acc -> acc + 10 * (g.multiplier || 1) end)

    score = %{
      "validated_count" => validated_count,
      "points" => points
    }

    {:ok, %{about_me: about_me, mine: mine, score: score}}
  end

  def list_for_user(_), do: {:error, :invalid}

  @doc """
  Subject-only validation. `verdict` is "right" or "wrong".

  On "right", the guess's fact is written to the SUBJECT's
  wallet as a capsule through CapsuleRead.remember (the R20
  anchor-scoped capsule path's own write machinery), tagged
  source_kind "trivia_validation" / source_label "Confirmed in
  Opal Trivia". The capsule id lands on the guess record, so
  the enrichment is traceable. A capsule write failure does NOT
  un-validate the guess - the record reports capsule_id nil and
  the validation stands as the game's truth.
  """
  def validate_guess(subject_user_id, guess_id, verdict)
      when is_binary(subject_user_id) and is_binary(guess_id) and verdict in ["right", "wrong"] do
    case Repo.get(Guess, guess_id) do
      %Guess{subject_user_id: ^subject_user_id, status: "pending"} = guess ->
        status = if verdict == "right", do: "validated", else: "rejected"

        capsule_id =
          if verdict == "right" do
            enrich_subject_wallet(guess)
          end

        guess
        |> Guess.validate_changeset(status, capsule_id)
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, updated, capsule_id != nil}
          other -> other
        end

      %Guess{subject_user_id: ^subject_user_id} ->
        {:error, :already_validated}

      %Guess{} ->
        {:error, :not_found}

      nil ->
        {:error, :not_found}
    end
  end

  def validate_guess(_, _, _), do: {:error, :invalid}

  defp enrich_subject_wallet(%Guess{} = guess) do
    attrs = %{
      "summary" => guess.fact_summary,
      "source_kind" => "trivia_validation",
      "source_label" => "Confirmed in Opal Trivia",
      "learned_from_kind" => "trivia_validation",
      "purpose" => "trivia_validated_fact",
      "scope_kind" => if(guess.anonymous, do: "user", else: "relationship"),
      "scope_id" => if(guess.anonymous, do: nil, else: guess.guesser_user_id),
      "counterpart_user_id" => if(guess.anonymous, do: nil, else: guess.guesser_user_id)
    }

    case CapsuleRead.remember(guess.subject_user_id, attrs) do
      {:ok, capsule} -> capsule.id
      _ -> nil
    end
  end

  defp circle_row(guesser_user_id, subject_user_id) do
    from(r in RelationshipType,
      where: r.user_id == ^guesser_user_id and r.contact_user_id == ^subject_user_id
    )
    |> Repo.one()
  end

  defp minor_subject?(%RelationshipType{} = row) do
    row.family_minor == true or row.age_band in ["under_13", "age_13_17"]
  end

  defp stringify(attrs) do
    Map.new(attrs, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end

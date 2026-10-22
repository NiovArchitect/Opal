defmodule OpalCore.TriviaTest do
  @moduledoc """
  Repair #21 (W-9 expanded) - Opal Trivia truth-in-model pins:

  - a guess requires the circle (a relationship row naming the
    subject); outside the circle there is no game about a person;
  - a minor subject is gated to family ties;
  - a guess is a guess: recording one writes NO capsule anywhere;
  - only the subject validates, and validation ("right") is the
    one leg that enriches the SUBJECT's wallet - through the
    existing capsule path, provenance-tagged trivia_validation;
  - an anonymous guess never exposes the guesser in its contract.
  """
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.MemoryWallet.CapsuleRead
  alias OpalCore.MemoryWallet.PersonalMemoryCapsule
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo
  alias OpalCore.Trivia

  defp user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp relate!(user_id, contact_id, type, opts \\ []) do
    %RelationshipType{}
    |> RelationshipType.changeset(
      Map.merge(
        %{
          user_id: user_id,
          contact_user_id: contact_id,
          type: type,
          family_minor: Keyword.get(opts, :family_minor, false),
          age_band: Keyword.get(opts, :age_band)
        },
        %{}
      )
    )
    |> Repo.insert!()
  end

  defp guess_attrs do
    %{
      "question" => "When is Maya's birthday?",
      "guess" => "June 14",
      "fact_summary" => "Maya's birthday is June 14"
    }
  end

  test "a guess outside the circle is refused" do
    guesser = user!("tv-g1")
    subject = user!("tv-s1")

    assert {:error, :not_in_circle} =
             Trivia.record_guess(guesser.id, subject.id, guess_attrs())
  end

  test "a guess about yourself is refused (About You is a different leg)" do
    me = user!("tv-self")
    assert {:error, :self_guess} = Trivia.record_guess(me.id, me.id, guess_attrs())
  end

  test "a minor subject is gated to family ties" do
    guesser = user!("tv-g2")
    minor = user!("tv-m2")
    relate!(guesser.id, minor.id, "close_friend", family_minor: true)

    assert {:error, :minor_gate} =
             Trivia.record_guess(guesser.id, minor.id, guess_attrs())

    # The same minor inside a family tie may be quizzed.
    family_guesser = user!("tv-g3")
    relate!(family_guesser.id, minor.id, "family", family_minor: true)

    assert {:ok, _guess} =
             Trivia.record_guess(family_guesser.id, minor.id, guess_attrs())
  end

  test "recording a guess writes no capsule; subject validation enriches the subject wallet only" do
    guesser = user!("tv-g4")
    subject = user!("tv-s4")
    relate!(guesser.id, subject.id, "close_friend")

    assert {:ok, guess} = Trivia.record_guess(guesser.id, subject.id, guess_attrs())
    assert guess.status == "pending"
    assert guess.capsule_id == nil

    # No capsule anywhere from the guess alone.
    assert CapsuleRead.list_for_owner_browse(subject.id) == []
    assert CapsuleRead.list_for_owner_browse(guesser.id) == []

    # A non-subject cannot validate.
    assert {:error, :not_found} = Trivia.validate_guess(guesser.id, guess.id, "right")

    assert {:ok, validated, true} = Trivia.validate_guess(subject.id, guess.id, "right")
    assert validated.status == "validated"
    assert is_binary(validated.capsule_id)

    [capsule] = CapsuleRead.list_for_owner_browse(subject.id)
    assert PersonalMemoryCapsule.summary(capsule) == "Maya's birthday is June 14"
    assert capsule.provenance["source_kind"] == "trivia_validation"
    assert capsule.provenance["source_label"] == "Confirmed in Opal Trivia"
    # The guesser's wallet stays untouched.
    assert CapsuleRead.list_for_owner_browse(guesser.id) == []

    # Validation is one-shot.
    assert {:error, :already_validated} =
             Trivia.validate_guess(subject.id, guess.id, "right")
  end

  test "a wrong verdict rejects the guess and writes no capsule" do
    guesser = user!("tv-g5")
    subject = user!("tv-s5")
    relate!(guesser.id, subject.id, "friend")

    assert {:ok, guess} = Trivia.record_guess(guesser.id, subject.id, guess_attrs())
    assert {:ok, rejected, false} = Trivia.validate_guess(subject.id, guess.id, "wrong")
    assert rejected.status == "rejected"
    assert CapsuleRead.list_for_owner_browse(subject.id) == []
  end

  test "correction fixes the record with provenance and enriches the subject wallet with the corrected fact" do
    guesser = user!("tv-g7")
    subject = user!("tv-s7")
    relate!(guesser.id, subject.id, "close_friend")

    assert {:ok, guess} = Trivia.record_guess(guesser.id, subject.id, guess_attrs())
    # The claim on record: birthday June 14. The truth: June 15.

    # A non-subject cannot correct.
    assert {:error, :not_found} = Trivia.correct_guess(guesser.id, guess.id, "June 15")

    assert {:ok, corrected, true} = Trivia.correct_guess(subject.id, guess.id, "June 15")

    # Status is its own truth - corrected, never validated.
    assert corrected.status == "corrected"
    # Provenance: the original claim is untouched...
    assert corrected.guess == "June 14"
    assert corrected.fact_summary == "Maya's birthday is June 14"
    # ...and the correction carries what it was corrected to,
    # by whom, and when.
    assert corrected.corrected_guess == "June 15"
    assert corrected.corrected_fact_summary == "Maya's birthday is June 15"
    assert corrected.corrected_by_user_id == subject.id
    assert %DateTime{} = corrected.corrected_at
    assert is_binary(corrected.capsule_id)

    # The subject's wallet holds the CORRECTED fact, tagged as a
    # correction - not the wrong guess, not a plain confirmation.
    [capsule] = CapsuleRead.list_for_owner_browse(subject.id)
    assert PersonalMemoryCapsule.summary(capsule) == "Maya's birthday is June 15"
    assert capsule.provenance["source_kind"] == "trivia_correction"
    assert capsule.provenance["source_label"] == "Corrected in Know Me? Trivia"
    # The guesser's wallet stays untouched.
    assert CapsuleRead.list_for_owner_browse(guesser.id) == []

    # The wire contract carries the correction to BOTH parties.
    contract = OpalCore.Trivia.Guess.to_contract(corrected)
    assert contract["status"] == "corrected"
    assert contract["corrected_guess"] == "June 15"
    assert contract["corrected_by_user_id"] == subject.id
    assert is_binary(contract["corrected_at"])

    # Correction is one-shot, like validation.
    assert {:error, :already_validated} =
             Trivia.correct_guess(subject.id, guess.id, "June 16")

    assert {:error, :already_validated} =
             Trivia.validate_guess(subject.id, guess.id, "right")
  end

  test "a corrected guess scores nothing: no points, not validated, counted as corrected" do
    guesser = user!("tv-g8")
    subject = user!("tv-s8")
    relate!(guesser.id, subject.id, "friend")

    assert {:ok, guess} = Trivia.record_guess(guesser.id, subject.id, guess_attrs())
    assert {:ok, _corrected, _} = Trivia.correct_guess(subject.id, guess.id, "June 15")

    assert {:ok, %{score: score}} = Trivia.list_for_user(guesser.id)
    assert score["points"] == 0
    assert score["validated_count"] == 0
    assert score["corrected_count"] == 1
  end

  test "empty and no-op corrections are refused and leave the guess pending" do
    guesser = user!("tv-g9")
    subject = user!("tv-s9")
    relate!(guesser.id, subject.id, "friend")

    assert {:ok, guess} = Trivia.record_guess(guesser.id, subject.id, guess_attrs())

    assert {:error, %Ecto.Changeset{}} = Trivia.correct_guess(subject.id, guess.id, "")
    assert {:error, %Ecto.Changeset{}} = Trivia.correct_guess(subject.id, guess.id, "   ")
    # Repeating the claim is not a correction.
    assert {:error, %Ecto.Changeset{}} = Trivia.correct_guess(subject.id, guess.id, "June 14")
    assert {:error, :invalid} = Trivia.correct_guess(subject.id, guess.id, nil)

    assert {:ok, %{about_me: [still]}} = Trivia.list_for_user(subject.id)
    assert still.status == "pending"
    assert still.corrected_guess == nil
    assert CapsuleRead.list_for_owner_browse(subject.id) == []
  end

  test "an anonymous guess withholds the guesser from its contract" do
    guesser = user!("tv-g6")
    subject = user!("tv-s6")
    relate!(guesser.id, subject.id, "friend")

    assert {:ok, guess} =
             Trivia.record_guess(
               guesser.id,
               subject.id,
               Map.put(guess_attrs(), "anonymous", true)
             )

    contract = OpalCore.Trivia.Guess.to_contract(guess)
    assert contract["guesser_user_id"] == nil
    assert contract["anonymous"] == true
    # The record itself still holds provenance server-side.
    assert guess.guesser_user_id == guesser.id
  end
end

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

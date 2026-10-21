defmodule OpalCore.Repo.Migrations.CreateTriviaGuesses do
  use Ecto.Migration

  # Repair #21 (W-9 expanded, Opal Trivia) - additive only.
  #
  # trivia_guesses: the game's own provenance-tagged records. A
  # guess is a GUESS forever until the subject validates it: the
  # status column is the truth state (pending / validated /
  # rejected), and a guess NEVER writes memory by itself. On
  # validation the subject's wallet gains a capsule through the
  # existing CapsuleRead.remember path (source_kind
  # "trivia_validation"); capsule_id records that write so the
  # enrichment is traceable back to this record.
  def change do
    create table(:trivia_guesses, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :guesser_user_id, :binary_id, null: false
      add :subject_user_id, :binary_id, null: false
      add :question, :string, null: false
      add :guess, :string, null: false
      add :fact_summary, :string, null: false
      add :anonymous, :boolean, null: false, default: false
      add :multiplier, :integer, null: false, default: 1
      add :status, :string, null: false, default: "pending"
      add :capsule_id, :binary_id
      add :validated_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:trivia_guesses, [:subject_user_id, :status])
    create index(:trivia_guesses, [:guesser_user_id])
  end
end

defmodule OpalCore.Repo.Migrations.AddTriviaCorrection do
  use Ecto.Migration

  # Repair #22 (WS-7) - the Know Me? Trivia CORRECTION path.
  # Additive only.
  #
  # When the subject answers "Not quite", they may state the
  # proper correction. The correction must FIX THE RECORD
  # without rewriting history: the original `guess` and
  # `fact_summary` columns are never touched by a correction.
  # Instead the correction lands in its own columns - what the
  # truth actually is (corrected_guess / corrected_fact_summary),
  # who corrected it (corrected_by_user_id - always the subject,
  # set programmatically), and when (corrected_at). That triple
  # is the consent lineage / audit trail for the correction:
  # anyone reading the record later can see what was claimed,
  # what it was corrected to, by whom, and when.
  def change do
    alter table(:trivia_guesses) do
      add :corrected_guess, :string
      add :corrected_fact_summary, :string
      add :corrected_by_user_id, :binary_id
      add :corrected_at, :utc_datetime_usec
    end
  end
end

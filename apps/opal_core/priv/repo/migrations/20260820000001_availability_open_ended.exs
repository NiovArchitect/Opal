defmodule OpalCore.Repo.Migrations.AvailabilityOpenEnded do
  @moduledoc """
  Open-ended social time: start required, end optional.

  open_ended=true means the human did not declare a predetermined end.
  Overlap engines may use a soft computational horizon without presenting
  that horizon as a human-set until time.
  """
  use Ecto.Migration

  def change do
    alter table(:availability_windows) do
      add :open_ended, :boolean, null: false, default: false
    end

    # Allow null end_at when open_ended (social start-only windows).
    execute(
      "ALTER TABLE availability_windows ALTER COLUMN end_at DROP NOT NULL",
      "ALTER TABLE availability_windows ALTER COLUMN end_at SET NOT NULL"
    )
  end
end

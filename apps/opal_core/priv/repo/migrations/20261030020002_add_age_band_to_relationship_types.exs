defmodule OpalCore.Repo.Migrations.AddAgeBandToRelationshipTypes do
  use Ecto.Migration

  # Founder Screen Notes N4 - additive only.
  #
  # relationship_types.age_band: the age band the viewer has
  # established for the counterpart on THIS relationship record -
  # "under_13" | "age_13_17" | "adult", or NULL when none has been
  # established. Affordance only: NO policy reads this column yet
  # (what bands restrict is a founder-gated policy decision that
  # binds to this exact shape later). Minor, in the founder's
  # terms, is 17 and under - the two non-adult bands.
  def change do
    alter table(:relationship_types) do
      add :age_band, :string
    end
  end
end

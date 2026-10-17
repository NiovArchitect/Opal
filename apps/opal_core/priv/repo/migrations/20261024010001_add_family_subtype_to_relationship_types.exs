defmodule OpalCore.Repo.Migrations.AddFamilySubtypeToRelationshipTypes do
  @moduledoc """
  Repair #15 Track B — additive family subtype dimension.

  Adds two nullable columns to `relationship_types`; no existing column is
  changed or dropped, no existing row needs a backfill (nil subtype = the
  plain RU-1 `family` behavior proven in Repair #14).
  """
  use Ecto.Migration

  def up do
    alter table(:relationship_types) do
      add :family_subtype, :string
      add :family_minor, :boolean, default: false, null: false
    end
  end

  def down do
    alter table(:relationship_types) do
      remove :family_minor
      remove :family_subtype
    end
  end
end

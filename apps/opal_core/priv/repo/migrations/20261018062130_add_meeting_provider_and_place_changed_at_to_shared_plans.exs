defmodule OpalCore.Repo.Migrations.AddMeetingProviderAndPlaceChangedAtToSharedPlans do
  use Ecto.Migration

  # Repair #18 Division B (B1) - strictly additive, following the
  # 20261020010001 virtual-plans template: two nullable columns, no
  # renames, no drops, no backfill. The R17 fallback build runs
  # correctly against a database with these columns present.
  #
  # - meeting_provider: the LABEL of a virtual plan's room provider
  #   (zoom / google_meet / teams / facetime / other), derived at
  #   write time so surfaces never re-parse URLs. Not an integration.
  # - place_changed_at: stamp of the last place-type conversion;
  #   nil for never-converted plans.
  def change do
    alter table(:shared_plans) do
      add :meeting_provider, :string
      add :place_changed_at, :utc_datetime_usec
    end
  end
end

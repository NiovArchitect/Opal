defmodule OpalCore.Repo.Migrations.AddTenseToSocialMoments do
  use Ecto.Migration

  # Repair #24 (WS-6) - moment tense persistence. Additive only.
  #
  # The creation tense vocabulary already exists in the creation
  # walkthrough (web CreationTense in flows2.ts, carried into the
  # graph-create flow): "present" (Now) / "future" (Forecast) /
  # "past" (Memories). Moments created from inside a tense panel
  # previously had nowhere server-side to keep that tense, so the
  # server's model was present-tense by construction. This column
  # gives the moment record the same vocabulary - no second one is
  # invented. Existing rows take the honest default: "present",
  # which is exactly what the server always meant for them.
  def change do
    alter table(:social_moments) do
      add :tense, :string, null: false, default: "present"
    end
  end
end

defmodule OpalCore.Repo.Migrations.CreateDsiPhase3 do
  use Ecto.Migration

  def change do
    create table(:dsi_experience_completions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :opportunity_id,
          references(:dsi_experience_opportunities, type: :binary_id, on_delete: :delete_all),
          null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :confirmed_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :status, :string, null: false, default: "completed"
      # User-facing continuity label: Happened | Handled | Complete
      add :continuity_label, :string, null: false, default: "Happened"
      add :evidence_class, :string, null: false, default: "explicit_confirmation"
      add :idempotency_key, :string, null: false
      add :completed_at, :utc_datetime_usec, null: false
      # Never store private constraint values here.
      add :shared_safe_summary, :string
      add :preferred_candidate_id, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:dsi_experience_completions, [:opportunity_id])
    create unique_index(:dsi_experience_completions, [:idempotency_key])
    create index(:dsi_experience_completions, [:conversation_id])

    create table(:dsi_reflections, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :opportunity_id,
          references(:dsi_experience_opportunities, type: :binary_id, on_delete: :delete_all),
          null: false

      add :completion_id,
          references(:dsi_experience_completions, type: :binary_id, on_delete: :delete_all),
          null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :status, :string, null: false, default: "eligible"
      # eligible | suppressed | surfaced | answered | expired
      add :prompt, :string, null: false, default: "Would you choose a place like this again?"
      add :suppression_reason, :string
      add :response, :string
      # yes | maybe | not_with_this_group
      add :responded_by_user_id, :binary_id
      add :responded_at, :utc_datetime_usec
      add :surfaced_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:dsi_reflections, [:opportunity_id])
    create unique_index(:dsi_reflections, [:idempotency_key])
    create index(:dsi_reflections, [:conversation_id, :status])

    create table(:dsi_scoped_learnings, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :opportunity_id, :binary_id
      add :completion_id, :binary_id
      add :experience_type, :string, null: false, default: "dinner"
      add :participant_set_key, :string, null: false
      add :dimension, :string, null: false
      # quiet_venue | moderate_cost | timing | balanced_travel | similar_dinner
      add :value, :string, null: false
      add :confidence, :float, null: false, default: 0.5
      add :active, :boolean, null: false, default: true
      add :source, :string, null: false, default: "explicit_reflection"
      # explicit_reflection | inferred_outcome | suppressed
      add :suppressed_by_correction, :boolean, null: false, default: false
      add :expires_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:dsi_scoped_learnings, [:idempotency_key])
    create index(:dsi_scoped_learnings, [:participant_set_key, :experience_type, :active])
    create index(:dsi_scoped_learnings, [:conversation_id, :active])
  end
end

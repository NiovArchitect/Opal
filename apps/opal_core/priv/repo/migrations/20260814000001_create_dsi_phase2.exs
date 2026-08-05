defmodule OpalCore.Repo.Migrations.CreateDsiPhase2 do
  use Ecto.Migration

  def change do
    create table(:dsi_social_contexts, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :context_type, :string, null: false, default: "dinner_forming"
      add :status, :string, null: false, default: "candidate"
      add :confidence, :float, null: false, default: 0.0
      add :participant_user_ids, {:array, :binary_id}, null: false, default: []
      add :shared_facts, :map, null: false, default: %{}
      # Protected private feature refs only (no raw private budget values in shared use).
      add :private_feature_refs, :map, null: false, default: %{}
      add :evaluation_key, :string, null: false
      add :message_boundary, :string
      add :suppressed_at, :utc_datetime_usec
      add :suppression_reason, :string
      add :revoked_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :completed_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:dsi_social_contexts, [:conversation_id, :evaluation_key],
             name: :dsi_social_contexts_conversation_eval_unique
           )

    create index(:dsi_social_contexts, [:conversation_id, :status])
    create index(:dsi_social_contexts, [:expires_at])

    create table(:dsi_experience_opportunities, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :social_context_id,
          references(:dsi_social_contexts, type: :binary_id, on_delete: :delete_all),
          null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :status, :string, null: false, default: "eligible"
      add :headline, :string, null: false
      add :supporting_explanation, :string, null: false
      add :see_why, :string, null: false
      add :preferred_candidate_id, :string
      add :preferred_display_name, :string
      add :journey_state, :string, null: false, default: "forming"
      add :participation_summary, :string
      add :shared_projection, :map, null: false, default: %{}
      add :last_surfaced_at, :utc_datetime_usec
      add :dismissed_at, :utc_datetime_usec
      add :dismissal_reason, :string
      add :cooldown_until, :utc_datetime_usec
      add :recent_suggestion_count, :integer, null: false, default: 0
      add :expires_at, :utc_datetime_usec
      add :evaluation_key, :string, null: false
      add :version, :integer, null: false, default: 1

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:dsi_experience_opportunities, [:conversation_id, :evaluation_key],
             name: :dsi_opportunities_conversation_eval_unique
           )

    create index(:dsi_experience_opportunities, [:conversation_id, :status])
    create index(:dsi_experience_opportunities, [:social_context_id])
    create index(:dsi_experience_opportunities, [:expires_at])
    create index(:dsi_experience_opportunities, [:cooldown_until])

    create table(:dsi_experience_candidates, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :opportunity_id,
          references(:dsi_experience_opportunities, type: :binary_id, on_delete: :delete_all),
          null: false

      add :candidate_key, :string, null: false
      add :display_name, :string, null: false
      add :rank, :integer, null: false, default: 1
      add :group_safe_explanation, :string, null: false, default: ""
      add :preferred, :boolean, null: false, default: false
      add :fixture_snapshot, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:dsi_experience_candidates, [:opportunity_id, :candidate_key])
    create index(:dsi_experience_candidates, [:opportunity_id, :rank])

    create table(:dsi_participation_states, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :opportunity_id,
          references(:dsi_experience_opportunities, type: :binary_id, on_delete: :delete_all),
          null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :state, :string, null: false, default: "undecided"
      # Private only: never projected to shared audience.
      add :private_reason, :string
      add :responded_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:dsi_participation_states, [:opportunity_id, :user_id])
    create index(:dsi_participation_states, [:conversation_id, :user_id])

    create table(:dsi_context_corrections, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :social_context_id,
          references(:dsi_social_contexts, type: :binary_id, on_delete: :nilify_all)

      add :opportunity_id,
          references(:dsi_experience_opportunities, type: :binary_id, on_delete: :nilify_all)

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :kind, :string, null: false
      add :text, :string, null: false
      add :scope, :string, null: false, default: "conversation_group"
      add :experience_type, :string, null: false, default: "dinner"
      add :participant_set_key, :string
      add :duration, :string, null: false, default: "until_revoked"
      add :audience, :string, null: false, default: "self_and_context"
      add :reason_class, :string, null: false, default: "user_correction"
      add :global_label, :boolean, null: false, default: false
      add :friendship_score_change, :boolean, null: false, default: false
      add :active, :boolean, null: false, default: true
      add :revoked_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:dsi_context_corrections, [:conversation_id, :active])
    create index(:dsi_context_corrections, [:participant_set_key, :experience_type, :active])
    create index(:dsi_context_corrections, [:user_id])
  end
end

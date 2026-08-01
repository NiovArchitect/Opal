defmodule OpalCore.Repo.Migrations.CreateSocialFlow7 do
  use Ecto.Migration

  def change do
    create table(:continuity_candidates, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id,
          references(:conversations, type: :binary_id, on_delete: :delete_all),
          null: false

      add :proposed_by_user_id,
          references(:users, type: :binary_id, on_delete: :restrict),
          null: false

      add :memory_class, :string, null: false
      add :candidate_type, :string, null: false
      add :summary, :string, null: false
      add :purpose, :string
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :required_participant_ids, {:array, :binary_id}, null: false, default: []
      add :counterpart_user_id, :binary_id
      add :confidence, :float, null: false, default: 0.7
      add :uncertainty, {:array, :string}, null: false, default: []
      add :suggested_review_days, :integer, null: false, default: 90
      add :status, :string, null: false, default: "proposed"
      add :raw_candidate, :map, null: false, default: %{}
      add :idempotency_key, :string, null: false
      add :expires_at, :utc_datetime_usec
      add :resolved_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:continuity_candidates, [:idempotency_key])
    create index(:continuity_candidates, [:conversation_id, :status])

    create table(:shared_memories, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id,
          references(:conversations, type: :binary_id, on_delete: :delete_all),
          null: false

      add :candidate_id, :binary_id
      add :memory_class, :string, null: false, default: "shared_relationship"
      add :summary, :string, null: false
      add :purpose, :string, null: false, default: "shared continuity"
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :participant_ids, {:array, :binary_id}, null: false, default: []
      add :required_participant_ids, {:array, :binary_id}, null: false, default: []
      add :status, :string, null: false, default: "pending_consent"
      add :visibility, :string, null: false, default: "shared"
      add :review_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :paused_at, :utc_datetime_usec
      add :archived_at, :utc_datetime_usec
      add :deleted_at, :utc_datetime_usec
      add :deletion_state, :string, null: false, default: "active"
      add :idempotency_key, :string, null: false
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:shared_memories, [:idempotency_key])
    create index(:shared_memories, [:conversation_id, :status])

    create table(:shared_memory_consents, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :shared_memory_id,
          references(:shared_memories, type: :binary_id, on_delete: :delete_all), null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :decision, :string, null: false, default: "pending"
      add :decided_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:shared_memory_consents, [:idempotency_key])
    create unique_index(:shared_memory_consents, [:shared_memory_id, :user_id])

    create table(:social_traditions, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id,
          references(:conversations, type: :binary_id, on_delete: :delete_all),
          null: false

      add :shared_memory_id, :binary_id
      add :title, :string, null: false
      add :summary, :string, null: false
      add :tradition_type, :string, null: false, default: "relationship"
      add :recurrence_rule, :map, null: false, default: %{}
      add :participant_ids, {:array, :binary_id}, null: false, default: []
      add :required_participant_ids, {:array, :binary_id}, null: false, default: []
      add :status, :string, null: false, default: "proposed"
      add :occurrence_count, :integer, null: false, default: 0
      add :next_prompt_at, :utc_datetime_usec
      add :paused_at, :utc_datetime_usec
      add :ended_at, :utc_datetime_usec
      add :archived_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:social_traditions, [:idempotency_key])
    create index(:social_traditions, [:conversation_id, :status])

    create table(:tradition_occurrence_responses, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :tradition_id,
          references(:social_traditions, type: :binary_id, on_delete: :delete_all),
          null: false

      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :occurrence_key, :string, null: false
      add :decision, :string, null: false
      add :decided_at, :utc_datetime_usec, null: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:tradition_occurrence_responses, [:idempotency_key])

    create unique_index(:tradition_occurrence_responses, [
             :tradition_id,
             :user_id,
             :occurrence_key
           ])

    create table(:relationship_contexts, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id,
          references(:conversations, type: :binary_id, on_delete: :delete_all),
          null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :status, :string, null: false, default: "active"
      add :stop_suggestions, :boolean, null: false, default: false
      add :archive_shared, :boolean, null: false, default: false
      add :note, :string
      add :paused_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:relationship_contexts, [:idempotency_key])
    create unique_index(:relationship_contexts, [:conversation_id, :owner_user_id])

    create table(:future_invitation_prompts, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :tradition_id,
          references(:social_traditions, type: :binary_id, on_delete: :delete_all),
          null: false

      add :conversation_id,
          references(:conversations, type: :binary_id, on_delete: :delete_all),
          null: false

      add :copy, :string, null: false
      add :status, :string, null: false, default: "proposed"
      add :visibility, :string, null: false, default: "shared"
      add :responded_by_user_id, :binary_id
      add :decision, :string
      add :responded_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:future_invitation_prompts, [:idempotency_key])
    create index(:future_invitation_prompts, [:tradition_id, :status])

    create table(:memory_deletion_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :memory_kind, :string, null: false
      add :memory_id, :binary_id, null: false
      add :actor_user_id, :binary_id, null: false
      add :reason, :string
      add :deleted_at, :utc_datetime_usec, null: false
      add :payload, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec, updated_at: false)
    end

    create index(:memory_deletion_events, [:memory_kind, :memory_id])
  end
end

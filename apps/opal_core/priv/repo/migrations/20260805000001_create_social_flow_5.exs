defmodule OpalCore.Repo.Migrations.CreateSocialFlow5 do
  use Ecto.Migration

  def change do
    create table(:discovery_intents, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :plan_id, :binary_id
      add :objective_type, :string, null: false
      add :source, :string, null: false, default: "explicit_request"
      add :status, :string, null: false, default: "approved"
      add :source_message_ids, {:array, :binary_id}, null: false, default: []
      add :consent_proof_id, :binary_id
      add :idempotency_key, :string, null: false
      add :expires_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:discovery_intents, [:idempotency_key])
    create index(:discovery_intents, [:conversation_id, :status])
    create index(:discovery_intents, [:plan_id])

    create table(:discovery_requests, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :intent_id, references(:discovery_intents, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :requested_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :plan_id, :binary_id
      add :request_type, :string, null: false, default: "restaurant"
      add :agreed_time_window, :string
      add :geographic_envelope, :map, null: false, default: %{}
      add :participant_count, :integer, null: false, default: 2
      add :option_limit, :integer, null: false, default: 3
      add :status, :string, null: false, default: "pending"
      add :provider_strategy, :string, null: false, default: "synthetic"
      add :hard_constraints, :map, null: false, default: %{}
      add :soft_preferences, :map, null: false, default: %{}
      add :provider_disclosure, :map, null: false, default: %{}
      add :hide_sponsored, :boolean, null: false, default: false
      add :idempotency_key, :string, null: false
      add :completed_at, :utc_datetime_usec
      add :failed_at, :utc_datetime_usec
      add :failure_reason, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:discovery_requests, [:idempotency_key])
    create index(:discovery_requests, [:conversation_id, :status])
    create index(:discovery_requests, [:intent_id])

    create table(:experience_candidates, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :request_id, references(:discovery_requests, type: :binary_id, on_delete: :delete_all),
        null: false

      add :provider_id, :string, null: false
      add :provider_candidate_id, :string, null: false
      add :experience_type, :string, null: false
      add :display_name, :string, null: false
      add :category, :string
      add :geographic_summary, :string
      add :travel_estimate, :string
      add :price_band, :string
      add :accessibility_attributes, :map, null: false, default: %{}
      add :dietary_attributes, :map, null: false, default: %{}
      add :availability_state, :string, null: false, default: "unknown"
      add :availability_checked_at, :utc_datetime_usec
      add :sponsorship_state, :string, null: false, default: "organic"
      add :sponsor_label, :string
      add :handoff_url, :string
      add :normalized_facts, :map, null: false, default: %{}
      add :hard_constraint_pass, :boolean, null: false, default: false
      add :explanation, :string
      add :rank_score, :float, null: false, default: 0.0
      add :status, :string, null: false, default: "eligible"
      add :expires_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:experience_candidates, [:request_id])
    create unique_index(:experience_candidates, [:request_id, :provider_candidate_id])

    create table(:discovery_option_sets, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :request_id, references(:discovery_requests, type: :binary_id, on_delete: :delete_all),
        null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :version, :integer, null: false, default: 1
      add :candidate_ids, {:array, :binary_id}, null: false, default: []
      add :status, :string, null: false, default: "active"
      add :selected_candidate_id, :binary_id
      add :no_match, :boolean, null: false, default: false
      add :no_match_copy, :string
      add :superseded_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create index(:discovery_option_sets, [:conversation_id, :status])
    create index(:discovery_option_sets, [:request_id])

    create table(:experience_selections, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :option_set_id,
          references(:discovery_option_sets, type: :binary_id, on_delete: :delete_all),
          null: false

      add :candidate_id,
          references(:experience_candidates, type: :binary_id, on_delete: :restrict),
          null: false

      add :selected_by_user_id, references(:users, type: :binary_id, on_delete: :restrict),
        null: false

      add :selection_state, :string, null: false, default: "proposed"
      add :required_approvals, {:array, :binary_id}, null: false, default: []
      add :approvals, :map, null: false, default: %{}
      add :selected_at, :utc_datetime_usec
      add :confirmed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:experience_selections, [:idempotency_key])
    create index(:experience_selections, [:option_set_id])

    create table(:external_handoffs, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :candidate_id,
          references(:experience_candidates, type: :binary_id, on_delete: :delete_all),
          null: false

      add :owner_user_id, references(:users, type: :binary_id, on_delete: :restrict), null: false

      add :conversation_id, references(:conversations, type: :binary_id, on_delete: :delete_all),
        null: false

      add :provider_id, :string, null: false
      add :destination_class, :string, null: false, default: "reservation_view"
      add :validated_url, :string, null: false
      add :status, :string, null: false, default: "ready"
      add :leaving_opal_copy, :string, null: false, default: "You are leaving Opal."
      add :opened_at, :utc_datetime_usec
      add :returned_at, :utc_datetime_usec
      add :completed_manually_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:external_handoffs, [:idempotency_key])
    create index(:external_handoffs, [:candidate_id])
    create index(:external_handoffs, [:conversation_id])
  end
end

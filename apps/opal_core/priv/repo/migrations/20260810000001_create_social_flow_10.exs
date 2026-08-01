defmodule OpalCore.Repo.Migrations.CreateSocialFlow10 do
  use Ecto.Migration

  def change do
    create table(:communication_identifiers, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :identifier_type, :string, null: false, default: "phone_number"
      # Privacy-preserving digest only in ordinary path; not raw E.164.
      add :lookup_digest, :string, null: false
      add :secure_ref, :string, null: false
      add :region, :string, null: false, default: "US"
      add :status, :string, null: false, default: "unverified"
      add :ownership_version, :integer, null: false, default: 1
      add :detached_at, :utc_datetime_usec
      add :quarantined_at, :utc_datetime_usec
      add :superseded_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:communication_identifiers, [:idempotency_key])
    create unique_index(:communication_identifiers, [:lookup_digest])
    create index(:communication_identifiers, [:status])

    create table(:verified_communication_identifiers, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :communication_identifier_id,
          references(:communication_identifiers, type: :binary_id, on_delete: :delete_all),
          null: false

      add :human_account_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :verification_state, :string, null: false, default: "active"
      add :verified_at, :utc_datetime_usec, null: false
      add :verification_expires_at, :utc_datetime_usec
      add :provider_reference, :string
      add :ownership_version, :integer, null: false, default: 1
      add :last_reviewed_at, :utc_datetime_usec
      add :detached_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:verified_communication_identifiers, [:idempotency_key])

    create index(:verified_communication_identifiers, [
             :human_account_id,
             :verification_state
           ])

    create index(:verified_communication_identifiers, [
             :communication_identifier_id,
             :verification_state
           ])

    create table(:verification_challenges, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :communication_identifier_id, :binary_id, null: false
      add :purpose, :string, null: false
      add :challenge_digest, :string, null: false
      add :attempt_count, :integer, null: false, default: 0
      add :max_attempts, :integer, null: false, default: 5
      add :status, :string, null: false, default: "pending"
      add :expires_at, :utc_datetime_usec, null: false
      add :used_at, :utc_datetime_usec
      add :locked_at, :utc_datetime_usec
      add :provider_reference, :string
      add :device_label, :string
      add :bound_account_id, :binary_id
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:verification_challenges, [:idempotency_key])
    create index(:verification_challenges, [:communication_identifier_id, :status])

    create table(:contact_resolution_requests, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :requester_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :identifier_lookup_digest, :string, null: false
      add :local_display_label, :string
      add :purpose, :string, null: false, default: "invite"
      add :status, :string, null: false, default: "resolved"
      add :outcome, :string, null: false
      add :matched_user_id, :binary_id
      add :policy_version, :string, null: false, default: "sf10-dev-0.1"
      add :expires_at, :utc_datetime_usec, null: false
      add :resolved_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:contact_resolution_requests, [:idempotency_key])
    create index(:contact_resolution_requests, [:requester_user_id])

    create table(:discoverability_policies, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :communication_identifier_id, :binary_id
      add :policy_state, :string, null: false, default: "invite_only"
      add :allowed_audiences, {:array, :string}, null: false, default: []
      add :version, :integer, null: false, default: 1
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:discoverability_policies, [:idempotency_key])
    create unique_index(:discoverability_policies, [:user_id])

    create table(:relationship_invitations, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :inviter_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :intended_recipient_user_id, :binary_id
      add :intended_identifier_digest, :string
      add :relationship_context_type, :string, null: false, default: "adult_1to1"
      add :purpose, :string, null: false, default: "connect"
      add :bounded_message, :string
      add :status, :string, null: false, default: "sent"
      add :policy_version, :string, null: false, default: "sf10-dev-0.1"
      add :source_device_label, :string
      add :delivered_at, :utc_datetime_usec
      add :viewed_at, :utc_datetime_usec
      add :accepted_at, :utc_datetime_usec
      add :declined_at, :utc_datetime_usec
      add :revoked_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec, null: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:relationship_invitations, [:idempotency_key])
    create index(:relationship_invitations, [:inviter_user_id, :status])
    create index(:relationship_invitations, [:intended_recipient_user_id, :status])

    create table(:relationship_establishments, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :invitation_id,
          references(:relationship_invitations, type: :binary_id, on_delete: :restrict),
          null: false

      add :relationship_context_id, :binary_id, null: false
      add :conversation_id, :binary_id, null: false
      add :participant_ids, {:array, :binary_id}, null: false, default: []
      add :status, :string, null: false, default: "active"
      add :established_at, :utc_datetime_usec, null: false
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:relationship_establishments, [:idempotency_key])
    create unique_index(:relationship_establishments, [:invitation_id])

    create table(:identifier_ownership_reviews, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :communication_identifier_id, :binary_id, null: false
      add :existing_account_id, :binary_id
      add :claimant_account_id, :binary_id
      add :reason, :string, null: false
      add :status, :string, null: false, default: "human_review_required"
      add :provider_signal, :string
      add :resolved_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:identifier_ownership_reviews, [:idempotency_key])
    create index(:identifier_ownership_reviews, [:communication_identifier_id, :status])

    create table(:account_link_requests, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :requesting_user_id, references(:users, type: :binary_id, on_delete: :delete_all),
        null: false

      add :primary_account_id, :binary_id, null: false
      add :secondary_account_id, :binary_id, null: false
      add :proof_state, :string, null: false, default: "reauth_confirmed"
      add :review_state, :string, null: false, default: "preview"
      add :status, :string, null: false, default: "preview"
      add :preview, :map, null: false, default: %{}
      add :completed_at, :utc_datetime_usec
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:account_link_requests, [:idempotency_key])
    create index(:account_link_requests, [:requesting_user_id, :status])
  end
end

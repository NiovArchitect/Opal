defmodule OpalCore.Repo.Migrations.CreateReservationExecutions do
  use Ecto.Migration

  def change do
    create table(:reservation_executions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reality_id, :binary_id
      add :actor_user_id, :binary_id, null: false
      add :provider, :string, null: false, default: "synthetic_reservation"
      add :provider_place_id, :string, null: false
      add :provider_resource_id, :string
      add :place_display_name, :string
      add :authorization_id, :binary_id
      add :idempotency_key, :string, null: false
      add :status, :string, null: false, default: "checking"
      add :party_size, :integer, null: false, default: 2
      add :slot_id, :string
      add :slot_label, :string
      add :slot_starts_at, :utc_datetime_usec
      add :availability_id, :string
      add :availability_expires_at, :utc_datetime_usec
      add :requested_at, :utc_datetime_usec
      add :confirmed_at, :utc_datetime_usec
      add :cancelled_at, :utc_datetime_usec
      add :expires_at, :utc_datetime_usec
      add :provider_request_id, :string
      add :provider_response_id, :string
      add :failure_reason, :string
      add :payment_status, :string, null: false, default: "not_required"
      add :source_moment_id, :binary_id
      add :lineage, :map, null: false, default: %{}
      add :authorization, :map, null: false, default: %{}
      add :shared_safe_summary, :string
      add :mode, :string, null: false, default: "synthetic_provider"
      add :live_claimed, :boolean, null: false, default: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:reservation_executions, [:idempotency_key])
    create index(:reservation_executions, [:reality_id])
    create index(:reservation_executions, [:actor_user_id, :status])
    create index(:reservation_executions, [:provider_request_id])
  end
end

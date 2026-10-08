defmodule OpalCore.Repo.Migrations.CreateBookings do
  use Ecto.Migration

  def change do
    create table(:bookings, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :booking_type, :string, null: false
      add :status, :string, null: false, default: "draft"
      add :details, :map, null: false, default: %{}
      add :constraints, :map, null: false, default: %{}
      add :provider, :string
      add :provider_ref, :string
      add :confirmation_number, :string
      add :conversation_id, :binary_id
      add :plan_id, :binary_id
      add :amount_cents, :integer
      add :currency, :string, default: "USD"
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:bookings, [:account_id, :status])
    create index(:bookings, [:account_id, :inserted_at])
    create index(:bookings, [:provider, :provider_ref])
  end
end

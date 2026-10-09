defmodule OpalCore.Repo.Migrations.PasteKLivesVenuesStickersPay do
  use Ecto.Migration

  def change do
    # Paste K — venues (Places allowlist), live rooms (placed-only), stickers, Opal Pay.

    create table(:venues, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :place_id, :string, null: false
      add :name, :string, null: false
      add :formatted_address, :string
      add :types, {:array, :string}, null: false, default: []
      add :residential, :boolean, null: false, default: false
      # quarantine | full | frozen | merged
      add :status, :string, null: false, default: "quarantine"
      add :quarantine_until, :utc_datetime_usec
      add :first_live_at, :utc_datetime_usec
      add :claimed_at, :utc_datetime_usec
      add :claimed_account_id, :binary_id
      add :escrow_balance_cents, :integer, null: false, default: 0
      add :balance_cents, :integer, null: false, default: 0
      # Signed, unguessable QR token (not sequential)
      add :pay_token, :string, null: false
      add :canonical_venue_id, :binary_id
      add :heat_frozen, :boolean, null: false, default: false
      add :fraud_flags, :integer, null: false, default: 0
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:venues, [:place_id], name: :venues_place_id_index)
    create unique_index(:venues, [:pay_token], name: :venues_pay_token_index)
    create index(:venues, [:status])
    create index(:venues, [:canonical_venue_id])

    create table(:live_rooms, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :host_account_id, :binary_id, null: false
      add :venue_id, references(:venues, type: :binary_id, on_delete: :restrict), null: false
      # live | ended | flagged
      add :status, :string, null: false, default: "live"
      add :heat_contribution_frozen, :boolean, null: false, default: false
      add :presence_report_count, :integer, null: false, default: 0
      add :started_at, :utc_datetime_usec, null: false
      add :ended_at, :utc_datetime_usec
      add :title, :string
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create index(:live_rooms, [:host_account_id, :started_at],
             name: :live_rooms_host_started_index
           )

    create index(:live_rooms, [:venue_id, :started_at], name: :live_rooms_venue_started_index)
    create index(:live_rooms, [:status])

    create table(:live_presence_reports, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :live_room_id,
          references(:live_rooms, type: :binary_id, on_delete: :delete_all),
          null: false
      add :reporter_account_id, :binary_id, null: false
      add :kind, :string, null: false, default: "host_isnt_here"

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:live_presence_reports, [:live_room_id, :reporter_account_id],
             name: :live_presence_reports_unique_reporter
           )

    create table(:live_stickers, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :live_room_id,
          references(:live_rooms, type: :binary_id, on_delete: :delete_all),
          null: false
      add :venue_id, references(:venues, type: :binary_id, on_delete: :restrict), null: false
      add :sender_account_id, :binary_id, null: false
      add :host_account_id, :binary_id, null: false
      add :sticker_key, :string, null: false
      add :amount_cents, :integer, null: false
      add :host_share_cents, :integer, null: false
      add :venue_share_cents, :integer, null: false
      add :spend_tx_id, :binary_id
      add :host_credit_tx_id, :binary_id
      add :test_mode, :boolean, null: false, default: true
      add :idempotency_key, :string, null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:live_stickers, [:idempotency_key],
             name: :live_stickers_idempotency_key_index
           )

    create index(:live_stickers, [:live_room_id, :inserted_at])
    create index(:live_stickers, [:sender_account_id, :inserted_at])
    create index(:live_stickers, [:venue_id])

    create table(:venue_payments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :venue_id, references(:venues, type: :binary_id, on_delete: :restrict), null: false
      add :payer_account_id, :binary_id, null: false
      add :amount_cents, :integer, null: false
      add :spend_tx_id, :binary_id
      add :test_mode, :boolean, null: false, default: true
      add :status, :string, null: false, default: "completed"
      add :idempotency_key, :string, null: false
      add :frozen, :boolean, null: false, default: false
      add :metadata, :map, null: false, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:venue_payments, [:idempotency_key],
             name: :venue_payments_idempotency_key_index
           )

    create index(:venue_payments, [:venue_id, :payer_account_id, :inserted_at],
             name: :venue_payments_venue_payer_day_index
           )

    create table(:venue_presence_scans, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :venue_id, references(:venues, type: :binary_id, on_delete: :delete_all), null: false
      add :live_room_id, :binary_id
      add :scanner_account_id, :binary_id, null: false
      add :verified, :boolean, null: false, default: true

      timestamps(type: :utc_datetime_usec)
    end

    create index(:venue_presence_scans, [:venue_id, :inserted_at])

    create table(:venue_contributions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :venue_id, references(:venues, type: :binary_id, on_delete: :delete_all), null: false
      add :account_id, :binary_id, null: false
      add :live_attend_count, :integer, null: false, default: 0
      add :sticker_count, :integer, null: false, default: 0
      add :opt_in_public, :boolean, null: false, default: false
      add :display_name, :string
      add :last_attended_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:venue_contributions, [:venue_id, :account_id],
             name: :venue_contributions_venue_account_index
           )

    create table(:venue_streaks, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :account_id, :binary_id, null: false
      add :venue_id, references(:venues, type: :binary_id, on_delete: :delete_all), null: false
      add :weekday, :integer, null: false
      add :count, :integer, null: false, default: 0
      add :label, :string
      add :last_at, :utc_datetime_usec

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:venue_streaks, [:account_id, :venue_id, :weekday],
             name: :venue_streaks_account_venue_weekday_index
           )

    create table(:venue_rewards, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :venue_id, references(:venues, type: :binary_id, on_delete: :restrict), null: false
      add :contributor_account_id, :binary_id, null: false
      add :amount_cents, :integer, null: false
      add :credit_tx_id, :binary_id
      add :test_mode, :boolean, null: false, default: true
      add :idempotency_key, :string, null: false
      add :note, :string

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:venue_rewards, [:idempotency_key],
             name: :venue_rewards_idempotency_key_index
           )

    alter table(:safety_reports) do
      add :subject_venue_id, :binary_id
      add :subject_live_room_id, :binary_id
    end

    create index(:safety_reports, [:subject_venue_id])
    create index(:safety_reports, [:subject_live_room_id])
  end
end

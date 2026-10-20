defmodule OpalCore.Repo.Migrations.AddBiometricEnabledToGraphLocks do
  use Ecto.Migration

  # Repair #20 F-4 - additive only.
  # graph_locks.biometric_enabled: the account's stated preference
  # that the Private graphs gate may offer the platform authenticator
  # (WebAuthn) unlock on devices where the user registered one in
  # Settings. It stores NO credential material: WebAuthn credentials
  # are device-local (the gate's threat model is unchanged - see
  # GraphLock's moduledoc), and the PIN remains the server-verified
  # fallback. Default false: existing locks are untouched in behavior.
  def change do
    alter table(:graph_locks) do
      add :biometric_enabled, :boolean, null: false, default: false
    end
  end
end

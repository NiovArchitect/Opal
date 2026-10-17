defmodule OpalCore.Repo.Migrations.AddProactiveThreadsEnabledToUsers do
  @moduledoc """
  Repair #16 (W4, P1) — additive opt-in for proactive thread initiation.

  No existing consent setting covers Opal STARTING a conversation:
  the act-on-behalf capabilities are calls_outbound / bookings_reserve /
  messaging_business (acting on businesses/providers), and
  `proactive_opt_out` is an opt-OUT layered on top of initiation law,
  not an opt-in. So proactive initiation gets its own setting,
  defaulting to FALSE — no behavior change for any existing account
  until the user explicitly enables it.
  """
  use Ecto.Migration

  def up do
    alter table(:users) do
      add_if_not_exists :proactive_threads_enabled, :boolean, default: false, null: false
    end
  end

  def down do
    alter table(:users) do
      remove_if_exists :proactive_threads_enabled, :boolean
    end
  end
end

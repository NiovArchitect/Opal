defmodule OpalCore.Repo.Migrations.AllowNullConversationOnCalendarCommitments do
  use Ecto.Migration

  @moduledoc """
  Repair #12 (F12-05d): Center-created plans are conversation-less
  (SharedPlan.conversation_id is nil), but opal_calendar_commitments required
  a conversation_id — so projecting a Center plan to the native Opal calendar
  failed validation and the plan never reached the calendar.

  Non-destructive: drops the NOT NULL (the FK to conversations stays).
  A nil conversation_id means "owner-private Center plan".
  """

  def up do
    execute "ALTER TABLE opal_calendar_commitments ALTER COLUMN conversation_id DROP NOT NULL"
  end

  def down do
    execute "ALTER TABLE opal_calendar_commitments ALTER COLUMN conversation_id SET NOT NULL"
  end
end
